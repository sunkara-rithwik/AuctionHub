/**
 * home.js — Auction Hub Home Page Logic
 * Handles Create Room + Join Room forms and public rooms list
 */

// ─── State ────────────────────────────────────────────────────────────────────
let roomType        = 'public';
let specialRoomType = 'public';
let parsedExcelItems = null;

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

// ─── Room Type Toggles ────────────────────────────────────────────────────────
window.setRoomType = function (type) {
  roomType = type;
  document.getElementById('btn-public').classList.toggle('active', type === 'public');
  document.getElementById('btn-private').classList.toggle('active', type === 'private');
};

window.setSpecialRoomType = function (type) {
  specialRoomType = type;
  document.getElementById('btn-special-public').classList.toggle('active', type === 'public');
  document.getElementById('btn-special-private').classList.toggle('active', type === 'private');
};

// ─── Excel File Selection & Preview ──────────────────────────────────────────
window.handleExcelSelect = async function (e) {
  const file = e.target.files[0];
  if (!file) {
    parsedExcelItems = null;
    document.getElementById('excel-preview-box').style.display = 'none';
    return;
  }

  const previewBox = document.getElementById('excel-preview-box');
  const statusText = document.getElementById('excel-status-text');
  const countBadge = document.getElementById('excel-count-badge');
  const listEl     = document.getElementById('excel-items-preview-list');

  previewBox.style.display = 'block';
  statusText.style.color   = 'var(--gold)';
  statusText.textContent   = '⏳ Processing file...';

  // Client-side parsing if XLSX library available
  if (typeof XLSX !== 'undefined') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook    = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName   = workbook.SheetNames[0];
      const sheet       = workbook.Sheets[sheetName];
      const rawRows     = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) throw new Error('Excel sheet is empty');

      const sample = rawRows[0];
      const keys   = Object.keys(sample);

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

      if (items.length === 0) throw new Error('No valid items found (need columns: name, base price, category)');

      parsedExcelItems = items;
      const categories = [...new Set(items.map(i => i.category))];

      statusText.style.color = 'var(--green-sold)';
      statusText.textContent = `✅ Validated (${categories.length} categories)`;
      countBadge.textContent = `${items.length} items`;

      listEl.innerHTML = items.slice(0, 5).map(i => `
        <div style="display:flex;justify-content:space-between;padding:0.15rem 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span><b>${escapeHtml(i.name)}</b></span>
          <span>₹${i.base_price.toFixed(2)} Cr · <span class="badge badge-purple" style="font-size:0.6rem;padding:0 0.3rem">${escapeHtml(i.category)}</span></span>
        </div>
      `).join('') + (items.length > 5 ? `<div style="text-align:center;margin-top:0.2rem;color:var(--text-muted)">+ ${items.length - 5} more items</div>` : '');
      return;
    } catch (err) {
      console.warn('Client-side XLSX parse error, falling back to server API:', err);
    }
  }

  // Server API parsing fallback
  try {
    const formData = new FormData();
    formData.append('excelFile', file);
    const res  = await fetch('/api/parse-excel', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to parse file');

    parsedExcelItems = data.items;
    statusText.style.color = 'var(--green-sold)';
    statusText.textContent = `✅ ${data.count} items detected`;
    countBadge.textContent = `${data.count} items`;
    listEl.innerHTML = (data.preview || []).slice(0, 5).map(i => `
      <div style="display:flex;justify-content:space-between;padding:0.15rem 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span><b>${escapeHtml(i.name)}</b></span>
        <span>₹${Number(i.base_price).toFixed(2)} Cr · <span class="badge badge-purple" style="font-size:0.6rem;padding:0 0.3rem">${escapeHtml(i.category)}</span></span>
      </div>
    `).join('');
  } catch (err) {
    parsedExcelItems = null;
    statusText.style.color = 'var(--red-bid)';
    statusText.textContent = '❌ ' + err.message;
    countBadge.textContent = 'Error';
    listEl.innerHTML = '';
  }
};

// ─── Create Standard IPL Room ─────────────────────────────────────────────────
document.getElementById('create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const hostName      = document.getElementById('host-name').value.trim();
  const initialBudget = parseInt(document.getElementById('budget-slider').value, 10);

  if (hostName.length < 2) { toast('Team name must be at least 2 characters', 'warning'); return; }

  setLoading('create-btn', true, '🚀 Create Room');

  try {
    const formData = new FormData();
    formData.append('hostName', hostName);
    formData.append('isPrivate', roomType === 'private');
    formData.append('initialBudget', initialBudget);
    formData.append('mode', 'standard');

    const res = await fetch('/api/rooms', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Failed to create room', 'error'); return; }

    sessionStorage.setItem('ah_room_id',   data.roomId);
    sessionStorage.setItem('ah_team_id',   data.teamId);
    sessionStorage.setItem('ah_team_name', hostName);
    sessionStorage.setItem('ah_is_host',   'true');
    sessionStorage.setItem('ah_budget',    data.initialBudget);
    sessionStorage.setItem('ah_mode',      'standard');

    toast(`IPL Room ${data.roomId} created!`, 'success');
    setTimeout(() => { window.location.href = '/lobby.html'; }, 600);
  } catch (err) {
    toast('Network error — is the server running?', 'error');
  } finally {
    setLoading('create-btn', false, '🚀 Create Room');
  }
});

// ─── Create Special Auction (Self Auction) Room ──────────────────────────────
const specialForm = document.getElementById('special-form');
if (specialForm) {
  specialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hostName      = document.getElementById('special-host-name').value.trim();
    const initialBudget = parseInt(document.getElementById('special-budget-slider').value, 10);
    const fileInput     = document.getElementById('excel-file-input');

    if (hostName.length < 2) { toast('Team name must be at least 2 characters', 'warning'); return; }

    if (!parsedExcelItems || parsedExcelItems.length === 0) {
      if (!fileInput || !fileInput.files[0]) {
        toast('Please upload an Excel sheet for Special Auction mode!', 'warning');
        return;
      }
    }

    setLoading('special-create-btn', true, '⭐ Create Special Auction');

    try {
      const formData = new FormData();
      formData.append('hostName', hostName);
      formData.append('isPrivate', specialRoomType === 'private');
      formData.append('initialBudget', initialBudget);
      formData.append('mode', 'special');

      if (fileInput && fileInput.files[0]) {
        formData.append('excelFile', fileInput.files[0]);
      } else if (parsedExcelItems) {
        formData.append('customPlayers', JSON.stringify(parsedExcelItems));
      }

      const res = await fetch('/api/rooms', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { toast(data.error || 'Failed to create room', 'error'); return; }

      sessionStorage.setItem('ah_room_id',    data.roomId);
      sessionStorage.setItem('ah_team_id',    data.teamId);
      sessionStorage.setItem('ah_team_name',  hostName);
      sessionStorage.setItem('ah_is_host',    'true');
      sessionStorage.setItem('ah_budget',     data.initialBudget);
      sessionStorage.setItem('ah_mode',       'special');
      sessionStorage.setItem('ah_item_count', data.itemCount || '');

      toast(`Special Auction ${data.roomId} created!`, 'success');
      setTimeout(() => { window.location.href = '/lobby.html'; }, 600);
    } catch (err) {
      toast('Network error — is the server running?', 'error');
    } finally {
      setLoading('special-create-btn', false, '⭐ Create Special Auction (Self Auction)');
    }
  });
}

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
