CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    game_data TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY,
    host_username TEXT,
    settings TEXT,
    status TEXT DEFAULT 'lobby',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_players (
    room_code TEXT,
    username TEXT,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_code, username),
    FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL,
    voter_username TEXT NOT NULL,
    voted_for_username TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (room_code, voter_username),
    FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE
);