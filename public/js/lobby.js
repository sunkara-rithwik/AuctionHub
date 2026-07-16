/**
 * lobby.js — Waiting Lobby Socket Logic
 * Handles real-time team list, host controls, kick, and start auction
 */

// ─── Session ──────────────────────────────────────────────────────────────────
const roomId   = sessionStorage.getItem('ah_room_id');
const teamId   = parseInt(sessionStorage.getItem('ah_team_id'), 10);
const teamName = sessionStorage.getItem('ah_team_name');
const isHost   = sessionStorage.getItem('ah_is_host') === 'true';
const budget   = sessionStorage.getItem('ah_budget');

if (!roomId || !teamId) {
  window.location.href = '/';
}

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

// ─── Utilities ───────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 280);
  }, 3500);
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── UI Init ─────────────────────────────────────────────────────────────────
document.getElementById('room-code-display').textContent = roomId;
document.getElementById('budget-info').textContent = `₹${budget} Cr`;

// Room type badge
const roomTypeBadge = document.getElementById('room-type-badge');
const isPrivate = sessionStorage.getItem('ah_is_host') === 'true'
  ? document.querySelector('#btn-private') !== null  // don't rely on this
  : false;
roomTypeBadge.innerHTML = `<span class="badge badge-blue">🌐 Public</span>`;

// Show host controls vs waiting state
if (isHost) {
  document.getElementById('host-controls').style.display = 'flex';
  document.getElementById('waiting-state').style.display = 'none';
} else {
  document.getElementById('host-controls').style.display = 'none';
  document.getElementById('waiting-state').style.display = 'flex';
}

// ─── Copy room code ───────────────────────────────────────────────────────────
window.copyRoomCode = function () {
  navigator.clipboard.writeText(roomId).then(() => {
    toast(`Room code ${roomId} copied!`, 'success');
    document.getElementById('copy-btn').textContent = '✅ Copied!';
    setTimeout(() => { document.getElementById('copy-btn').innerHTML = '📋 Copy Code'; }, 2000);
  }).catch(() => {
    toast('Could not copy — room code: ' + roomId, 'info');
  });
};

// ─── Socket.io ───────────────────────────────────────────────────────────────
const socket = io();

socket.emit('join_room', { roomId, teamId });

// ─── Room Update ─────────────────────────────────────────────────────────────
socket.on('room_update', ({ teams }) => {
  renderTeams(teams);
  updateStartButton(teams.length);
});

function renderTeams(teams) {
  const list  = document.getElementById('team-list');
  const count = document.getElementById('team-count');
  count.textContent = teams.length;

  if (teams.length === 0) {
    list.innerHTML = '<div class="empty-state">No teams yet</div>';
    return;
  }

  list.innerHTML = teams.map(t => {
    const isMe   = t.team_id === teamId;
    const online = !!t.socket_id;
    const hostBadge = t.is_host ? '<span class="badge badge-gold" style="font-size:0.65rem">HOST</span>' : '';
    const meBadge   = isMe ? '<span class="badge badge-blue" style="font-size:0.65rem">YOU</span>' : '';
    const details = getTeamDetails(t.team_name);

    return `
      <div class="team-row ${t.is_host ? 'host-row' : ''}" style="border-left: 3px solid ${details.color}">
        <div class="flex" style="align-items:center;gap:0.6rem;flex:1;overflow:hidden">
          <div class="team-status-dot ${online ? 'dot-online' : 'dot-offline'}"></div>
          <span style="font-size:1.15rem;margin-right:0.1rem">${details.logo}</span>
          <span class="team-name-display" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${escapeHtml(t.team_name)}
          </span>
          ${hostBadge}${meBadge}
        </div>
        <div class="flex" style="align-items:center;gap:0.5rem">
          <span class="budget-display" style="color:${details.color}">₹${Number(t.remaining_budget).toFixed(0)} Cr</span>
          ${isHost && !t.is_host && !isMe
            ? `<button class="btn btn-danger btn-sm" onclick="kickPlayer(${t.team_id})">Kick</button>`
            : ''}
        </div>
      </div>
    `;
  }).join('');
}

function updateStartButton(teamCount) {
  if (!isHost) return;
  const btn  = document.getElementById('start-btn');
  const hint = document.getElementById('start-hint');

  if (teamCount >= 1) {
    btn.disabled = false;
    hint.textContent = `Ready to start — start when you're set!`;
    hint.style.color = 'var(--green-sold)';
  } else {
    btn.disabled = true;
    hint.textContent = `Need at least 1 team to start`;
    hint.style.color = '';
  }
}

// ─── Kick Player ─────────────────────────────────────────────────────────────
window.kickPlayer = function (targetTeamId) {
  if (!isHost) return;
  socket.emit('kick_player', { roomId, targetTeamId });
};

socket.on('player_kicked', ({ message }) => {
  toast(message, 'error');
  setTimeout(() => { window.location.href = '/'; }, 2500);
});

// ─── Start Auction ────────────────────────────────────────────────────────────
window.startAuction = function () {
  if (!isHost) return;
  const btn = document.getElementById('start-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Starting...';
  socket.emit('start_auction', { roomId });
};

socket.on('auction_started', () => {
  toast('Auction starting!', 'success');
  setTimeout(() => { window.location.href = '/auction.html'; }, 500);
});

// ─── Error ────────────────────────────────────────────────────────────────────
socket.on('error_msg', ({ message }) => {
  toast(message, 'error');
  const btn = document.getElementById('start-btn');
  if (btn) { btn.disabled = false; btn.innerHTML = '🏏 Start Auction'; }
});

// ─── Disconnect Guard ─────────────────────────────────────────────────────────
socket.on('connect_error', () => {
  toast('Connection lost — retrying...', 'warning');
});

