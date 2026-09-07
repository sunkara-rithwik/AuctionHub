-- ============================================================
-- Auction Hub — PostgreSQL Schema
-- Run: psql -d your_database -f schema.sql
-- ============================================================

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
    room_id     VARCHAR(6)      PRIMARY KEY,
    host_name   VARCHAR(50)     NOT NULL,
    is_private  BOOLEAN         DEFAULT false,
    initial_budget NUMERIC(10,2) DEFAULT 100.00,
    status      VARCHAR(20)     DEFAULT 'waiting',  -- waiting | active | finished
    created_at  TIMESTAMP       DEFAULT NOW()
);

-- Teams (participants)
CREATE TABLE IF NOT EXISTS teams (
    team_id          SERIAL          PRIMARY KEY,
    room_id          VARCHAR(6)      REFERENCES rooms(room_id) ON DELETE CASCADE,
    team_name        VARCHAR(50)     NOT NULL,
    socket_id        VARCHAR(100),
    remaining_budget NUMERIC(10,2),
    is_host          BOOLEAN         DEFAULT false,
    joined_at        TIMESTAMP       DEFAULT NOW()
);

-- IPL Players Pool
CREATE TABLE IF NOT EXISTS ipl_players (
    player_id   SERIAL          PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL,
    role        VARCHAR(30),    -- Batsman | Bowler | All-Rounder | Wicketkeeper
    ipl_team    VARCHAR(50),    -- Real IPL team (display only)
    nationality VARCHAR(30)     DEFAULT 'Indian',
    base_price  NUMERIC(10,2)   DEFAULT 0.50,
    stats       JSONB
);

-- Auction Results
CREATE TABLE IF NOT EXISTS auction_results (
    id              SERIAL          PRIMARY KEY,
    room_id         VARCHAR(6)      REFERENCES rooms(room_id) ON DELETE CASCADE,
    player_id       INT             REFERENCES ipl_players(player_id),
    sold_to_team_id INT             REFERENCES teams(team_id),
    winning_bid     NUMERIC(10,2),
    sold_at         TIMESTAMP       DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_room    ON teams(room_id);
CREATE INDEX IF NOT EXISTS idx_results_room  ON auction_results(room_id);
