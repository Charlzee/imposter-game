DROP TABLE IF EXISTS users;
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_players (
    room_code TEXT,
    username TEXT,
    PRIMARY KEY (room_code, username),
    FOREIGN KEY (room_code) REFERENCES rooms(code)
);