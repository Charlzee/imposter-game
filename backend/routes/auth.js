import bcrypt from 'bcryptjs';
import { sign } from 'hono/jwt';

// Authentication and profile-related API routes.
export function registerAuthRoutes(app) {
    app.post('/register', async (c) => {
        try {
            const { username, password } = await c.req.json();

            if (!username || !password) {
                return c.json({ error: 'Username and password required' }, 400);
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await c.env.D1.prepare(
                'INSERT INTO users (username, password_hash) VALUES (?, ?)'
            ).bind(username, hashedPassword).run();

            return c.json({ message: 'User registered!' }, 201);
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return c.json({ error: 'Username already taken' }, 409);
            }
            return c.json({ error: 'Database error', details: err.message }, 500);
        }
    });

    app.post('/login', async (c) => {
        const { username, password } = await c.req.json();

        const user = await c.env.D1.prepare(
            'SELECT * FROM users WHERE username = ?'
        ).bind(username).first();

        if (!user) {
            return c.json({ error: 'Invalid username or password' }, 401);
        }

        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return c.json({ error: 'Invalid username or password' }, 401);
        }

        const payload = {
            username: user.username,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
        };

        const token = await sign(payload, c.env.JWT_SECRET, 'HS256');

        return c.json({
            message: 'Login successful!',
            token
        });
    });

    app.get('/auth/me', (c) => {
        const payload = c.get('jwtPayload');
        return c.json({ message: 'Token is valid!', user: payload.username });
    });

    app.post('/auth/update-stats', async (c) => {
        const payload = c.get('jwtPayload');
        const username = payload.username;

        const body = await c.req.json().catch(() => ({}));
        const localPlays = body.local_plays || 0;
        const xp = body.xp || 0;

        try {
            const user = await c.env.D1.prepare('SELECT game_data FROM users WHERE username = ?')
                .bind(username)
                .first();

            if (!user) {
                console.error(`User ${username} not found in DB`);
                return c.json({ error: 'User not found' }, 404);
            }

            let currentData = {};
            try {
                currentData = JSON.parse(user.game_data || '{}');
                if (Array.isArray(currentData)) {
                    currentData = {};
                }
            } catch (parseError) {
                console.error('JSON Parse Error, resetting data:', parseError);
                currentData = {};
            }

            currentData.local_plays = (currentData.local_plays || 0) + localPlays;
            currentData.xp = (currentData.xp || 0) + xp;

            await c.env.D1.prepare('UPDATE users SET game_data = ? WHERE username = ?')
                .bind(JSON.stringify(currentData), username)
                .run();

            return c.json({ success: true, data: currentData });
        } catch (err) {
            console.error('Stats update error:', err.message);
            return c.json({ error: 'Failed to update stats', details: err.message }, 500);
        }
    });
}
