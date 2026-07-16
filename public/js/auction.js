/**
 * auction.js — Auction Hub Live Auction Room
 * Handles bidding, player cards, timers, squads, set previews, chat
 */

// ─── Session ──────────────────────────────────────────────────────────────────
const roomId   = sessionStorage.getItem('ah_room_id');
const teamId   = parseInt(sessionStorage.getItem('ah_team_id'), 10);
const teamName = sessionStorage.getItem('ah_team_name');
const isHost   = sessionStorage.getItem('ah_is_host') === 'true';
let   myBudget = parseFloat(sessionStorage.getItem('ah_budget')) || 100;

if (!roomId || !teamId) { window.location.href = '/'; }

// ─── Fixed IPL Teams Configuration ───────────────────────────────────────────
const IPL_TEAMS = [
  { name: 'Chennai Super Kings', short: 'CSK', logo: '🦁', color: '#f0b429' },
  { name: 'Mumbai Indians', short: 'MI', logo: '🌀', color: '#004ba0' },
  { name: 'Royal Challengers Bengaluru', short: 'RCB', logo: '👑', color: '#ec1c24' },
  { name: 'Kolkata Knight Riders', short: 'KKR', logo: '🛡️', color: '#3a225d' },
  { name: 'Delhi Capitals', short: 'DC', logo: '🐯', color: '#004ba0' },
  { name: 'Punjab Kings', short: 'PBKS', logo: '🦁', color: '#e81c24' },
  { name: 'Rajasthan Royals', short: 'RR', logo: '👑', color: '#ea1a85' },
  { name: 'Sunrisers Hyderabad', short: 'SRH', logo: '🦅', color: '#ff3c00' },
  { name: 'Lucknow Super Giants', short: 'LSG', logo: '🦅', color: '#00a1ec' },
  { name: 'Gujarat Titans', short: 'GT', logo: '⚡', color: '#0b2240' }
];

function getTeamDetails(name) {
  return IPL_TEAMS.find(t => t.name === name) || { logo: '🏏', short: '', color: 'var(--blue-electric)' };
}

// ─── State ────────────────────────────────────────────────────────────────────
let currentBid       = 0;
let currentPlayer    = null;
let timeLeft         = 15;
let totalPlayers     = 0;
let globalPlayerIdx  = 0;
let isPaused         = false;
let allTeams         = [];
let soldList         = [];
let teamSquads       = {};          // teamId → {players[], indianCount, foreignerCount}
let currentSetLabel  = '';
const TIMER_MAX      = 15;
const MAX_SQUAD      = 25;
const MAX_INDIANS    = 17;
const MAX_FOREIGNERS = 8;

// ─── Utilities ────────────────────────────────────────────────────────────────
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
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
    'All-Rounder':  'badge-gold',
    'Wicketkeeper': 'badge-purple',
    'Pacer':        'badge-green',
    'Spinner':      'badge-red',
  };
  return map[role] || 'badge-blue';
}

function roleEmoji(role) {
  const map = {
    'Batsman':      '🏏',
    'All-Rounder':  '⚡',
    'Wicketkeeper': '🧤',
    'Pacer':        '💨',
    'Spinner':      '🌀',
  };
  return map[role] || '🏏';
}

// ─── Tab Switching ────────────────────────────────────────────────────────────
window.switchTab = function (tab) {
  ['teams', 'squads', 'history'].forEach(t => {
    const pane = document.getElementById(`pane-${t}`);
    const btn  = document.getElementById(`tab-${t}`);
    if (pane) pane.className = `panel-pane${t === tab ? '' : ' hidden'}`;
    if (btn)  btn.classList.toggle('active', t === tab);
  });
  if (tab === 'squads') renderSquads();
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
document.getElementById('nav-room-info').textContent = `Room: ${roomId}`;
const details = getTeamDetails(teamName);
const navTeamEl = document.getElementById('nav-team-info');
if (navTeamEl) {
  navTeamEl.innerHTML = `<span style="font-size:1.15rem;margin-right:0.3rem">${details.logo}</span> ${escapeHtml(teamName)}`;
}
if (isHost) document.getElementById('host-bar').style.display = 'flex';

// ─── My Budget + Squad Display ────────────────────────────────────────────────
function updateMyBudgetDisplay() {
  document.getElementById('my-budget-display').textContent = `₹${myBudget.toFixed(2)} Cr`;

  const mySquad = teamSquads[teamId] || { players: [], indianCount: 0, foreignerCount: 0 };
  document.getElementById('my-squad-count').textContent =
    `${mySquad.players.length}/${MAX_SQUAD}`;

  const limitsEl = document.getElementById('my-squad-limits');
  if (limitsEl) {
    const indClass = mySquad.indianCount >= MAX_INDIANS ? 'style="color:#f87171"' : '';
    const forClass = mySquad.foreignerCount >= MAX_FOREIGNERS ? 'style="color:#f87171"' : '';
    limitsEl.innerHTML =
      `🇮🇳 <span ${indClass}>${mySquad.indianCount}/${MAX_INDIANS}</span>&nbsp;` +
      `🌍 <span ${forClass}>${mySquad.foreignerCount}/${MAX_FOREIGNERS}</span>`;
  }

  updateQuickBids();
}

// ─── Set Preview ──────────────────────────────────────────────────────────────
function showSetPreview({ setIndex, setNumber, label, role, players, totalSets }) {
  const overlay  = document.getElementById('set-preview-overlay');
  const setTitle = label.includes('—') ? label.split('—')[1].trim() : label;
  const emoji    = roleEmoji(role);

  document.getElementById('set-preview-pill').textContent  = `Set ${setNumber} of ${totalSets}`;
  document.getElementById('set-preview-title').textContent = `${emoji} ${setTitle}`;
  document.getElementById('set-preview-sub').textContent   = `${players.length} players up for auction`;

  const grid = document.getElementById('set-preview-grid');
  grid.innerHTML = players.map(p => `
    <div class="preview-player-card">
      <div class="preview-player-name">${escapeHtml(p.name)}</div>
      <div class="preview-player-meta">
        <span class="badge ${roleClass(p.role)}" style="font-size:0.65rem;padding:0.1rem 0.4rem">${escapeHtml(p.role)}</span>
        <span class="preview-player-price">₹${Number(p.base_price).toFixed(2)}Cr</span>
      </div>
      <div class="preview-player-team">${escapeHtml(p.ipl_team || '')} · ${escapeHtml(p.nationality || '')}</div>
    </div>
  `).join('');

  const footer = document.getElementById('set-preview-footer');
  if (isHost) {
    footer.innerHTML = `
      <button id="start-set-btn"
        style="padding:0.85rem 2.5rem;background:var(--gold);color:#000;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.1rem;border:none;border-radius:9999px;cursor:pointer;letter-spacing:0.05em;box-shadow:0 0 24px rgba(240,180,41,0.4);transition:all 0.2s"
        onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"
        onclick="hostAction('start_set')">
        🏏 Start ${setTitle} Auction
      </button>`;
  } else {
    footer.innerHTML = `<div style="color:var(--text-muted);font-size:0.9rem;margin-top:0.5rem">
      ⏳ Waiting for the host to start this set...
    </div>`;
  }

  overlay.classList.add('active');
}

function hideSetPreview() {
  document.getElementById('set-preview-overlay').classList.remove('active');
}

// ─── Show Auction Content ──────────────────────────────────────────────────────
function showAuctionContent() {
  document.getElementById('waiting-screen').style.display  = 'none';
  document.getElementById('auction-content').style.display = 'flex';
}

// ─── Render Player Card ───────────────────────────────────────────────────────
function renderPlayerCard(player) {
  if (!player) return;
  currentPlayer = player;
  const initials = avatarInitials(player.name);
  const grad     = avatarGrad(player.name);

  document.getElementById('player-avatar').textContent        = initials;
  document.getElementById('player-avatar').style.background   = grad;
  document.getElementById('player-name').textContent          = player.name;
  document.getElementById('player-base-price').textContent    = `₹${Number(player.base_price).toFixed(2)} Cr`;

  const roleBadge = document.getElementById('player-role-badge');
  roleBadge.textContent = player.role || '—';
  roleBadge.className   = `badge ${roleClass(player.role)}`;

  document.getElementById('player-team-badge').textContent   = player.ipl_team || player.team || '—';
  document.getElementById('player-nation-badge').textContent = player.nationality || '—';

  const suggestedBid = Math.max(Number(player.base_price), currentBid + 0.25);
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

  document.getElementById('bid-input').value = (bid + 0.25).toFixed(2);
  updateQuickBids();
}

// ─── Quick Bid Buttons ────────────────────────────────────────────────────────
function updateQuickBids() {
  const container = document.getElementById('quick-bids');
  const base = Math.max(currentBid, currentPlayer ? Number(currentPlayer.base_price) : 0);
  const steps = [0.25, 0.5, 1.0, 2.0];
  container.innerHTML = steps.map(step => {
    const val = (base + step).toFixed(2);
    const affordable = parseFloat(val) <= myBudget;
    return `<button class="quick-bid-btn" onclick="setQuickBid(${val})" ${affordable ? '' : 'style="opacity:0.4"'}>
      +₹${step}Cr = ₹${val}Cr
    </button>`;
  }).join('');
}

window.setQuickBid = function (val) {
  document.getElementById('bid-input').value = val;
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function updateProgress(index, total, playerInSet, setSize, setLabel) {
  globalPlayerIdx = index;
  totalPlayers    = total;
  const pct = total > 0 ? ((index + 1) / total * 100).toFixed(1) : 0;
  document.getElementById('player-progress-bar').style.width    = pct + '%';
  document.getElementById('player-progress-label').textContent  = `Player ${index + 1} / ${total}`;
  document.getElementById('player-num-display').textContent     = `#${index + 1} of ${total}`;

  if (setLabel) currentSetLabel = setLabel;
  document.getElementById('set-label-display').textContent = currentSetLabel || '';

  if (playerInSet !== undefined && setSize !== undefined) {
    document.getElementById('set-progress-label').textContent =
      `${playerInSet + 1} / ${setSize} in this set`;
  }
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function updateTimer(seconds) {
  timeLeft = seconds;
  const el  = document.getElementById('timer-display');
  const bar = document.getElementById('timer-bar');
  const pct = (seconds / TIMER_MAX * 100).toFixed(1);

  el.textContent  = seconds;
  bar.style.width = pct + '%';
  el.className    = 'timer-count';
  bar.className   = 'timer-bar-fill';

  if (seconds <= 5)       { el.classList.add('critical'); bar.classList.add('critical'); }
  else if (seconds <= 10) { el.classList.add('warning');  bar.classList.add('warning');  }
}

// ─── Teams Panel ─────────────────────────────────────────────────────────────
function renderTeams(teams) {
  allTeams = teams;
  const container = document.getElementById('teams-list');

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

  container.innerHTML = [...teams]
    .sort((a, b) => Number(b.remaining_budget) - Number(a.remaining_budget))
    .map(t => {
      const isMe      = t.team_id === teamId;
      const maxBudget = teams.reduce((mx, x) => Math.max(mx, Number(x.remaining_budget)), 1);
      const budgetPct = (Number(t.remaining_budget) / maxBudget * 100).toFixed(1);
      const mySquad   = teamSquads[t.team_id] || { players: [], indianCount: 0, foreignerCount: 0 };
      const details   = getTeamDetails(t.team_name);

      return `
        <div class="team-row-auction ${isMe ? 'my-team' : ''}" style="border-left: 3px solid ${details.color}">
          <div class="team-row-top">
            <span style="font-size:0.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">
              ${t.is_host ? '👑 ' : ''}<span style="margin-right:0.25rem">${details.logo}</span>${escapeHtml(t.team_name)}${isMe ? ' <span style="color:var(--blue-bright);font-size:0.72rem">(You)</span>' : ''}
            </span>
            <span style="font-family:'Rajdhani',sans-serif;font-size:0.9rem;color:${details.color};white-space:nowrap;font-weight:700">
              ₹${Number(t.remaining_budget).toFixed(2)}Cr
            </span>
          </div>
          <div class="team-budget-bar-wrap">
            <div class="team-budget-bar" style="width:${budgetPct}%; background:${details.color}"></div>
          </div>
          <div style="font-size:0.68rem;color:var(--text-muted);margin-top:0.2rem">
            Squad: ${mySquad.players.length}/${MAX_SQUAD} &nbsp;·&nbsp;
            🇮🇳 ${mySquad.indianCount}/${MAX_INDIANS} &nbsp;·&nbsp;
            🌍 ${mySquad.foreignerCount}/${MAX_FOREIGNERS}
          </div>
        </div>
      `;
    }).join('');
}

// ─── Squads Panel ─────────────────────────────────────────────────────────────
function renderSquads() {
  const container = document.getElementById('squads-list');
  const empty     = document.getElementById('squads-empty');

  const hasAnyPlayer = Object.values(teamSquads).some(s => s.players.length > 0);
  if (!hasAnyPlayer) {
    empty.style.display   = 'block';
    container.innerHTML   = '';
    return;
  }
  empty.style.display = 'none';

  container.innerHTML = allTeams.map(team => {
    const squad  = teamSquads[team.team_id] || { players: [], indianCount: 0, foreignerCount: 0 };
    const isMe   = team.team_id === teamId;
    const isFull = squad.players.length >= MAX_SQUAD;
    const details = getTeamDetails(team.team_name);

    const indPill  = squad.indianCount  >= MAX_INDIANS    ? 'full'    : squad.indianCount  >= MAX_INDIANS - 3  ? 'warning' : 'ok';
    const forPill  = squad.foreignerCount >= MAX_FOREIGNERS ? 'full'  : squad.foreignerCount >= MAX_FOREIGNERS - 2 ? 'warning' : 'ok';
    const sizePill = isFull ? 'full' : squad.players.length >= MAX_SQUAD - 3 ? 'warning' : 'ok';

    // Group players by role for display
    const byRole = {};
    squad.players.forEach(p => {
      if (!byRole[p.role]) byRole[p.role] = [];
      byRole[p.role].push(p);
    });
    const roleOrder = ['Batsman', 'All-Rounder', 'Wicketkeeper', 'Pacer', 'Spinner'];
    const playersHtml = squad.players.length === 0
      ? '<div style="font-size:0.78rem;color:var(--text-muted);padding:0.4rem 0">No players yet</div>'
      : roleOrder.flatMap(role => {
          const players = byRole[role] || [];
          if (!players.length) return [];
          return [
            `<div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin:0.3rem 0 0.1rem">${roleEmoji(role)} ${role}</div>`,
            ...players.map(p => `
              <div class="squad-player-row">
                <span class="squad-player-name">${escapeHtml(p.name)}</span>
                <span style="font-size:0.7rem;color:${p.nationality === 'Indian' ? '#60a5fa' : '#a78bfa'}">${p.nationality === 'Indian' ? '🇮🇳' : '🌍'}</span>
                <span class="squad-player-price">₹${Number(p.bid || p.base_price).toFixed(2)}Cr</span>
              </div>`)
          ];
        }).join('');

    return `
      <div class="squad-team-block" style="margin-bottom:0.5rem; border-left: 3px solid ${details.color}">
        <div class="squad-team-header" onclick="toggleSquad(${team.team_id})">
          <span class="squad-team-name ${isMe ? 'my-squad' : ''}">
            ${team.is_host ? '👑 ' : ''}<span style="margin-right:0.25rem">${details.logo}</span>${escapeHtml(team.team_name)}${isMe ? ' (You)' : ''}
          </span>
          <span class="squad-team-count">${squad.players.length}/${MAX_SQUAD} ▾</span>
        </div>
        <div id="squad-body-${team.team_id}" style="display:none">
          <div class="squad-limits">
            <span class="limit-pill ${sizePill}">Squad: ${squad.players.length}/${MAX_SQUAD}</span>
            <span class="limit-pill ${indPill}">🇮🇳 Indians: ${squad.indianCount}/${MAX_INDIANS}</span>
            <span class="limit-pill ${forPill}">🌍 Overseas: ${squad.foreignerCount}/${MAX_FOREIGNERS}</span>
          </div>
          <div class="squad-player-list">${playersHtml}</div>
        </div>
      </div>`;
  }).join('');
}

window.toggleSquad = function (tid) {
  const body = document.getElementById(`squad-body-${tid}`);
  if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
};

// ─── Sold History ─────────────────────────────────────────────────────────────
function addToSoldHistory(item) {
  soldList.push(item);
  renderSoldHistory();
}

function renderSoldHistory() {
  const container = document.getElementById('sold-history');
  const empty     = document.getElementById('sold-empty');
  document.getElementById('sold-count').textContent = soldList.length;

  if (soldList.length === 0) { if (empty) empty.style.display = 'block'; return; }
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
      </div>`;
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
      <div class="chat-msg-text">${escapeHtml(data.message)}</div>`;
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
    <div style="font-size:1.1rem;margin-top:0.5rem;color:var(--text-secondary)">${subtitle}</div>`;
  container.innerHTML = '';
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.5s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 500);
  }, 2800);
}

// ─── Pause Overlay ────────────────────────────────────────────────────────────
function setPauseOverlay(active) {
  const overlay   = document.getElementById('pause-overlay');
  const resumeBtn = document.getElementById('host-resume-btn');
  const subtitle  = document.getElementById('pause-subtitle');
  overlay.classList.toggle('active', active);
  if (active && isHost) {
    resumeBtn.style.display = 'block';
    subtitle.textContent    = 'You are the host — click Resume to continue.';
  } else {
    resumeBtn.style.display = 'none';
    subtitle.textContent    = 'Waiting for the host to resume...';
  }
}

// ─── Client-Side Bid Guards ───────────────────────────────────────────────────
function clientBidGuard(amount) {
  if (isNaN(amount) || amount <= 0) { toast('Enter a valid bid amount', 'warning'); return false; }
  if (amount <= currentBid)         { toast(`Bid must be more than ₹${currentBid.toFixed(2)} Cr`, 'warning'); return false; }
  if (amount > myBudget)            { toast(`Insufficient budget! You have ₹${myBudget.toFixed(2)} Cr`, 'error'); return false; }

  const mySquad = teamSquads[teamId] || { players: [], indianCount: 0, foreignerCount: 0 };
  if (mySquad.players.length >= MAX_SQUAD) {
    toast(`Squad full! Max ${MAX_SQUAD} players per team.`, 'error'); return false;
  }
  if (currentPlayer) {
    const isIndian = currentPlayer.nationality === 'Indian';
    if (isIndian  && mySquad.indianCount >= MAX_INDIANS) {
      toast(`Indian player cap reached (max ${MAX_INDIANS})!`, 'error'); return false;
    }
    if (!isIndian && mySquad.foreignerCount >= MAX_FOREIGNERS) {
      toast(`Overseas player cap reached (max ${MAX_FOREIGNERS})!`, 'error'); return false;
    }
  }
  return true;
}

// ─── Place Bid ────────────────────────────────────────────────────────────────
window.placeBid = function () {
  const amount = parseFloat(document.getElementById('bid-input').value);
  if (!clientBidGuard(amount)) return;
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

// ─── Socket.io ────────────────────────────────────────────────────────────────
const socket = io();
socket.emit('join_room', { roomId, teamId });

// Room update (teams + budgets)
socket.on('room_update', ({ teams }) => {
  renderTeams(teams);
});

// Auction initialised — set up the layout so it shows behind the set preview
socket.on('auction_initialized', ({ totalPlayers: total }) => {
  totalPlayers = total;
  showAuctionContent();
  addChatMsg({ message: '🎺 Auction initialised!' }, true);
});

// Set preview
socket.on('set_preview', (data) => {
  showAuctionContent(); // ensure layout is visible behind overlay
  showSetPreview(data);
  addChatMsg({ message: `📋 Preview: ${data.label}` }, true);
});

// Set started by host
socket.on('set_started', ({ label, player, currentBid: bid, playerIndex, totalPlayers: total, playerInSet, setSize }) => {
  hideSetPreview();
  currentSetLabel = label;
  currentBid      = bid;
  updateProgress(playerIndex, total, playerInSet, setSize, label);
  renderPlayerCard(player);
  renderBidUpdate(bid, null, null);
  updateTimer(TIMER_MAX);
  addChatMsg({ message: `🏏 Started! First up: ${player.name}` }, true);
});

// State sync for reconnecting users
socket.on('auction_state_sync', (state) => {
  if (state.teamSquads) {
    teamSquads = state.teamSquads;
    renderSquads();
    updateMyBudgetDisplay();
  }
  soldList = state.soldList || [];
  renderSoldHistory();

  if (state.waitingForSetStart) {
    showAuctionContent();
    return; // set_preview will come separately
  }

  if (state.player) {
    showAuctionContent();
    currentBid      = state.currentBid;
    currentSetLabel = state.setLabel || '';
    updateProgress(state.playerIndex, state.totalPlayers, state.playerInSet, state.setSize, state.setLabel);
    renderPlayerCard(state.player);
    renderBidUpdate(state.currentBid, state.highestBidderName, null);
    updateTimer(state.timeLeft);
    if (state.isPaused) { isPaused = true; setPauseOverlay(true); }
  }
});

// Squad update (after each sale)
socket.on('squad_update', ({ teamSquads: squads }) => {
  teamSquads = squads;
  renderTeams(allTeams);           // refresh team rows to show new counts
  renderSquads();                  // refresh squads tab if open
  updateMyBudgetDisplay();
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

// Timer
socket.on('timer_tick',  ({ timeLeft: t }) => updateTimer(t));
socket.on('timer_reset', ({ timeLeft: t }) => updateTimer(t));

// Player changed (within same set)
socket.on('player_changed', ({ player, currentBid: bid, playerIndex, totalPlayers: total, setLabel, playerInSet, setSize }) => {
  currentBid = bid;
  updateProgress(playerIndex, total, playerInSet, setSize, setLabel);
  renderPlayerCard(player);
  renderBidUpdate(bid, null, null);
  updateTimer(TIMER_MAX);
  addChatMsg({ message: `🏏 Next: ${player.name} (Base: ₹${Number(player.base_price).toFixed(2)} Cr)` }, true);
});

// Player sold
socket.on('player_sold', ({ player, teamName: winnerName, bid, soldList: list }) => {
  soldList = list;
  renderSoldHistory();
  showResultBanner('sold', '🔨 SOLD!', `${player.name} → ${winnerName} @ ₹${Number(bid).toFixed(2)} Cr`);
  addChatMsg({ message: `🔨 ${player.name} SOLD to ${winnerName} (₹${Number(bid).toFixed(2)} Cr)` }, true);
});

// Player unsold
socket.on('player_unsold', ({ player, soldList: list }) => {
  soldList = list;
  renderSoldHistory();
  showResultBanner('unsold', '❌ UNSOLD', `${player.name} goes unsold`);
  addChatMsg({ message: `❌ ${player.name} UNSOLD` }, true);
});

// Auction paused / resumed
socket.on('auction_paused', ({ isPaused: paused }) => {
  isPaused = paused;
  setPauseOverlay(paused);
  const btn = document.getElementById('pause-btn');
  if (btn) btn.textContent = paused ? '▶ Resume' : '⏸ Pause';
  addChatMsg({ message: paused ? '⏸ Paused' : '▶ Resumed' }, true);
});

// Host disconnected / reconnected
socket.on('host_disconnected', ({ message }) => {
  toast(message, 'warning');
  setPauseOverlay(true);
  isPaused = true;
});

socket.on('host_reconnected', ({ message }) => {
  toast(message, 'success');
});

// Kicked
socket.on('player_kicked', ({ message }) => {
  toast(message, 'error');
  setTimeout(() => { window.location.href = '/'; }, 2500);
});

// ─── Squad Score Calculation ──────────────────────────────────────────────────
function calculateSquadScore(squad) {
  if (!squad || !squad.players || squad.players.length === 0) {
    return { rating: 0, grade: 'F', totalBought: 0, details: 'No players purchased.' };
  }

  let totalRating = 0;
  let hasWk = false;
  let batCount = 0;
  let arCount = 0;
  let pacerCount = 0;
  let spinnerCount = 0;
  let overseasCount = 0;

  // Stats calculation variables
  let totalRuns = 0;
  let batSrSum = 0;
  let batSrCount = 0;
  let batAvgSum = 0;
  let batAvgCount = 0;
  let totalWickets = 0;
  let bowlEconSum = 0;
  let bowlEconCount = 0;
  let spinEconSum = 0;
  let spinEconCount = 0;
  let paceEconSum = 0;
  let paceEconCount = 0;
  let wkCatches = 0;
  let wkStumpings = 0;

  const getStatsFallback = p => {
    if (p.stats) return p.stats;
    if (p.role === 'Batsman') return { runs: 1200, strike_rate: 130.0, average: 28.0 };
    if (p.role === 'Wicketkeeper') return { runs: 1000, strike_rate: 128.0, average: 26.0, catches: 15, stumpings: 3 };
    if (p.role === 'All-Rounder') return { runs: 800, strike_rate: 132.0, average: 22.0, wickets: 25, economy: 8.20 };
    return { wickets: 30, economy: 8.10, bowling_strike_rate: 19.5 };
  };

  squad.players.forEach(p => {
    let r = 60;
    const bp = Number(p.base_price);
    if (bp >= 2.00) r = 95;
    else if (bp >= 1.75) r = 90;
    else if (bp >= 1.50) r = 85;
    else if (bp >= 1.25) r = 80;
    else if (bp >= 1.00) r = 75;
    else if (bp >= 0.75) r = 70;
    else r = 65;

    totalRating += r;

    if (p.role === 'Wicketkeeper') hasWk = true;
    else if (p.role === 'Batsman') batCount++;
    else if (p.role === 'All-Rounder') arCount++;
    else if (p.role === 'Pacer') pacerCount++;
    else if (p.role === 'Spinner') spinnerCount++;

    if (p.nationality !== 'Indian') overseasCount++;

    // Statistics Aggregation
    const s = getStatsFallback(p);
    if (s.runs !== undefined) {
      totalRuns += s.runs;
      if (s.strike_rate) {
        batSrSum += s.strike_rate;
        batSrCount++;
      }
      if (s.average) {
        batAvgSum += s.average;
        batAvgCount++;
      }
    }
    if (s.wickets !== undefined) {
      totalWickets += s.wickets;
      if (s.economy) {
        bowlEconSum += s.economy;
        bowlEconCount++;
        if (p.role === 'Spinner') {
          spinEconSum += s.economy;
          spinEconCount++;
        } else if (p.role === 'Pacer') {
          paceEconSum += s.economy;
          paceEconCount++;
        }
      }
    }
    if (p.role === 'Wicketkeeper') {
      if (s.catches) wkCatches += s.catches;
      if (s.stumpings) wkStumpings += s.stumpings;
    }
  });

  const count = squad.players.length;
  let avgRating = totalRating / count;

  // Penalties for poor balance
  let penalty = 0;
  if (count < 11) {
    penalty += (11 - count) * 6; // Heavy penalty for not having 11 players
  }
  if (!hasWk) penalty += 15; // Wicketkeeper is essential
  if (batCount < 3) penalty += (3 - batCount) * 5;
  if (arCount < 1) penalty += 8;
  const bowlers = pacerCount + spinnerCount;
  if (bowlers < 3) penalty += (3 - bowlers) * 5;

  // Overseas balance check
  if (overseasCount > 8) penalty += (overseasCount - 8) * 5;

  // Depth bonus: slightly rewards buying options above 11 players
  const depthBonus = Math.min(6, Math.max(0, count - 11) * 0.4);

  let finalScore = avgRating + depthBonus - penalty;
  finalScore = Math.max(10, Math.min(100, Math.round(finalScore)));

  let grade = 'C';
  if (finalScore >= 90) grade = 'A+';
  else if (finalScore >= 80) grade = 'A';
  else if (finalScore >= 70) grade = 'B+';
  else if (finalScore >= 60) grade = 'B';
  else if (finalScore >= 50) grade = 'C+';
  else if (finalScore >= 40) grade = 'C';
  else grade = 'D';

  // Compute Averages
  const avgSr = batSrCount > 0 ? (batSrSum / batSrCount) : 0;
  const avgBatAvg = batAvgCount > 0 ? (batAvgSum / batAvgCount) : 0;
  const avgEcon = bowlEconCount > 0 ? (bowlEconSum / bowlEconCount) : 0;
  const avgSpinEcon = spinEconCount > 0 ? (spinEconSum / spinEconCount) : 0;
  const avgPaceEcon = paceEconCount > 0 ? (paceEconSum / paceEconCount) : 0;

  // Strengths & Weaknesses generator
  const strengths = [];
  const weaknesses = [];

  if (avgSr >= 140) {
    strengths.push(`<b>High-Octane Batting:</b> Aggressive average strike rate of ${avgSr.toFixed(1)}. Highly explosive.`);
  } else if (avgSr > 0 && avgSr < 131) {
    weaknesses.push(`<b>Slow Run Rate:</b> Team strike rate averages ${avgSr.toFixed(1)}. May struggle to set high scores.`);
  }

  if (avgBatAvg >= 32) {
    strengths.push(`<b>Stable Top Order:</b> Roster batting average is a solid ${avgBatAvg.toFixed(1)}, minimizing collapse risks.`);
  } else if (avgBatAvg > 0 && avgBatAvg < 25) {
    weaknesses.push(`<b>Fragile Batting:</b> Batting average of ${avgBatAvg.toFixed(1)} indicates collapse vulnerability.`);
  }

  if (avgEcon > 0 && avgEcon <= 7.8) {
    strengths.push(`<b>Economical Bowling:</b> Aggregate economy rate of ${avgEcon.toFixed(2)} will dry up runs.`);
  } else if (avgEcon > 8.5) {
    weaknesses.push(`<b>Expensive Bowling:</b> Leaky fast/spin line-up averaging ${avgEcon.toFixed(2)}.`);
  }

  if (totalWickets >= 400) {
    strengths.push(`<b>Experienced Wicket-Takers:</b> Combined pool of ${totalWickets} wickets brings high-pressure experience.`);
  }

  if (spinnerCount >= 2 && avgSpinEcon > 0 && avgSpinEcon <= 7.6) {
    strengths.push(`<b>Spin Lockdown:</b> Spinners maintain a tight economy of ${avgSpinEcon.toFixed(2)} to choke the middle overs.`);
  } else if (spinnerCount === 0) {
    weaknesses.push(`<b>No Spin Options:</b> Lacks specialized spinners, which could be disastrous on slower tracks.`);
  }

  if (pacerCount >= 3 && avgPaceEcon > 0 && avgPaceEcon <= 8.2) {
    strengths.push(`<b>Pace Arsenal:</b> Fast bowlers have a strong foundation with a tight economy of ${avgPaceEcon.toFixed(2)}.`);
  } else if (pacerCount === 0) {
    weaknesses.push(`<b>Lacks Fast Bowlers:</b> No quick pacers, presenting a severe disadvantage in powerplay and death overs.`);
  }

  if (!hasWk) {
    weaknesses.push(`<b>No Wicketkeeper:</b> Missing specialized gloves behind the stumps! Makeshift keeper required.`);
  } else if (hasWk && wkCatches + wkStumpings > 40) {
    strengths.push(`<b>Safe Hands:</b> Solid wicketkeeping stats with ${wkCatches + wkStumpings} combined dismissals.`);
  }

  if (arCount >= 3) {
    strengths.push(`<b>Superb All-round Balance:</b> ${arCount} all-rounders provide high flexibility and late-order hitting.`);
  } else if (arCount === 0) {
    weaknesses.push(`<b>Lacks All-Rounders:</b> Roster lacks dual-role players, restricting team flexibility.`);
  }

  if (strengths.length === 0) strengths.push(`<b>Balanced Roster:</b> Steady squad without extreme traits.`);
  if (weaknesses.length === 0) weaknesses.push(`<b>Good Structure:</b> No major vulnerabilities found in team composition.`);

  let verdict = "";
  if (finalScore >= 88) {
    verdict = "🏆 <b>Championship Contenders:</b> A beautifully balanced squad combining explosive hitting, tight bowling, and high tactical flexibility. Expected to finish in the top 2.";
  } else if (finalScore >= 78) {
    verdict = "📈 <b>Playoff Candidates:</b> A strong squad with key match-winners. If they manage to work around their minor weaknesses, a top 4 finish is likely.";
  } else if (finalScore >= 65) {
    verdict = "⚖️ <b>Mid-Table Finishers:</b> A decent squad but lacks depth in key areas. Will need standout individual performances to make the playoffs.";
  } else {
    verdict = "⚠️ <b>Rebuilding Phase:</b> Significant roster imbalances or lack of core wicket-takers/bowlers. Likely to struggle and finish in the bottom tier.";
  }

  return {
    rating: finalScore,
    grade,
    totalBought: count,
    indianCount: count - overseasCount,
    foreignerCount: overseasCount,
    hasWk,
    batCount,
    arCount,
    bowlCount: bowlers,
    avgRating: Math.round(avgRating),
    totalRuns,
    avgSr,
    avgBatAvg,
    totalWickets,
    avgEcon,
    strengths,
    weaknesses,
    verdict
  };
}

// ─── AI Best Playing 11 Selector ──────────────────────────────────────────────
function selectBestPlaying11(players) {
  if (!players || players.length === 0) return { playing11: [], bench: [] };

  const getPlayerVal = p => {
    const bp = Number(p.base_price);
    if (bp >= 2.0) return 95;
    if (bp >= 1.75) return 90;
    if (bp >= 1.5) return 85;
    if (bp >= 1.25) return 80;
    if (bp >= 1.0) return 75;
    if (bp >= 0.75) return 70;
    return 65;
  };

  const pool = [...players].map(p => ({ ...p, ratingVal: getPlayerVal(p) }));
  pool.sort((a, b) => b.ratingVal - a.ratingVal);

  const wks = pool.filter(p => p.role === 'Wicketkeeper');
  const bats = pool.filter(p => p.role === 'Batsman');
  const ars = pool.filter(p => p.role === 'All-Rounder');
  const bowlers = pool.filter(p => p.role === 'Pacer' || p.role === 'Spinner');

  const selected = [];

  // Pick WK
  if (wks.length > 0) selected.push(wks[0]);

  // Pick top 3 Batsmen
  bats.slice(0, 3).forEach(p => selected.push(p));

  // Pick top 2 All-Rounders
  ars.slice(0, 2).forEach(p => selected.push(p));

  // Pick top 3 Bowlers
  bowlers.slice(0, 3).forEach(p => selected.push(p));

  // Fill up to 11
  const remaining = pool.filter(p => !selected.includes(p));
  for (let i = 0; i < remaining.length; i++) {
    if (selected.length >= 11) break;
    selected.push(remaining[i]);
  }

  // Overseas swap check
  let overseas = selected.filter(p => p.nationality !== 'Indian');
  if (overseas.length > 4) {
    overseas.sort((a, b) => a.ratingVal - b.ratingVal);
    const indianBench = pool.filter(p => p.nationality === 'Indian' && !selected.includes(p));
    indianBench.sort((a, b) => b.ratingVal - a.ratingVal);

    const swapsNeeded = overseas.length - 4;
    for (let i = 0; i < swapsNeeded; i++) {
      if (indianBench[i]) {
        const removeIdx = selected.indexOf(overseas[i]);
        if (removeIdx > -1) {
          selected.splice(removeIdx, 1);
          selected.push(indianBench[i]);
        }
      }
    }
  }

  const playing11 = selected;
  const bench = pool.filter(p => !playing11.includes(p));

  return { playing11, bench };
}

// ─── Post-Game View Squad Details ─────────────────────────────────────────────
window.viewEndedTeamDetail = function(teamIdStr) {
  const tid = parseInt(teamIdStr, 10);
  const team = allTeams.find(t => t.team_id === tid);
  if (!team) return;

  document.querySelectorAll('.ended-card').forEach(el => {
    el.classList.toggle('selected', parseInt(el.getAttribute('data-team-id'), 10) === tid);
  });

  const squad = teamSquads[tid] || { players: [] };
  const evaluation = calculateSquadScore(squad);
  const { playing11, bench } = selectBestPlaying11(squad.players);

  document.getElementById('ended-team-detail-empty').style.display = 'none';
  document.getElementById('ended-team-detail').style.display = 'flex';

  document.getElementById('ended-detail-team-name').textContent = team.team_name;
  document.getElementById('ended-detail-team-stats').textContent = 
    `Remaining Budget: ₹${Number(team.remaining_budget).toFixed(2)} Cr | Total Bought: ${evaluation.totalBought} players`;
  
  const gradeEl = document.getElementById('ended-detail-team-grade');
  gradeEl.textContent = evaluation.grade;
  
  if (evaluation.rating >= 80) gradeEl.style.color = 'var(--green-sold)';
  else if (evaluation.rating >= 65) gradeEl.style.color = 'var(--gold)';
  else gradeEl.style.color = '#ef4444';

  document.getElementById('ended-detail-team-rating').textContent = `Rating: ${evaluation.rating}/100`;
  document.getElementById('ended-detail-squad-count').textContent = squad.players.length;

  const rosterContainer = document.getElementById('ended-detail-roster');
  if (squad.players.length === 0) {
    rosterContainer.innerHTML = '<div class="empty-state">No players bought</div>';
  } else {
    rosterContainer.innerHTML = [...squad.players]
      .sort((a,b) => Number(b.bid || b.base_price) - Number(a.bid || a.base_price))
      .map(p => `
        <div class="squad-player-row">
          <span class="squad-player-name">${escapeHtml(p.name)}</span>
          <span class="badge ${roleClass(p.role)}" style="font-size:0.65rem;padding:0.1rem 0.35rem">${escapeHtml(p.role)}</span>
          <span style="font-size:0.75rem">${p.nationality === 'Indian' ? '🇮🇳' : '🌍'}</span>
          <span class="squad-player-price">₹${Number(p.bid || p.base_price).toFixed(2)}Cr</span>
        </div>`).join('');
  }

  const p11Container = document.getElementById('ended-detail-playing11');
  if (playing11.length === 0) {
    p11Container.innerHTML = '<div class="empty-state">Not enough players to form playing 11</div>';
  } else {
    let html = playing11.map((p, idx) => `
      <div class="squad-player-row" style="border-left: 3px solid ${p.nationality !== 'Indian' ? 'var(--purple)' : 'var(--blue-bright)'}; padding-left: 0.5rem">
        <span style="font-family:'Rajdhani',sans-serif;font-weight:700;color:var(--text-secondary);margin-right:0.3rem">${idx + 1}.</span>
        <span class="squad-player-name" style="font-weight:600">${escapeHtml(p.name)}</span>
        <span class="badge ${roleClass(p.role)}" style="font-size:0.62rem;padding:0.05rem 0.3rem">${escapeHtml(p.role)}</span>
        <span>${p.nationality === 'Indian' ? '🇮🇳' : '🌍'}</span>
        <span class="squad-player-price">₹${Number(p.bid || p.base_price).toFixed(2)}Cr</span>
      </div>`).join('');

    if (bench.length > 0) {
      html += `<div style="font-family:'Rajdhani',sans-serif;font-size:0.75rem;text-transform:uppercase;color:var(--text-muted);margin:0.75rem 0 0.25rem">Bench (${bench.length})</div>`;
      html += bench.map(p => `
        <div class="squad-player-row" style="opacity: 0.65">
          <span class="squad-player-name">${escapeHtml(p.name)}</span>
          <span class="badge ${roleClass(p.role)}" style="font-size:0.62rem;padding:0.05rem 0.3rem">${escapeHtml(p.role)}</span>
          <span>${p.nationality === 'Indian' ? '🇮🇳' : '🌍'}</span>
          <span class="squad-player-price">₹${Number(p.bid || p.base_price).toFixed(2)}Cr</span>
        </div>`).join('');
    }
    p11Container.innerHTML = html;
  }

  // Render AI Squad Analysis
  const analysisContainer = document.getElementById('ended-detail-analysis');
  if (!analysisContainer) return;

  if (squad.players.length === 0) {
    analysisContainer.innerHTML = '<div class="empty-state">No squad metrics to analyze.</div>';
  } else {
    const strengthsHtml = evaluation.strengths.map(s => `
      <div style="display:flex;align-items:flex-start;gap:0.4rem;font-size:0.78rem;line-height:1.35;margin-bottom:0.4rem;color:#e2e8f0">
        <span style="color:#4ade80">✓</span>
        <span>${s}</span>
      </div>`).join('');

    const weaknessesHtml = evaluation.weaknesses.map(w => `
      <div style="display:flex;align-items:flex-start;gap:0.4rem;font-size:0.78rem;line-height:1.35;margin-bottom:0.4rem;color:#fca5a5">
        <span style="color:#ef4444">⚠</span>
        <span>${w}</span>
      </div>`).join('');

    analysisContainer.innerHTML = `
      <!-- Stats Summary Grid -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radius-md);padding:0.6rem 0.8rem;display:flex;flex-direction:column;gap:0.35rem;font-size:0.75rem">
        <div class="flex-between">
          <span style="color:var(--text-muted)">Total Runs:</span>
          <span style="font-weight:700;color:var(--text-primary)">${evaluation.totalRuns}</span>
        </div>
        <div class="flex-between">
          <span style="color:var(--text-muted)">Avg Strike Rate:</span>
          <span style="font-weight:700;color:var(--gold)">${evaluation.avgSr > 0 ? evaluation.avgSr.toFixed(1) : '—'}</span>
        </div>
        <div class="flex-between">
          <span style="color:var(--text-muted)">Avg Batting Avg:</span>
          <span style="font-weight:700;color:var(--text-primary)">${evaluation.avgBatAvg > 0 ? evaluation.avgBatAvg.toFixed(1) : '—'}</span>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.05);margin:0.25rem 0"></div>
        <div class="flex-between">
          <span style="color:var(--text-muted)">Total Wickets:</span>
          <span style="font-weight:700;color:var(--text-primary)">${evaluation.totalWickets}</span>
        </div>
        <div class="flex-between">
          <span style="color:var(--text-muted)">Avg Economy:</span>
          <span style="font-weight:700;color:#60a5fa">${evaluation.avgEcon > 0 ? evaluation.avgEcon.toFixed(2) : '—'}</span>
        </div>
      </div>

      <!-- Strengths -->
      <div style="margin-top:0.4rem">
        <div style="font-family:'Rajdhani',sans-serif;font-size:0.72rem;font-weight:700;text-transform:uppercase;color:#4ade80;letter-spacing:0.06em;margin-bottom:0.35rem">Strengths</div>
        ${strengthsHtml}
      </div>

      <!-- Weaknesses -->
      <div>
        <div style="font-family:'Rajdhani',sans-serif;font-size:0.72rem;font-weight:700;text-transform:uppercase;color:#f87171;letter-spacing:0.06em;margin-bottom:0.35rem">Weaknesses</div>
        ${weaknessesHtml}
      </div>

      <!-- AI Verdict -->
      <div style="margin-top:0.4rem;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:var(--radius-md);padding:0.65rem 0.8rem;font-size:0.75rem;line-height:1.4">
        <div style="font-family:'Rajdhani',sans-serif;font-weight:700;text-transform:uppercase;color:#60a5fa;letter-spacing:0.06em;margin-bottom:0.2rem">AI Verdict</div>
        <div style="color:#bfdbfe">${evaluation.verdict}</div>
      </div>
    `;
  }
};

// Auction ended
socket.on('auction_ended', ({ teams, soldList: list }) => {
  document.getElementById('ended-overlay').style.display = 'block';
  document.body.style.overflow = 'hidden';

  // Calculate scores for all teams
  const teamsWithScores = teams.map(t => {
    const squad = teamSquads[t.team_id] || { players: [] };
    const scoreInfo = calculateSquadScore(squad);
    return { ...t, scoreInfo };
  });

  // Rank teams by scoreInfo.rating (descending)
  teamsWithScores.sort((a, b) => b.scoreInfo.rating - a.scoreInfo.rating);

  const teamsContainer = document.getElementById('final-teams');
  teamsContainer.innerHTML = teamsWithScores.map((t, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅';
    return `
      <div class="ended-card" data-team-id="${t.team_id}" onclick="viewEndedTeamDetail('${t.team_id}')">
        <div class="flex-between">
          <span style="font-size:1.3rem;margin-right:0.4rem">${medal}</span>
          <div style="flex:1">
            <div style="font-family:'Rajdhani',sans-serif;font-size:1rem;font-weight:700">${escapeHtml(t.team_name)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">
              ${t.scoreInfo.totalBought} players · Rating: ${t.scoreInfo.rating}/100
            </div>
          </div>
          <div style="font-family:'Rajdhani',sans-serif;font-size:1.3rem;font-weight:700;color:var(--gold)">
            ${t.scoreInfo.grade}
          </div>
        </div>
      </div>`;
  }).join('');

  // Auto-select the 1st ranked team for detail view
  if (teamsWithScores.length > 0) {
    viewEndedTeamDetail(teamsWithScores[0].team_id);
  }
});

// Chat messages
socket.on('receive_message', (data) => addChatMsg(data));

// Connection events
socket.on('connect_error', () => toast('Connection lost — retrying...', 'warning'));
socket.on('reconnect', () => {
  toast('Reconnected!', 'success');
  socket.emit('join_room', { roomId, teamId });
});

// Mobile navigation tab switcher
window.switchMobileTab = function (tab) {
  const layout = document.getElementById('auction-layout');
  if (!layout) return;
  layout.classList.remove('show-left', 'show-center', 'show-right');
  layout.classList.add(`show-${tab}`);

  // Update tabs visual state
  document.querySelectorAll('.mobile-nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.id === `mobile-tab-${tab}`);
  });
};

