/**
 * auction.js — Live Auction Room Socket Logic
 * Handles bidding, player cards, timer, chat, and sold history
 */

// ─── Session ──────────────────────────────────────────────────────────────────
const roomId   = sessionStorage.getItem('ah_room_id');
const teamId   = parseInt(sessionStorage.getItem('ah_team_id'), 10);
const teamName = sessionStorage.getItem('ah_team_name');
const isHost   = sessionStorage.getItem('ah_is_host') === 'true';
let   myBudget = parseFloat(sessionStorage.getItem('ah_budget')) || 100;

if (!roomId || !teamId) { window.location.href = '/'; }

// ─── State ────────────────────────────────────────────────────────────────────
let currentBid       = 0;
let currentPlayer    = null;
let timeLeft         = 30;
let totalPlayers     = 0;
let currentIndex     = 0;
let isPaused         = false;
let allTeams         = [];
let soldList         = [];
const TIMER_MAX      = 15;

// ─── Utilities ───────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('toast-out'); setTimeout(() => el.remove(), 280); }, 3500);
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function avatarInitials(name) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const avatarGradients = [
  'linear-gradient(135deg,#1d4ed8,#7c3aed)',
  'linear-gradient(135deg,#065f46,#059669)',
  'linear-gradient(135deg,#7f1d1d,#b91c1c)',
  'linear-gradient(135deg,#92400e,#d97706)',
  'linear-gradient(135deg,#1e3a5f,#0ea5e9)',
  'linear-gradient(135deg,#4a044e,#a21caf)',
];

function avatarGrad(name) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return avatarGradients[Math.abs(hash) % avatarGradients.length];
}

function roleClass(role) {
  const map = {
    'Batsman':      'badge-blue',
    'Bowler':       'badge-green',
    'All-Rounder':  'badge-gold',
    'Wicketkeeper': 'badge-purple',
    'Pacer':        'badge-green',
    'Spinner':      'badge-red',
  };
  return map[role] || 'badge-blue';
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
document.getElementById('nav-room-info').textContent  = `Room: ${roomId}`;
document.getElementById('nav-team-info').textContent  = teamName;
if (isHost) document.getElementById('host-bar').style.display = 'flex';

// ─── Update My Budget Display ─────────────────────────────────────────────────
function updateMyBudgetDisplay() {
  document.getElementById('my-budget-display').textContent = `₹${myBudget.toFixed(2)} Cr`;
  updateQuickBids();
}

// ─── Render Player Card ───────────────────────────────────────────────────────
function renderPlayerCard(player) {
  currentPlayer = player;
  const initials = avatarInitials(player.name);
  const grad     = avatarGrad(player.name);

  document.getElementById('player-avatar').textContent   = initials;
  document.getElementById('player-avatar').style.background = grad;
  document.getElementById('player-name').textContent     = player.name;
  document.getElementById('player-base-price').textContent = `₹${Number(player.base_price).toFixed(2)} Cr`;

  const roleBadge = document.getElementById('player-role-badge');
  roleBadge.textContent  = player.role || '—';
  roleBadge.className    = `badge ${roleClass(player.role)}`;

  document.getElementById('player-team-badge').textContent   = player.ipl_team || player.team || '—';
  document.getElementById('player-nation-badge').textContent = player.nationality || '—';

  // Pre-fill bid input with a sensible increment
  const increment    = currentBid >= 1 ? 0.25 : 0.25;
  const suggestedBid = Math.max(Number(player.base_price), currentBid + increment);
  document.getElementById('bid-input').value = suggestedBid.toFixed(2);

  updateQuickBids();
}

// ─── Update Bid Display ───────────────────────────────────────────────────────
function renderBidUpdate(bid, bidderName, bidderId) {
  currentBid = bid;
  const bidEl = document.getElementById('bid-amount');
  bidEl.textContent = `₹${bid.toFixed(2)} Cr`;
  bidEl.style.animation = 'none';
  void bidEl.offsetWidth;
  bidEl.style.animation = 'bidUpdate 0.3s cubic-bezier(0.34,1.56,0.64,1)';

  const label = document.getElementById('highest-bidder-label');
  if (bidderName) {
    const isMe = bidderId === teamId;
    label.innerHTML = `Highest bid by <span class="bidder-name">${escapeHtml(bidderName)}${isMe ? ' (You 🎉)' : ''}</span>`;
  } else {
    label.textContent = 'No bids yet — be the first!';
  }

  // Update bid input
  const next = (bid + 0.25).toFixed(2);
  document.getElementById('bid-input').value = next;
  updateQuickBids();
}

// ─── Quick Bid Buttons ────────────────────────────────────────────────────────
function updateQuickBids() {
  const container = document.getElementById('quick-bids');
  const base      = Math.max(currentBid, currentPlayer ? Number(currentPlayer.base_price) : 0);
  const steps     = [0.25, 0.5, 1.0, 2.0];
  container.innerHTML = steps.map(step => {
    const val = (base + step).toFixed(2);
    const affordable = parseFloat(val) <= myBudget;
    return `<button class="quick-bid-btn" onclick="setQuickBid(${val})" ${affordable ? '' : 'style="opacity:0.4"'}>
      +₹${step}Cr = ₹${val}Cr
    </button>`;
  }).join('');
}

window.setQuickBid = function(val) {
  document.getElementById('bid-input').value = val;
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function updateProgress(index, total) {
  currentIndex  = index;
  totalPlayers  = total;
  const pct = total > 0 ? ((index + 1) / total * 100).toFixed(1) : 0;
  document.getElementById('player-progress-bar').style.width = pct + '%';
  document.getElementById('player-progress-label').textContent = `Player ${index + 1} / ${total}`;
  document.getElementById('player-num-display').textContent = `#${index + 1} of ${total}`;
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function updateTimer(seconds) {
  timeLeft = seconds;
  const el    = document.getElementById('timer-display');
  const bar   = document.getElementById('timer-bar');
  const pct   = (seconds / TIMER_MAX * 100).toFixed(1);

  el.textContent  = seconds;
  bar.style.width = pct + '%';

  el.className  = 'timer-count';
  bar.className = 'timer-bar-fill';

  if (seconds <= 5) {
    el.classList.add('critical');
    bar.classList.add('critical');
  } else if (seconds <= 10) {
    el.classList.add('warning');
    bar.classList.add('warning');
  }
}

// ─── Teams Panel ─────────────────────────────────────────────────────────────
function renderTeams(teams) {
  allTeams = teams;
  const container = document.getElementById('teams-list');

  // Update my budget from teams list
  const myTeam = teams.find(t => t.team_id === teamId);
  if (myTeam) {
    myBudget = Number(myTeam.remaining_budget);
    updateMyBudgetDisplay();
    sessionStorage.setItem('ah_budget', myBudget);
  }

  if (teams.length === 0) {
    container.innerHTML = '<div class="empty-state">No teams</div>';
    return;
  }

  // Find current winning team for highlight
  const winningTeamId = (() => {
    const state = { highestBidderId: null };
    return state.highestBidderId;
  })();

  container.innerHTML = [...teams]
    .sort((a, b) => Number(b.remaining_budget) - Number(a.remaining_budget))
    .map(t => {
      const isMe      = t.team_id === teamId;
      const maxBudget = teams.reduce((max, x) => Math.max(max, Number(x.remaining_budget)), 0);
      const budgetPct = maxBudget > 0 ? (Number(t.remaining_budget) / maxBudget * 100).toFixed(1) : 0;

      return `
        <div class="team-row-auction ${isMe ? 'my-team' : ''}">
          <div class="team-row-top">
            <span class="team-name-display" style="font-size:0.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">
              ${t.is_host ? '👑 ' : ''}${escapeHtml(t.team_name)}${isMe ? ' <span style="color:var(--blue-bright);font-size:0.75rem">(You)</span>' : ''}
            </span>
            <span style="font-family:\'Rajdhani\',sans-serif;font-size:0.9rem;color:var(--gold);white-space:nowrap">
              ₹${Number(t.remaining_budget).toFixed(2)}Cr
            </span>
          </div>
          <div class="team-budget-bar-wrap">
            <div class="team-budget-bar" style="width:${budgetPct}%"></div>
          </div>
        </div>
      `;
    }).join('');
}

// ─── Sold History ─────────────────────────────────────────────────────────────
function addToSoldHistory(item) {
  soldList.push(item);
  renderSoldHistory();
}

function renderSoldHistory() {
  const container = document.getElementById('sold-history');
  const empty     = document.getElementById('sold-empty');
  document.getElementById('sold-count').textContent = soldList.length;

  if (soldList.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';

  container.innerHTML = [...soldList].reverse().map(item => {
    const unsold = !item.teamId;
    return `
      <div class="sold-item ${unsold ? 'unsold-item' : ''}">
        <span class="sold-player-name">${escapeHtml(item.player.name)}</span>
        ${unsold
          ? '<span class="badge badge-red" style="font-size:0.65rem">UNSOLD</span>'
          : `<span class="sold-bid">₹${Number(item.bid).toFixed(2)}Cr</span>`}
        <span class="sold-team">${escapeHtml(item.teamName)}</span>
      </div>
    `;
  }).join('');
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
function addChatMsg(data, isSystem = false) {
  const container = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.className = `chat-msg${isSystem ? ' system' : ''}`;

  if (isSystem) {
    el.innerHTML = `<div class="chat-msg-text">${escapeHtml(data.message)}</div>`;
  } else {
    const isMe = data.teamName === teamName;
    el.innerHTML = `
      <div class="chat-msg-header">
        <span class="chat-msg-name" style="${isMe ? 'color:var(--gold)' : ''}">
          ${isMe ? '⭐ ' : ''}${escapeHtml(data.teamName)}
        </span>
        <span class="chat-msg-time">${data.timestamp}</span>
      </div>
      <div class="chat-msg-text">${escapeHtml(data.message)}</div>
    `;
  }

  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

window.sendChatMessage = function () {
  const input   = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;
  socket.emit('send_message', { roomId, teamName, message });
  input.value = '';
};

// ─── Result Banner ────────────────────────────────────────────────────────────
function showResultBanner(type, title, subtitle) {
  const container = document.getElementById('result-banner-container');
  const el = document.createElement('div');
  el.className = `result-banner ${type}`;
  el.innerHTML = `
    <div class="result-banner-title">${title}</div>
    <div style="font-size:1.1rem;margin-top:0.5rem;color:var(--text-secondary)">${subtitle}</div>
  `;
  container.innerHTML = '';
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.5s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 500);
  }, 2800);
}

// ─── Show Auction Content ─────────────────────────────────────────────────────
function showAuctionContent() {
  document.getElementById('waiting-screen').style.display  = 'none';
  document.getElementById('auction-content').style.display = 'flex';
}

// ─── Place Bid ────────────────────────────────────────────────────────────────
window.placeBid = function () {
  const input = document.getElementById('bid-input');
  const amount = parseFloat(input.value);

  if (isNaN(amount) || amount <= 0) { toast('Enter a valid bid amount', 'warning'); return; }
  if (amount <= currentBid) {
    toast(`Bid must be more than ₹${currentBid.toFixed(2)} Cr`, 'warning');
    return;
  }
  if (amount > myBudget) {
    toast(`Insufficient budget! You have ₹${myBudget.toFixed(2)} Cr`, 'error');
    return;
  }

  socket.emit('place_bid', { roomId, teamId, bidAmount: amount });
};

// ─── Host Actions ─────────────────────────────────────────────────────────────
window.hostAction = function (action) {
  if (!isHost) return;
  socket.emit(action, { roomId });

  if (action === 'toggle_pause') {
    const btn = document.getElementById('pause-btn');
    if (btn) btn.textContent = isPaused ? '⏸ Pause' : '▶ Resume';
  }
};

// ─── Socket.io ───────────────────────────────────────────────────────────────
const socket = io();

socket.emit('join_room', { roomId, teamId });

// Room update (teams)
socket.on('room_update', ({ teams }) => {
  renderTeams(teams);
});

// Auction started
socket.on('auction_started', ({ player, currentBid: bid, playerIndex, totalPlayers: total }) => {
  showAuctionContent();
  currentBid = bid;
  updateProgress(playerIndex, total);
  renderPlayerCard(player);
  renderBidUpdate(bid, null, null);
  updateTimer(30);
  addChatMsg({ message: '🎺 Auction has started! Good luck everyone!' }, true);
});

// State sync (reconnecting player)
socket.on('auction_state_sync', (state) => {
  showAuctionContent();
  if (state.player) {
    currentBid = state.currentBid;
    updateProgress(state.playerIndex, state.totalPlayers);
    renderPlayerCard(state.player);
    renderBidUpdate(state.currentBid, state.highestBidderName, null);
    updateTimer(state.timeLeft);
    soldList = state.soldList || [];
    renderSoldHistory();
    if (state.isPaused) {
      isPaused = true;
      document.getElementById('pause-overlay').classList.add('active');
    }
  }
});

// Bid updated
socket.on('bid_updated', ({ currentBid: bid, highestBidderName, highestBidderId }) => {
  renderBidUpdate(bid, highestBidderName, highestBidderId);
  if (highestBidderId === teamId) {
    toast(`Your bid of ₹${bid.toFixed(2)} Cr is leading! 🔥`, 'success');
  } else {
    toast(`${highestBidderName} bid ₹${bid.toFixed(2)} Cr`, 'info');
  }
});

// Bid rejected
socket.on('bid_rejected', ({ message }) => {
  toast(message, 'error');
});

// Timer tick
socket.on('timer_tick', ({ timeLeft: t }) => {
  updateTimer(t);
});

socket.on('timer_reset', ({ timeLeft: t }) => {
  updateTimer(t);
});

// Player changed
socket.on('player_changed', ({ player, currentBid: bid, playerIndex, totalPlayers: total }) => {
  currentBid = bid;
  updateProgress(playerIndex, total);
  renderPlayerCard(player);
  renderBidUpdate(bid, null, null);
  updateTimer(30);
  addChatMsg({ message: `🏏 Up next: ${player.name} (${player.role}) — Base: ₹${Number(player.base_price).toFixed(2)} Cr` }, true);
});

// Player sold
socket.on('player_sold', ({ player, teamName: winnerName, bid, soldList: list }) => {
  soldList = list;
  renderSoldHistory();
  showResultBanner('sold', '🔨 SOLD!', `${player.name} → ${winnerName} @ ₹${Number(bid).toFixed(2)} Cr`);
  addChatMsg({ message: `🔨 ${player.name} SOLD to ${winnerName} for ₹${Number(bid).toFixed(2)} Cr!` }, true);
});

// Player unsold
socket.on('player_unsold', ({ player, soldList: list }) => {
  soldList = list;
  renderSoldHistory();
  showResultBanner('unsold', '❌ UNSOLD', `${player.name} goes unsold`);
  addChatMsg({ message: `❌ ${player.name} goes UNSOLD.` }, true);
});

// Auction paused/resumed
socket.on('auction_paused', ({ isPaused: paused }) => {
  isPaused = paused;
  const overlay = document.getElementById('pause-overlay');
  overlay.classList.toggle('active', paused);
  const btn = document.getElementById('pause-btn');
  if (btn) btn.textContent = paused ? '▶ Resume' : '⏸ Pause';
  addChatMsg({ message: paused ? '⏸ Auction paused by host' : '▶ Auction resumed!' }, true);
});

// Host disconnected
socket.on('host_disconnected', ({ message }) => {
  toast(message, 'warning');
  document.getElementById('pause-overlay').classList.add('active');
  isPaused = true;
});

// Host reconnected
socket.on('host_reconnected', ({ message }) => {
  toast(message, 'success');
});

// Kicked
socket.on('player_kicked', ({ message }) => {
  toast(message, 'error');
  setTimeout(() => { window.location.href = '/'; }, 2500);
});

// Auction ended
socket.on('auction_ended', ({ teams, soldList: list }) => {
  document.getElementById('ended-overlay').style.display = 'block';
  document.body.style.overflow = 'hidden';

  // Final teams
  const teamsContainer = document.getElementById('final-teams');
  const sorted = [...teams].sort((a, b) => Number(b.remaining_budget) - Number(a.remaining_budget));
  teamsContainer.innerHTML = sorted.map((t, i) => `
    <div class="result-card">
      <div style="font-size:1.5rem;margin-bottom:0.4rem">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}</div>
      <div style="font-family:\'Rajdhani\',sans-serif;font-size:1.1rem;font-weight:700">${escapeHtml(t.team_name)}</div>
      <div style="color:var(--gold);font-family:\'Rajdhani\',sans-serif;margin-top:0.2rem">₹${Number(t.remaining_budget).toFixed(2)} Cr left</div>
      ${t.is_host ? '<span class="badge badge-gold" style="margin-top:0.4rem">HOST</span>' : ''}
    </div>
  `).join('');

  // Full sold list
  const soldContainer = document.getElementById('final-sold-list');
  soldContainer.innerHTML = (list || []).map(item => `
    <div class="sold-item ${!item.teamId ? 'unsold-item' : ''}">
      <span class="sold-player-name">${escapeHtml(item.player.name)}</span>
      <span style="font-size:0.78rem;color:var(--text-muted)">${escapeHtml(item.player.role || '')}</span>
      ${!item.teamId
        ? '<span class="badge badge-red" style="font-size:0.65rem">UNSOLD</span>'
        : `<span class="sold-bid">₹${Number(item.bid).toFixed(2)}Cr</span>
           <span class="sold-team">${escapeHtml(item.teamName)}</span>`}
    </div>
  `).join('');
});

// Chat
socket.on('receive_message', (data) => {
  addChatMsg(data);
});

// Connection events
socket.on('connect_error', () => toast('Connection lost — retrying...', 'warning'));
socket.on('reconnect', () => {
  toast('Reconnected!', 'success');
  socket.emit('join_room', { roomId, teamId });
});
