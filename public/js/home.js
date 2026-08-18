/**
 * home.js — Auction Hub Home Page Logic
 * Handles Create Room + Join Room forms and public rooms list
 */

// ─── State ────────────────────────────────────────────────────────────────────
let roomType = 'public';

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

function setLoading(btnId, loading, defaultText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner"></span> Please wait...`
    : defaultText;
}

// ─── Room Type Toggle ─────────────────────────────────────────────────────────
window.setRoomType = function (type) {
  roomType = type;
  document.getElementById('btn-public').classList.toggle('active', type === 'public');
  document.getElementById('btn-private').classList.toggle('active', type === 'private');
};

// ─── Create Room ──────────────────────────────────────────────────────────────
document.getElementById('create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const hostName     = document.getElementById('host-name').value.trim();
  const initialBudget = parseInt(document.getElementById('budget-slider').value, 10);

  if (hostName.length < 2) { toast('Team name must be at least 2 characters', 'warning'); return; }

  setLoading('create-btn', true, '🚀 Create Room');

  try {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName, isPrivate: roomType === 'private', initialBudget }),
    });

    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Failed to create room', 'error'); return; }

    // Store session info
    sessionStorage.setItem('ah_room_id',   data.roomId);
    sessionStorage.setItem('ah_team_id',   data.teamId);
    sessionStorage.setItem('ah_team_name', hostName);
    sessionStorage.setItem('ah_is_host',   'true');
    sessionStorage.setItem('ah_budget',    data.initialBudget);

    toast(`Room ${data.roomId} created!`, 'success');
    setTimeout(() => { window.location.href = '/lobby.html'; }, 600);
  } catch (err) {
    toast('Network error — is the server running?', 'error');
  } finally {
    setLoading('create-btn', false, '🚀 Create Room');
  }
});

// ─── Join Room ────────────────────────────────────────────────────────────────
document.getElementById('join-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const teamName = document.getElementById('team-name').value.trim();
  const roomCode = document.getElementById('room-code').value.trim().toUpperCase();

  if (teamName.length < 2) { toast('Team name must be at least 2 characters', 'warning'); return; }
  if (roomCode.length !== 6) { toast('Room code must be exactly 6 characters', 'warning'); return; }

  setLoading('join-btn', true, '🏏 Join Auction');

  try {
    const res = await fetch(`/api/rooms/${roomCode}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName }),
    });

    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Failed to join room', 'error'); return; }

    sessionStorage.setItem('ah_room_id',   data.roomId);
    sessionStorage.setItem('ah_team_id',   data.teamId);
    sessionStorage.setItem('ah_team_name', teamName);
    sessionStorage.setItem('ah_is_host',   'false');
    sessionStorage.setItem('ah_budget',    data.initialBudget);

    toast(`Joined room ${data.roomId}!`, 'success');
    setTimeout(() => { window.location.href = '/lobby.html'; }, 600);
  } catch (err) {
    toast('Network error — is the server running?', 'error');
  } finally {
    setLoading('join-btn', false, '🏏 Join Auction');
  }
});

// ─── Public Rooms ─────────────────────────────────────────────────────────────
async function loadPublicRooms() {
  const container = document.getElementById('public-rooms-list');
  try {
    const res = await fetch('/api/rooms/public');
    const data = await res.json();
    const rooms = data.rooms || [];

    if (rooms.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:0.75rem">No public rooms yet — create one!</div>';
      return;
    }

    container.innerHTML = rooms.map(r => `
      <div class="room-card" onclick="quickJoin('${r.room_id}')">
        <div class="room-card-name">🏏 ${escapeHtml(r.host_name)}'s Room</div>
        <div class="room-card-meta">
          <span class="badge badge-blue">${r.room_id}</span>
          <span>${r.team_count || 0} teams</span>
          <span>₹${r.initial_budget} Cr</span>
        </div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<div class="empty-state" style="padding:0.75rem;color:var(--text-muted)">Could not load rooms</div>';
  }
}

window.quickJoin = function (roomId) {
  document.getElementById('room-code').value = roomId;
  document.getElementById('team-name').focus();
  document.getElementById('join-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Auto-uppercase room code input
document.getElementById('room-code').addEventListener('input', function () {
  this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

// Load rooms on page load
loadPublicRooms();
setInterval(loadPublicRooms, 8000); // Refresh every 8s
