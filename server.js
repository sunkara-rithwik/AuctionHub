/**
 * server.js — Auction Hub
 * Node.js + Express + Socket.io backend
 */
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');
const { db }     = require('./db');
const { players: seedPlayers } = require('./seed');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
const PORT   = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── In-Memory Auction State ──────────────────────────────────────────────────
// roomId → { players[], currentIndex, currentPlayer, currentBid, highestBidderId,
//            highestBidderName, timerInterval, timeLeft, isPaused, soldList[] }
const auctionStates = new Map();

// roomId → teamId (host tracking)
const hostMap = new Map();

// ─── Utility ──────────────────────────────────────────────────────────────────
function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function getRoomTeams(roomId) {
  const { rows } = await db.query('SELECT * FROM teams WHERE room_id = $1 ORDER BY joined_at ASC', [roomId]);
  return rows;
}

async function emitRoomUpdate(roomId) {
  const teams = await getRoomTeams(roomId);
  io.to(roomId).emit('room_update', { teams });
}

// ─── REST API ─────────────────────────────────────────────────────────────────

// Create Room
app.post('/api/rooms', async (req, res) => {
  try {
    const { hostName, isPrivate, initialBudget } = req.body;
    if (!hostName || hostName.trim().length < 2)
      return res.status(400).json({ error: 'Host name must be at least 2 characters' });

    let roomId;
    let attempts = 0;
    do {
      roomId = generateRoomId();
      const { rows } = await db.query('SELECT room_id FROM rooms WHERE room_id = $1', [roomId]);
      if (rows.length === 0) break;
      attempts++;
    } while (attempts < 10);

    const budget = Math.max(50, Math.min(200, Number(initialBudget) || 100));

    await db.query(
      `INSERT INTO rooms (room_id, host_name, is_private, initial_budget, status)
       VALUES ($1, $2, $3, $4, 'waiting')`,
      [roomId, hostName.trim(), !!isPrivate, budget]
    );

    // Create the host as first team
    const { rows: teamRows } = await db.query(
      `INSERT INTO teams (room_id, team_name, socket_id, remaining_budget, is_host)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [roomId, hostName.trim(), null, budget, true]
    );
    const team = teamRows[0];
    hostMap.set(roomId, team.team_id);

    res.json({ roomId, teamId: team.team_id, initialBudget: budget });
  } catch (e) {
    console.error('Create room error:', e);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Join Room
app.post('/api/rooms/:id/join', async (req, res) => {
  try {
    const roomId = req.params.id.toUpperCase();
    const { teamName } = req.body;
    if (!teamName || teamName.trim().length < 2)
      return res.status(400).json({ error: 'Team name must be at least 2 characters' });

    const { rows: roomRows } = await db.query('SELECT * FROM rooms WHERE room_id = $1', [roomId]);
    if (roomRows.length === 0) return res.status(404).json({ error: 'Room not found' });
    const room = roomRows[0];
    if (room.status !== 'waiting') return res.status(400).json({ error: 'Auction already started' });

    const teams = await getRoomTeams(roomId);
    if (teams.length >= 10) return res.status(400).json({ error: 'Room is full (max 10 teams)' });

    // Check duplicate name
    if (teams.some(t => t.team_name.toLowerCase() === teamName.trim().toLowerCase()))
      return res.status(400).json({ error: 'Team name already taken in this room' });

    const { rows: teamRows } = await db.query(
      `INSERT INTO teams (room_id, team_name, socket_id, remaining_budget, is_host)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [roomId, teamName.trim(), null, room.initial_budget, false]
    );
    const team = teamRows[0];

    res.json({ roomId, teamId: team.team_id, initialBudget: room.initial_budget, hostName: room.host_name });
  } catch (e) {
    console.error('Join room error:', e);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Get Public Rooms
app.get('/api/rooms/public', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, COUNT(t.team_id) as team_count
       FROM rooms r
       LEFT JOIN teams t ON r.room_id = t.room_id
       WHERE r.is_private = false AND r.status != 'finished'
       GROUP BY r.room_id
       ORDER BY r.created_at DESC LIMIT 20`
    );
    res.json({ rooms: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch rooms', rooms: [] });
  }
});

// Get Room State
app.get('/api/rooms/:id', async (req, res) => {
  try {
    const roomId = req.params.id.toUpperCase();
    const { rows: roomRows } = await db.query('SELECT * FROM rooms WHERE room_id = $1', [roomId]);
    if (roomRows.length === 0) return res.status(404).json({ error: 'Room not found' });
    const teams = await getRoomTeams(roomId);
    res.json({ room: roomRows[0], teams });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// ─── Auction Timer Logic ──────────────────────────────────────────────────────
const AUCTION_TIMER_SECS = 15;

function startTimer(roomId) {
  const state = auctionStates.get(roomId);
  if (!state) return;

  clearInterval(state.timerInterval);
  state.timeLeft = AUCTION_TIMER_SECS;

  state.timerInterval = setInterval(async () => {
    if (state.isPaused) return;
    state.timeLeft--;
    io.to(roomId).emit('timer_tick', { timeLeft: state.timeLeft });

    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      // Auto-sell or unsold
      if (state.highestBidderId) {
        await sellCurrentPlayer(roomId);
      } else {
        await markUnsold(roomId);
      }
    }
  }, 1000);
}

function resetTimer(roomId) {
  const state = auctionStates.get(roomId);
  if (!state) return;
  clearInterval(state.timerInterval);
  startTimer(roomId);
}

async function sellCurrentPlayer(roomId) {
  const state = auctionStates.get(roomId);
  if (!state || !state.currentPlayer) return;

  clearInterval(state.timerInterval);

  const player   = state.currentPlayer;
  const teamId   = state.highestBidderId;
  const bid      = state.currentBid;

  // Deduct budget from winning team
  await db.query('UPDATE teams SET remaining_budget = remaining_budget - $1 WHERE team_id = $2', [bid, teamId]);

  // Record result
  await db.query(
    `INSERT INTO auction_results (room_id, player_id, sold_to_team_id, winning_bid)
     VALUES ($1, $2, $3, $4)`,
    [roomId, player.player_id, teamId, bid]
  );

  // Track in state
  state.soldList.push({ player, teamId, teamName: state.highestBidderName, bid });

  io.to(roomId).emit('player_sold', {
    player,
    teamId,
    teamName:   state.highestBidderName,
    bid,
    soldList:   state.soldList,
  });

  // Refresh team budgets
  await emitRoomUpdate(roomId);

  // Auto-advance after 3 seconds
  setTimeout(() => advanceToNextPlayer(roomId), 3000);
}

async function markUnsold(roomId) {
  const state = auctionStates.get(roomId);
  if (!state) return;
  clearInterval(state.timerInterval);

  const player = state.currentPlayer;
  state.soldList.push({ player, teamId: null, teamName: 'UNSOLD', bid: 0 });

  io.to(roomId).emit('player_unsold', { player, soldList: state.soldList });
  setTimeout(() => advanceToNextPlayer(roomId), 2500);
}

async function advanceToNextPlayer(roomId) {
  const state = auctionStates.get(roomId);
  if (!state) return;

  state.currentIndex++;

  if (state.currentIndex >= state.players.length) {
    // Auction over
    clearInterval(state.timerInterval);
    await db.query(`UPDATE rooms SET status = 'finished' WHERE room_id = $1`, [roomId]);
    const teams = await getRoomTeams(roomId);
    io.to(roomId).emit('auction_ended', { teams, soldList: state.soldList });
    auctionStates.delete(roomId);
    return;
  }

  state.currentPlayer    = state.players[state.currentIndex];
  state.currentBid       = Number(state.currentPlayer.base_price);
  state.highestBidderId  = null;
  state.highestBidderName = null;

  io.to(roomId).emit('player_changed', {
    player:       state.currentPlayer,
    currentBid:   state.currentBid,
    playerIndex:  state.currentIndex,
    totalPlayers: state.players.length,
  });

  startTimer(roomId);
}

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ── join_room ────────────────────────────────────────────────────────────
  socket.on('join_room', async ({ roomId, teamId }) => {
    roomId = roomId.toUpperCase();
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.teamId = Number(teamId);

    // Update socket_id in DB
    await db.query('UPDATE teams SET socket_id = $1 WHERE team_id = $2', [socket.id, teamId]);
    await emitRoomUpdate(roomId);

    // If auction already running, send current state
    const state = auctionStates.get(roomId);
    if (state) {
      // If host reconnects and auction was paused due to disconnect, auto-resume
      const hostTeamId = hostMap.get(roomId);
      if (Number(teamId) === hostTeamId && state.isPaused) {
        state.isPaused = false;
        io.to(roomId).emit('auction_paused', { isPaused: false });
        io.to(roomId).emit('host_reconnected', { message: 'Host reconnected. Auction resumed!' });
      }

      socket.emit('auction_state_sync', {
        player:       state.currentPlayer,
        currentBid:   state.currentBid,
        highestBidderName: state.highestBidderName,
        timeLeft:     state.timeLeft,
        playerIndex:  state.currentIndex,
        totalPlayers: state.players.length,
        soldList:     state.soldList,
        isPaused:     state.isPaused,
      });
    }
  });

  // ── kick_player ──────────────────────────────────────────────────────────
  socket.on('kick_player', async ({ roomId, targetTeamId }) => {
    roomId = roomId.toUpperCase();
    const hostTeamId = hostMap.get(roomId);
    if (socket.data.teamId !== hostTeamId) return;

    const { rows } = await db.query('SELECT * FROM teams WHERE team_id = $1', [targetTeamId]);
    if (rows.length === 0) return;
    const target = rows[0];

    // Disconnect their socket
    const targetSocket = [...io.sockets.sockets.values()].find(s => s.id === target.socket_id);
    if (targetSocket) targetSocket.emit('player_kicked', { message: 'You have been removed by the host.' });

    await db.query('DELETE FROM teams WHERE team_id = $1', [targetTeamId]);
    await emitRoomUpdate(roomId);
  });

  // ── start_auction ────────────────────────────────────────────────────────
  socket.on('start_auction', async ({ roomId }) => {
    roomId = roomId.toUpperCase();
    const hostTeamId = hostMap.get(roomId);
    if (socket.data.teamId !== hostTeamId) return;

    const teams = await getRoomTeams(roomId);
    if (teams.length < 3) {
      socket.emit('error_msg', { message: 'Need at least 3 teams to start.' });
      return;
    }

    // Mark room active
    await db.query(`UPDATE rooms SET status = 'active' WHERE room_id = $1`, [roomId]);

    // Role order for auction sequence
    const ROLE_ORDER = ['Batsman', 'All-Rounder', 'Wicketkeeper', 'Pacer', 'Spinner'];

    function orderPlayersByRole(players) {
      const groups = {};
      ROLE_ORDER.forEach(r => { groups[r] = []; });
      const others = [];
      for (const p of players) {
        if (groups[p.role] !== undefined) groups[p.role].push(p);
        else others.push(p);
      }
      // Shuffle within each group for variety, then concatenate in role order
      return [...ROLE_ORDER.flatMap(r => shuffleArray(groups[r])), ...shuffleArray(others)];
    }

    // Build player list
    let rawList;
    if (db.players) {
      rawList = db.players;
    } else {
      const { rows } = await db.query('SELECT * FROM ipl_players');
      rawList = rows;
    }

    if (rawList.length === 0) {
      rawList = seedPlayers.map((p, i) => ({ player_id: i + 1, ...p }));
    }

    const playerList = orderPlayersByRole(rawList);

    auctionStates.set(roomId, {
      players:           playerList,
      currentIndex:      0,
      currentPlayer:     playerList[0],
      currentBid:        Number(playerList[0].base_price),
      highestBidderId:   null,
      highestBidderName: null,
      timerInterval:     null,
      timeLeft:          AUCTION_TIMER_SECS,
      isPaused:          false,
      soldList:          [],
    });

    io.to(roomId).emit('auction_started', {
      player:       playerList[0],
      currentBid:   Number(playerList[0].base_price),
      playerIndex:  0,
      totalPlayers: playerList.length,
    });

    startTimer(roomId);
  });

  // ── place_bid ────────────────────────────────────────────────────────────
  socket.on('place_bid', async ({ roomId, teamId, bidAmount }) => {
    roomId = roomId.toUpperCase();
    const state = auctionStates.get(roomId);
    if (!state || state.isPaused) return;

    const amount = Number(bidAmount);
    if (isNaN(amount) || amount <= state.currentBid) {
      socket.emit('bid_rejected', { message: `Bid must be greater than ₹${state.currentBid.toFixed(2)} Cr` });
      return;
    }

    // Check budget
    const { rows } = await db.query('SELECT * FROM teams WHERE team_id = $1', [teamId]);
    if (rows.length === 0) return;
    const team = rows[0];

    if (amount > Number(team.remaining_budget)) {
      socket.emit('bid_rejected', { message: 'Insufficient budget!' });
      return;
    }

    // Accept bid
    state.currentBid        = amount;
    state.highestBidderId   = Number(teamId);
    state.highestBidderName = team.team_name;

    io.to(roomId).emit('bid_updated', {
      currentBid:         amount,
      highestBidderName:  team.team_name,
      highestBidderId:    Number(teamId),
    });

    // Reset timer on new bid
    resetTimer(roomId);
  });

  // ── next_player (host) ───────────────────────────────────────────────────
  socket.on('next_player', async ({ roomId }) => {
    roomId = roomId.toUpperCase();
    const hostTeamId = hostMap.get(roomId);
    if (socket.data.teamId !== hostTeamId) return;
    const state = auctionStates.get(roomId);
    if (!state) return;
    clearInterval(state.timerInterval);
    if (state.highestBidderId) {
      await sellCurrentPlayer(roomId);
    } else {
      await markUnsold(roomId);
    }
  });

  // ── mark_unsold (host) ───────────────────────────────────────────────────
  socket.on('mark_unsold', async ({ roomId }) => {
    roomId = roomId.toUpperCase();
    const hostTeamId = hostMap.get(roomId);
    if (socket.data.teamId !== hostTeamId) return;
    await markUnsold(roomId);
  });

  // ── toggle_pause (host) ──────────────────────────────────────────────────
  socket.on('toggle_pause', ({ roomId }) => {
    roomId = roomId.toUpperCase();
    const hostTeamId = hostMap.get(roomId);
    if (socket.data.teamId !== hostTeamId) return;
    const state = auctionStates.get(roomId);
    if (!state) return;
    state.isPaused = !state.isPaused;
    io.to(roomId).emit('auction_paused', { isPaused: state.isPaused });
  });

  // ── reset_timer (host) ───────────────────────────────────────────────────
  socket.on('reset_timer', ({ roomId }) => {
    roomId = roomId.toUpperCase();
    const hostTeamId = hostMap.get(roomId);
    if (socket.data.teamId !== hostTeamId) return;
    resetTimer(roomId);
    io.to(roomId).emit('timer_reset', { timeLeft: 30 });
  });

  // ── send_message (chat) ──────────────────────────────────────────────────
  socket.on('send_message', ({ roomId, teamName, message }) => {
    if (!message || message.trim().length === 0) return;
    const timestamp = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    io.to(roomId.toUpperCase()).emit('receive_message', {
      teamName,
      message: message.trim().substring(0, 200),
      timestamp,
    });
  });

  // ── disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    const { roomId, teamId } = socket.data;
    if (!roomId || !teamId) return;

    // Null out socket_id
    await db.query('UPDATE teams SET socket_id = NULL WHERE team_id = $1', [teamId]);

    // If host disconnected, pause auction
    const hostTeamId = hostMap.get(roomId);
    if (teamId === hostTeamId) {
      const state = auctionStates.get(roomId);
      if (state) {
        state.isPaused = true;
        io.to(roomId).emit('host_disconnected', { message: 'Host disconnected. Auction paused.' });
      }
    }
    await emitRoomUpdate(roomId);
  });
});

// ─── Seed in-memory store on startup ─────────────────────────────────────────
if (db.players !== undefined) {
  db.players = seedPlayers.map((p, i) => ({ player_id: i + 1, ...p }));
}

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 Auction Hub running at http://localhost:${PORT}`);
});
