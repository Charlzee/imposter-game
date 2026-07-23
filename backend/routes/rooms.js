// Room management, voting, and chat API routes.
export function registerRoomRoutes(app) {
    app.post('/auth/rooms/create', async (c) => {
        const payload = c.get('jwtPayload');
        const { code, settings } = await c.req.json();

        try {
            await c.env.D1.prepare("DELETE FROM rooms WHERE last_activity < datetime('now', '-1 hour')").run();

            await c.env.D1.batch([
                c.env.D1.prepare('INSERT INTO rooms (code, host_username, settings) VALUES (?, ?, ?)')
                    .bind(code, payload.username, JSON.stringify(settings)),
                c.env.D1.prepare('INSERT INTO room_players (room_code, username) VALUES (?, ?)')
                    .bind(code, payload.username)
            ]);

            return c.json({ success: true });
        } catch (err) {
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                return c.json({
                    error: 'The generated code is already in use.',
                    details: 'A collision occurred with an existing room code. Retrying...'
                }, 409);
            }
            return c.json({ error: 'Failed to create room due to a server error.', details: err.message }, 500);
        }
    });

    app.post('/auth/rooms/join', async (c) => {
        const payload = c.get('jwtPayload');
        const { code } = await c.req.json();

        const room = await c.env.D1.prepare('SELECT * FROM rooms WHERE code = ?').bind(code).first();
        if (!room) return c.json({ error: 'Room not found' }, 404);

        try {
            await c.env.D1.prepare(
                'INSERT OR IGNORE INTO room_players (room_code, username) VALUES (?, ?)'
            ).bind(code, payload.username).run();

            return c.json({ success: true, host: room.host_username });
        } catch (err) {
            return c.json({ error: 'Failed to join room' }, 500);
        }
    });

    app.get('/auth/rooms/:code/players', async (c) => {
        const code = c.req.param('code');
        const payload = c.get('jwtPayload');

        await c.env.D1.prepare(`
            INSERT INTO room_players (room_code, username, last_seen) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(room_code, username) DO UPDATE SET last_seen = CURRENT_TIMESTAMP
        `).bind(code, payload.username).run();

        await c.env.D1.prepare('UPDATE rooms SET last_activity = CURRENT_TIMESTAMP WHERE code = ?')
            .bind(code).run();

        await c.env.D1.prepare("DELETE FROM room_players WHERE room_code = ? AND last_seen < datetime('now', '-10 seconds')")
            .bind(code).run();

        const players = await c.env.D1.prepare(
            'SELECT username FROM room_players WHERE room_code = ?'
        ).bind(code).all();

        return c.json(players.results);
    });

    app.patch('/auth/rooms/:code/settings', async (c) => {
        const code = c.req.param('code');
        const payload = c.get('jwtPayload');
        const { settings } = await c.req.json();

        const room = await c.env.D1.prepare('SELECT host_username, settings FROM rooms WHERE code = ?')
            .bind(code).first();

        if (!room) return c.json({ error: 'Room not found' }, 404);
        if (room.host_username !== payload.username) return c.json({ error: 'Only the host can modify settings' }, 403);

        const currentSettings = JSON.parse(room.settings || '{}');
        const updatedSettings = { ...currentSettings, ...settings };

        await c.env.D1.prepare('UPDATE rooms SET settings = ? WHERE code = ?')
            .bind(JSON.stringify(updatedSettings), code)
            .run();

        return c.json({ success: true, settings: updatedSettings });
    });

    app.post('/auth/rooms/:code/start', async (c) => {
        const code = c.req.param('code');
        const payload = c.get('jwtPayload');
        const gameSettings = await c.req.json();

        const room = await c.env.D1.prepare('SELECT host_username FROM rooms WHERE code = ?').bind(code).first();
        if (room.host_username !== payload.username) return c.json({ error: 'Only the host can start' }, 403);

        await c.env.D1.prepare(
            "UPDATE rooms SET status = 'playing', settings = ? WHERE code = ?"
        ).bind(JSON.stringify(gameSettings), code).run();

        return c.json({ success: true });
    });

    app.get('/auth/rooms/:code/status', async (c) => {
        const code = c.req.param('code');
        const room = await c.env.D1.prepare('SELECT status, settings FROM rooms WHERE code = ?').bind(code).first();
        if (!room) return c.json({ error: 'Room not found' }, 404);

        const settings = JSON.parse(room.settings || '{}');
        return c.json({ status: room.status, ...settings });
    });

    app.post('/auth/rooms/:code/vote', async (c) => {
        const code = c.req.param('code');
        const payload = c.get('jwtPayload');
        const { voted_for_username } = await c.req.json();

        if (!voted_for_username) {
            return c.json({ error: 'No player selected to vote for' }, 400);
        }

        try {
            const playerExists = await c.env.D1.prepare('SELECT 1 FROM room_players WHERE room_code = ? AND username = ?')
                .bind(code, voted_for_username).first();
            if (!playerExists) {
                return c.json({ error: 'Voted player not found in this room' }, 404);
            }

            await c.env.D1.prepare(
                'INSERT INTO room_votes (room_code, voter_username, voted_for_username) VALUES (?, ?, ?)'
            ).bind(code, payload.username, voted_for_username).run();
            return c.json({ success: true });
        } catch (err) {
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                return c.json({ error: 'You have already voted in this round.' }, 409);
            }
            return c.json({ error: 'Failed to cast vote', details: err.message }, 500);
        }
    });

    app.get('/auth/rooms/:code/votes', async (c) => {
        const code = c.req.param('code');

        const votes = await c.env.D1.prepare(
            'SELECT voted_for_username, COUNT(voter_username) as votes FROM room_votes WHERE room_code = ? GROUP BY voted_for_username ORDER BY votes DESC'
        ).bind(code).all();
        return c.json(votes.results);
    });

    app.post('/auth/rooms/:code/chat', async (c) => {
        const code = c.req.param('code');
        const payload = c.get('jwtPayload');
        const { message } = await c.req.json();

        if (!message || message.trim() === '') {
            return c.json({ error: 'Message cannot be empty' }, 400);
        }

        try {
            await c.env.D1.prepare(
                'INSERT INTO room_chats (room_code, username, message) VALUES (?, ?, ?)'
            ).bind(code, payload.username, message.trim()).run();
            return c.json({ success: true });
        } catch (err) {
            return c.json({ error: 'Failed to send message', details: err.message }, 500);
        }
    });

    app.get('/auth/rooms/:code/chat', async (c) => {
        const code = c.req.param('code');
        const lastId = c.req.query('last_id') || 0;

        const messages = await c.env.D1.prepare(
            'SELECT id, username, message, timestamp FROM room_chats WHERE room_code = ? AND id > ? ORDER BY timestamp ASC'
        ).bind(code, lastId).all();
        return c.json(messages.results);
    });
}
