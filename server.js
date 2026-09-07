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

const multer     = require('multer');
const XLSX       = require('xlsx');
const upload     = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
const PORT   = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Excel Parsing Helper ─────────────────────────────────────────────────────
function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel file has no sheet');
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!rawRows || rawRows.length === 0) throw new Error('Excel sheet is empty');

  const sample = rawRows[0];
  const keys = Object.keys(sample);

  let nameKey = keys.find(k => /name|player|item|title/i.test(k.trim()));
  let priceKey = keys.find(k => /base.*price|price|cost|amount|budget/i.test(k.trim()));
  let categoryKey = keys.find(k => /cat|role|set|type|group|class/i.test(k.trim()));

  if (!nameKey && keys.length >= 1) nameKey = keys[0];
  if (!priceKey && keys.length >= 2) priceKey = keys[1];
  if (!categoryKey && keys.length >= 3) categoryKey = keys[2];

  const items = [];
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const nameVal = String(r[nameKey] || '').trim();
    if (!nameVal) continue;

    const priceRaw = String(r[priceKey] || '0.50').replace(/[^0-9.]/g, '');
    const priceVal = parseFloat(priceRaw) || 0.50;
    const catVal   = String(r[categoryKey] || 'General').trim() || 'General';

    items.push({
      player_id: i + 1,
      name: nameVal,
      base_price: Math.max(0.01, priceVal),
      category: catVal,
      role: catVal,
      ipl_team: 'Custom',
      nationality: 'Neutral',
    });
  }

  if (items.length === 0) throw new Error('No valid items found in Excel sheet');
  return items;
}

// ─── Squad & Auction Constants ────────────────────────────────────────────────
const MAX_SQUAD_SIZE = 25;
const MAX_INDIANS    = 17;
const MAX_FOREIGNERS = 8;

const ROLE_SETS = [
  { label: 'Set 1 — Batsmen',        role: 'Batsman'      },
  { label: 'Set 2 — All-Rounders',   role: 'All-Rounder'  },
  { label: 'Set 3 — Wicketkeepers',  role: 'Wicketkeeper' },
  { label: 'Set 4 — Pace Bowlers',   role: 'Pacer'        },
  { label: 'Set 5 — Spinners',       role: 'Spinner'      },
];

// ─── In-Memory State ──────────────────────────────────────────────────────────
const auctionStates = new Map();
const hostMap       = new Map();

// Helper to verify if a socket belongs to the host of a room
async function verifyIsHost(socket, roomId) {
  if (!roomId) return false;
  roomId = roomId.toUpperCase();
  let hostTeamId = hostMap.get(roomId);
  if (!hostTeamId) {
    const { rows } = await db.query(
      'SELECT team_id FROM teams WHERE room_id = $1 AND is_host = true LIMIT 1',
      [roomId]
    );
    if (rows.length > 0) {
      hostTeamId = rows[0].team_id;
      hostMap.set(roomId, hostTeamId);
    }
  }
  return socket.data.teamId === hostTeamId;
}

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

// Parse Excel file route
app.post('/api/parse-excel', upload.single('excelFile'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No Excel file uploaded' });
    const items = parseExcelBuffer(req.file.buffer);
    const categories = [...new Set(items.map(i => i.category))];
    res.json({
      success: true,
      count: items.length,
      categories,
      preview: items.slice(0, 10),
      items
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to parse Excel file' });
  }
});

// Download sample Excel template
app.get('/api/sample-excel', (req, res) => {
  const sampleData = [
    { "Name": "Virat Kohli", "Base Price": "2.00", "Category": "Batsman" },
    { "Name": "Jasprit Bumrah", "Base Price": "2.00", "Category": "Bowler" },
    { "Name": "Hardik Pandya", "Base Price": "1.50", "Category": "All-Rounder" },
    { "Name": "MS Dhoni", "Base Price": "2.00", "Category": "Wicketkeeper" },
    { "Name": "MacBook Pro M3", "Base Price": "1.20", "Category": "Electronics" },
    { "Name": "Rolex Submariner", "Base Price": "0.80", "Category": "Luxury Items" },
    { "Name": "Penthouse Apartment", "Base Price": "10.00", "Category": "Real Estate" }
  ];
  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Special Auction Items");
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="special_auction_sample.xlsx"');
  res.send(buffer);
});

// Create Room
app.post('/api/rooms', upload.single('excelFile'), async (req, res) => {
  try {
    const hostName      = req.body.hostName;
    const isPrivate     = req.body.isPrivate === 'true' || req.body.isPrivate === true;
    const initialBudget = req.body.initialBudget;
    const mode          = req.body.mode || 'standard';
    let customPlayers   = null;

    if (mode === 'special') {
      if (req.file) {
        customPlayers = parseExcelBuffer(req.file.buffer);
      } else if (req.body.customPlayers) {
        try {
          customPlayers = typeof req.body.customPlayers === 'string'
            ? JSON.parse(req.body.customPlayers)
            : req.body.customPlayers;
        } catch (e) {
          return res.status(400).json({ error: 'Invalid custom players payload' });
        }
      }

      if (!customPlayers || customPlayers.length === 0) {
        return res.status(400).json({ error: 'Special Auction requires a valid Excel sheet containing items.' });
      }
    }

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

    const budget = Math.max(50, Math.min(500, Number(initialBudget) || 100));

    await db.query(
      `INSERT INTO rooms (room_id, host_name, is_private, initial_budget, mode, custom_players, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'waiting')`,
      [roomId, hostName.trim(), !!isPrivate, budget, mode, customPlayers ? JSON.stringify(customPlayers) : null]
    );

    const { rows: teamRows } = await db.query(
      `INSERT INTO teams (room_id, team_name, socket_id, remaining_budget, is_host)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [roomId, hostName.trim(), null, budget, true]
    );
    const team = teamRows[0];
    hostMap.set(roomId, team.team_id);

    res.json({
      roomId,
      teamId: team.team_id,
      initialBudget: budget,
      mode,
      itemCount: customPlayers ? customPlayers.length : null
    });
  } catch (e) {
    console.error('Create room error:', e);
    res.status(500).json({ error: 'Failed to create room: ' + e.message });
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
    res.json({ rows });
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

// ─── Auction Timer ────────────────────────────────────────────────────────────
const AUCTION_TIMER_SECS = 8;

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

// ─── Helper: emit set_preview ─────────────────────────────────────────────────
function emitSetPreview(roomId, state) {
  const set = state.sets[state.currentSetIndex];
  io.to(roomId).emit('set_preview', {
    setIndex:    state.currentSetIndex,
    setNumber:   state.currentSetIndex + 1,
    label:       set.label,
    role:        set.role,
    players:     set.players,
    totalSets:   state.sets.length,
  });
}

// ─── Sell / Unsold / Advance ──────────────────────────────────────────────────
async function sellCurrentPlayer(roomId) {
  const state = auctionStates.get(roomId);
  if (!state || !state.currentPlayer) return;

  clearInterval(state.timerInterval);

  const player = state.currentPlayer;
  const teamId = state.highestBidderId;
  const bid    = state.currentBid;

  // Deduct budget
  await db.query('UPDATE teams SET remaining_budget = remaining_budget - $1 WHERE team_id = $2', [bid, teamId]);

  // Record result
  await db.query(
    `INSERT INTO auction_results (room_id, player_id, sold_to_team_id, winning_bid)
     VALUES ($1, $2, $3, $4)`,
    [roomId, player.player_id, teamId, bid]
  );

  // Update squad tracking
  if (!state.teamSquads[teamId]) {
    state.teamSquads[teamId] = { players: [], indianCount: 0, foreignerCount: 0 };
  }
  state.teamSquads[teamId].players.push({ ...player, bid });
  if (player.nationality === 'Indian') {
    state.teamSquads[teamId].indianCount++;
  } else {
    state.teamSquads[teamId].foreignerCount++;
  }

  // Reset consecutive bid tracker
  state.lastBidderId = null;

  // Track in soldList
  state.soldList.push({ player, teamId, teamName: state.highestBidderName, bid });

  io.to(roomId).emit('player_sold', {
    player,
    teamId,
    teamName: state.highestBidderName,
    bid,
    soldList: state.soldList,
  });

  // Emit updated squad data to everyone
  io.to(roomId).emit('squad_update', { teamSquads: state.teamSquads });

  await emitRoomUpdate(roomId);
  setTimeout(() => advanceToNextPlayer(roomId), 3000);
}

async function markUnsold(roomId) {
  const state = auctionStates.get(roomId);
  if (!state) return;
  clearInterval(state.timerInterval);

  state.lastBidderId = null;
  const player = state.currentPlayer;
  state.soldList.push({ player, teamId: null, teamName: 'UNSOLD', bid: 0 });

  io.to(roomId).emit('player_unsold', { player, soldList: state.soldList });
  setTimeout(() => advanceToNextPlayer(roomId), 2500);
}

async function advanceToNextPlayer(roomId) {
  const state = auctionStates.get(roomId);
  if (!state) return;

  state.lastBidderId = null;
  state.currentPlayerInSet++;

  const currentSet = state.sets[state.currentSetIndex];

  if (state.currentPlayerInSet >= currentSet.players.length) {
    // Current set exhausted — move to next set
    state.currentSetIndex++;
    state.currentPlayerInSet = 0;

    if (state.currentSetIndex >= state.sets.length) {
      // All sets done — auction over
      clearInterval(state.timerInterval);
      await db.query(`UPDATE rooms SET status = 'finished' WHERE room_id = $1`, [roomId]);
      const teams = await getRoomTeams(roomId);
      io.to(roomId).emit('auction_ended', { teams, soldList: state.soldList });
      auctionStates.delete(roomId);
      return;
    }

    // Show preview for next set
    state.waitingForSetStart = true;
    clearInterval(state.timerInterval);
    emitSetPreview(roomId, state);
    return;
  }

  // Next player within same set
  state.globalPlayerIndex++;
  state.currentPlayer     = currentSet.players[state.currentPlayerInSet];
  state.currentBid        = Number(state.currentPlayer.base_price);
  state.highestBidderId   = null;
  state.highestBidderName = null;
  state.bidHistory        = [];

  io.to(roomId).emit('player_changed', {
    player:       state.currentPlayer,
    currentBid:   state.currentBid,
    playerIndex:  state.globalPlayerIndex,
    totalPlayers: state.totalPlayers,
    setLabel:     currentSet.label,
    playerInSet:  state.currentPlayerInSet,
    setSize:      currentSet.players.length,
  });

  startTimer(roomId);
}

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ── join_room ──────────────────────────────────────────────────────────────
  socket.on('join_room', async ({ roomId, teamId }) => {
    roomId = roomId.toUpperCase();
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.teamId = Number(teamId);

    await db.query('UPDATE teams SET socket_id = $1 WHERE team_id = $2', [socket.id, teamId]);
    await emitRoomUpdate(roomId);

    // Restore hostMap from DB if lost after server restart
    if (!hostMap.has(roomId)) {
      const { rows: hostRows } = await db.query(
        'SELECT team_id FROM teams WHERE room_id = $1 AND is_host = true LIMIT 1',
        [roomId]
      );
      if (hostRows.length > 0) hostMap.set(roomId, hostRows[0].team_id);
    }

    const state = auctionStates.get(roomId);
    if (state) {
      // Auto-resume if host reconnects to a paused auction
      const hostTeamId = hostMap.get(roomId);
      if (Number(teamId) === hostTeamId && state.isPaused) {
        state.isPaused = false;
        io.to(roomId).emit('auction_paused', { isPaused: false });
        io.to(roomId).emit('host_reconnected', { message: 'Host reconnected. Auction resumed!' });
      }

      if (state.waitingForSetStart) {
        // Send set preview to reconnecting user
        emitSetPreview(roomId, state);
        // Also send squad data
        socket.emit('squad_update', { teamSquads: state.teamSquads });
        socket.emit('auction_state_sync', {
          player:            null,
          currentBid:        0,
          highestBidderName: null,
          timeLeft:          AUCTION_TIMER_SECS,
          playerIndex:       state.globalPlayerIndex,
          totalPlayers:      state.totalPlayers,
          soldList:          state.soldList,
          isPaused:          state.isPaused,
          teamSquads:        state.teamSquads,
          waitingForSetStart: true,
        });
      } else {
        socket.emit('auction_state_sync', {
          player:            state.currentPlayer,
          currentBid:        state.currentBid,
          highestBidderName: state.highestBidderName,
          timeLeft:          state.timeLeft,
          playerIndex:       state.globalPlayerIndex,
          totalPlayers:      state.totalPlayers,
          soldList:          state.soldList,
          isPaused:          state.isPaused,
          teamSquads:        state.teamSquads,
          setLabel:          state.sets[state.currentSetIndex]?.label,
          playerInSet:       state.currentPlayerInSet,
          setSize:           state.sets[state.currentSetIndex]?.players.length,
          waitingForSetStart: false,
        });
      }
    }
  });

  // ── kick_player ────────────────────────────────────────────────────────────
  socket.on('kick_player', async ({ roomId, targetTeamId }) => {
    roomId = roomId.toUpperCase();
    if (!await verifyIsHost(socket, roomId)) return;

    const { rows } = await db.query('SELECT * FROM teams WHERE team_id = $1', [targetTeamId]);
    if (rows.length === 0) return;
    const target = rows[0];

    const targetSocket = [...io.sockets.sockets.values()].find(s => s.id === target.socket_id);
    if (targetSocket) targetSocket.emit('player_kicked', { message: 'You have been removed by the host.' });

    await db.query('DELETE FROM teams WHERE team_id = $1', [targetTeamId]);
    await emitRoomUpdate(roomId);
  });

  // ── start_auction ──────────────────────────────────────────────────────────
  socket.on('start_auction', async ({ roomId }) => {
    try {
      roomId = roomId.toUpperCase();
      if (!await verifyIsHost(socket, roomId)) return;

      const teams = await getRoomTeams(roomId);
      if (teams.length < 1) {
        socket.emit('error_msg', { message: 'Need at least 1 team to start.' });
        return;
      }

      await db.query(`UPDATE rooms SET status = 'active' WHERE room_id = $1`, [roomId]);

      const { rows: roomRows } = await db.query('SELECT * FROM rooms WHERE room_id = $1', [roomId]);
      const room = roomRows[0];
      const mode = room?.mode || 'standard';

      let rawList = [];
      let sets    = [];

      if (mode === 'special' && room?.custom_players) {
        rawList = typeof room.custom_players === 'string'
          ? JSON.parse(room.custom_players)
          : room.custom_players;

        const categories = [...new Set(rawList.map(p => p.category || p.role || 'General'))];
        sets = categories.map((cat, idx) => ({
          label: `Set ${idx + 1} — ${cat}`,
          role: cat,
          players: shuffleArray(rawList.filter(p => (p.category || p.role || 'General') === cat)),
        })).filter(s => s.players.length > 0);
      } else {
        if (db.players) {
          rawList = db.players;
        } else {
          const { rows } = await db.query('SELECT * FROM ipl_players');
          rawList = rows;
        }
        if (rawList.length === 0) {
          rawList = seedPlayers.map((p, i) => ({ player_id: i + 1, ...p }));
        }

        sets = ROLE_SETS
          .map(({ label, role }) => ({
            label,
            role,
            players: shuffleArray(rawList.filter(p => p.role === role)),
          }))
          .filter(s => s.players.length > 0);
      }

      const totalPlayers = sets.reduce((sum, s) => sum + s.players.length, 0);

      auctionStates.set(roomId, {
        mode,
        sets,
        currentSetIndex:   0,
        currentPlayerInSet: 0,
        waitingForSetStart: true,
        currentPlayer:     null,
        currentBid:        0,
        highestBidderId:   null,
        highestBidderName: null,
        lastBidderId:      null,
        timerInterval:     null,
        timeLeft:          AUCTION_TIMER_SECS,
        isPaused:          false,
        soldList:          [],
        teamSquads:        {},
        globalPlayerIndex: 0,
        bidHistory:        [],
        totalPlayers,
      });

      // Tell everyone auction is initialised, then show Set 1 preview
      io.to(roomId).emit('auction_started', { totalPlayers, totalSets: sets.length, mode });
      io.to(roomId).emit('auction_initialized', { totalPlayers, totalSets: sets.length, mode });
      emitSetPreview(roomId, auctionStates.get(roomId));
    } catch (e) {
      console.error('Error starting auction:', e);
      socket.emit('error_msg', { message: 'Failed to start auction: ' + e.message });
    }
  });

  // ── start_set (host only) ──────────────────────────────────────────────────
  socket.on('start_set', async ({ roomId }) => {
    roomId = roomId.toUpperCase();
    if (!await verifyIsHost(socket, roomId)) return;

    const state = auctionStates.get(roomId);
    if (!state || !state.waitingForSetStart) return;

    state.waitingForSetStart = false;
    const currentSet          = state.sets[state.currentSetIndex];
    state.currentPlayer       = currentSet.players[0];
    state.currentBid          = Number(state.currentPlayer.base_price);
    state.highestBidderId     = null;
    state.highestBidderName   = null;
    state.lastBidderId        = null;
    state.bidHistory          = [];

    io.to(roomId).emit('set_started', {
      setIndex:    state.currentSetIndex,
      setNumber:   state.currentSetIndex + 1,
      label:       currentSet.label,
      player:      state.currentPlayer,
      currentBid:  state.currentBid,
      playerIndex: state.globalPlayerIndex,
      totalPlayers: state.totalPlayers,
      playerInSet: 0,
      setSize:     currentSet.players.length,
    });

    startTimer(roomId);
  });

  // ── place_bid ──────────────────────────────────────────────────────────────
  socket.on('place_bid', async ({ roomId, teamId, bidAmount }) => {
    roomId = roomId.toUpperCase();
    const state = auctionStates.get(roomId);
    if (!state || state.isPaused || state.waitingForSetStart) return;

    const amount = Number(bidAmount);
    if (isNaN(amount) || amount <= state.currentBid) {
      socket.emit('bid_rejected', { message: `Bid must be greater than ₹${state.currentBid.toFixed(2)} Cr` });
      return;
    }

    // ── Consecutive bid prevention ──
    if (Number(teamId) === state.lastBidderId) {
      socket.emit('bid_rejected', { message: '⛔ Wait for another team to bid before bidding again!' });
      return;
    }

    // ── Squad size limit ──
    const squad = state.teamSquads[Number(teamId)] || { players: [], indianCount: 0, foreignerCount: 0 };
    if (squad.players.length >= MAX_SQUAD_SIZE) {
      socket.emit('bid_rejected', { message: `Squad full! Max ${MAX_SQUAD_SIZE} players per team.` });
      return;
    }

    // ── Nationality limits (only in standard mode) ──
    if (state.mode !== 'special') {
      const player   = state.currentPlayer;
      const isIndian = player.nationality === 'Indian';
      if (isIndian && squad.indianCount >= MAX_INDIANS) {
        socket.emit('bid_rejected', { message: `Indian player cap reached (max ${MAX_INDIANS} Indians per squad)!` });
        return;
      }
      if (!isIndian && player.nationality && player.nationality !== 'Neutral' && squad.foreignerCount >= MAX_FOREIGNERS) {
        socket.emit('bid_rejected', { message: `Overseas player cap reached (max ${MAX_FOREIGNERS} foreigners per squad)!` });
        return;
      }
    }

    // ── Budget check ──
    const { rows } = await db.query('SELECT * FROM teams WHERE team_id = $1', [teamId]);
    if (rows.length === 0) return;
    const team = rows[0];
    if (amount > Number(team.remaining_budget)) {
      socket.emit('bid_rejected', { message: 'Insufficient budget!' });
      return;
    }

    // Save history for undo/retract
    if (!state.bidHistory) state.bidHistory = [];
    state.bidHistory.push({
      currentBid:        state.currentBid,
      highestBidderId:   state.highestBidderId,
      highestBidderName: state.highestBidderName,
      lastBidderId:      state.lastBidderId
    });

    // Accept bid
    state.currentBid        = amount;
    state.highestBidderId   = Number(teamId);
    state.highestBidderName = team.team_name;
    state.lastBidderId      = Number(teamId);

    io.to(roomId).emit('bid_updated', {
      currentBid:        amount,
      highestBidderName: team.team_name,
      highestBidderId:   Number(teamId),
    });

    resetTimer(roomId);
  });

  // ── next_player (host) ─────────────────────────────────────────────────────
  socket.on('next_player', async ({ roomId }) => {
    roomId = roomId.toUpperCase();
    if (!await verifyIsHost(socket, roomId)) return;
    const state = auctionStates.get(roomId);
    if (!state) return;
    clearInterval(state.timerInterval);
    state.lastBidderId = null;
    if (state.highestBidderId) {
      await sellCurrentPlayer(roomId);
    } else {
      await markUnsold(roomId);
    }
  });

  // ── mark_unsold (host) ─────────────────────────────────────────────────────
  socket.on('mark_unsold', async ({ roomId }) => {
    roomId = roomId.toUpperCase();
    if (!await verifyIsHost(socket, roomId)) return;
    await markUnsold(roomId);
  });

  // ── toggle_pause (host) ────────────────────────────────────────────────────
  socket.on('toggle_pause', async ({ roomId }) => {
    roomId = roomId.toUpperCase();
    if (!await verifyIsHost(socket, roomId)) return;
    const state = auctionStates.get(roomId);
    if (!state) return;
    state.isPaused = !state.isPaused;
    io.to(roomId).emit('auction_paused', { isPaused: state.isPaused });
  });

  // ── reset_timer (host) ─────────────────────────────────────────────────────
  socket.on('reset_timer', async ({ roomId }) => {
    roomId = roomId.toUpperCase();
    if (!await verifyIsHost(socket, roomId)) return;
    resetTimer(roomId);
    io.to(roomId).emit('timer_reset', { timeLeft: AUCTION_TIMER_SECS });
  });

  // ── retract_bid (host only) ────────────────────────────────────────────────
  socket.on('retract_bid', async ({ roomId }) => {
    roomId = roomId.toUpperCase();
    if (!await verifyIsHost(socket, roomId)) return;
    const state = auctionStates.get(roomId);
    if (!state || state.waitingForSetStart || !state.currentPlayer) return;

    if (state.bidHistory && state.bidHistory.length > 0) {
      const prev = state.bidHistory.pop();
      state.currentBid        = prev.currentBid;
      state.highestBidderId   = prev.highestBidderId;
      state.highestBidderName = prev.highestBidderName;
      state.lastBidderId      = prev.lastBidderId;
    } else {
      state.currentBid        = Number(state.currentPlayer.base_price);
      state.highestBidderId   = null;
      state.highestBidderName = null;
      state.lastBidderId      = null;
    }

    io.to(roomId).emit('bid_updated', {
      currentBid:        state.currentBid,
      highestBidderName: state.highestBidderName,
      highestBidderId:   state.highestBidderId,
    });
    resetTimer(roomId);
  });

  // ── add_time (host only) ───────────────────────────────────────────────────
  socket.on('add_time', async ({ roomId }) => {
    roomId = roomId.toUpperCase();
    if (!await verifyIsHost(socket, roomId)) return;
    const state = auctionStates.get(roomId);
    if (!state || state.waitingForSetStart || state.isPaused) return;

    state.timeLeft = Math.min(60, state.timeLeft + 15);
    io.to(roomId).emit('timer_tick', { timeLeft: state.timeLeft });
  });

  // ── restart_player (host only) ─────────────────────────────────────────────
  socket.on('restart_player', async ({ roomId }) => {
    roomId = roomId.toUpperCase();
    if (!await verifyIsHost(socket, roomId)) return;
    const state = auctionStates.get(roomId);
    if (!state || state.waitingForSetStart || !state.currentPlayer) return;

    state.currentBid        = Number(state.currentPlayer.base_price);
    state.highestBidderId   = null;
    state.highestBidderName = null;
    state.lastBidderId      = null;
    state.bidHistory        = [];

    io.to(roomId).emit('bid_updated', {
      currentBid:        state.currentBid,
      highestBidderName: null,
      highestBidderId:   null,
    });
    resetTimer(roomId);
  });

  // ── send_message (chat) ────────────────────────────────────────────────────
  socket.on('send_message', ({ roomId, teamName, message }) => {
    if (!message || message.trim().length === 0) return;
    const timestamp = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    io.to(roomId.toUpperCase()).emit('receive_message', {
      teamName,
      message: message.trim().substring(0, 200),
      timestamp,
    });
  });

  // ── disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    const { roomId, teamId } = socket.data;
    if (!roomId || !teamId) return;

    await db.query('UPDATE teams SET socket_id = NULL WHERE team_id = $1', [teamId]);

    const hostTeamId = hostMap.get(roomId);
    if (teamId === hostTeamId) {
      const state = auctionStates.get(roomId);
      if (state && !state.waitingForSetStart) {
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
