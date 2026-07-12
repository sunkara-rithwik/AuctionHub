require('dotenv').config();
const { Pool } = require('pg');

// ─── In-Memory Fallback Store ─────────────────────────────────────────────────
// Used when DATABASE_URL is not configured. Mimics the pg Pool interface.
class MemoryStore {
  constructor() {
    this.rooms   = new Map(); // room_id → room object
    this.teams   = new Map(); // team_id → team object
    this.players = [];        // ipl_players array (seeded at startup)
    this.results = [];        // auction_results array
    this._nextTeamId   = 1;
    this._nextResultId = 1;
  }

  async query(sql, params = []) {
    const s = sql.trim().toLowerCase();

    // ── INSERT room ──────────────────────────────────────────────────────────
    if (s.startsWith('insert into rooms')) {
      const [room_id, host_name, is_private, initial_budget] = params;
      const room = { room_id, host_name, is_private, initial_budget, status: 'waiting', created_at: new Date() };
      this.rooms.set(room_id, room);
      return { rows: [room] };
    }

    // ── SELECT room ──────────────────────────────────────────────────────────
    if (s.includes('from rooms') && s.includes('where room_id')) {
      const room = this.rooms.get(params[0]);
      return { rows: room ? [room] : [] };
    }

    // ── SELECT public rooms ──────────────────────────────────────────────────
    if (s.includes('from rooms') && s.includes('is_private = false')) {
      const rows = [...this.rooms.values()].filter(r => !r.is_private && r.status !== 'finished');
      return { rows };
    }

    // ── UPDATE room status ───────────────────────────────────────────────────
    if (s.startsWith('update rooms')) {
      const room = this.rooms.get(params[1] ?? params[params.length - 1]);
      if (room) room.status = params[0];
      return { rows: [] };
    }

    // ── INSERT team ──────────────────────────────────────────────────────────
    // Params are always: [room_id, team_name, socket_id, remaining_budget, is_host]
    if (s.startsWith('insert into teams')) {
      const [room_id, team_name, socket_id, remaining_budget, is_host] = params;
      const team_id = this._nextTeamId++;
      const team = {
        team_id,
        room_id,
        team_name,
        socket_id: socket_id ?? null,
        remaining_budget: Number(remaining_budget),
        is_host: !!is_host,
        joined_at: new Date(),
      };
      this.teams.set(team_id, team);
      return { rows: [team] };
    }

    // ── SELECT teams by room ─────────────────────────────────────────────────
    if (s.includes('from teams') && s.includes('where room_id')) {
      const rows = [...this.teams.values()].filter(t => t.room_id === params[0]);
      return { rows };
    }

    // ── SELECT team by team_id ────────────────────────────────────────────────
    if (s.includes('from teams') && s.includes('where team_id')) {
      const team = this.teams.get(Number(params[0]));
      return { rows: team ? [team] : [] };
    }

    // ── UPDATE team socket_id ─────────────────────────────────────────────────
    if (s.startsWith('update teams') && s.includes('socket_id')) {
      const team = [...this.teams.values()].find(t => t.team_id === Number(params[1]));
      if (team) team.socket_id = params[0];
      return { rows: [] };
    }

    // ── UPDATE team budget (remaining_budget = remaining_budget - $1) ──────────
    if (s.startsWith('update teams') && s.includes('remaining_budget')) {
      const team = this.teams.get(Number(params[1]));
      if (team) team.remaining_budget = Number(team.remaining_budget) - Number(params[0]);
      return { rows: [] };
    }

    // ── DELETE team ───────────────────────────────────────────────────────────
    if (s.startsWith('delete from teams')) {
      this.teams.delete(Number(params[0]));
      return { rows: [] };
    }

    // ── SELECT players ────────────────────────────────────────────────────────
    if (s.includes('from ipl_players')) {
      return { rows: this.players };
    }

    // ── INSERT auction result ─────────────────────────────────────────────────
    if (s.startsWith('insert into auction_results')) {
      const [room_id, player_id, sold_to_team_id, winning_bid] = params;
      const result = { id: this._nextResultId++, room_id, player_id, sold_to_team_id, winning_bid, sold_at: new Date() };
      this.results.push(result);
      return { rows: [result] };
    }

    // ── SELECT auction results ────────────────────────────────────────────────
    if (s.includes('from auction_results')) {
      const rows = this.results.filter(r => r.room_id === params[0]);
      return { rows };
    }

    return { rows: [] };
  }
}

// ─── DB Client ────────────────────────────────────────────────────────────────
let db;
let usingMemory = false;

if (process.env.DATABASE_URL) {
  db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  db.on('error', (err) => console.error('PG pool error:', err));
  console.log('✅ Using PostgreSQL');
} else {
  db = new MemoryStore();
  usingMemory = true;
  console.log('⚠️  DATABASE_URL not set — using in-memory store (data resets on restart)');
}

module.exports = { db, usingMemory };
