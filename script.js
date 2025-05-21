import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://yxdnyavcxouutwkvdoef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZG55YXZjeG91dXR3a3Zkb2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNjE0MDQsImV4cCI6MjA2MjYzNzQwNH0.y07v2koScA07iztFr366pB5f5n5UCCzc_Agn228dujI';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 10 } }
});
console.log('Supabase initialized');

let session = null;

// UI Helpers
function showLoading(buttonId, show) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    const spinner = btn.querySelector('.spinner-border');
    const text = btn.querySelector('span:not(.spinner-border)');
    if (show) {
        btn.disabled = true;
        if (spinner) spinner.classList.remove('d-none');
        if (text) text.classList.add('d-none');
    } else {
        btn.disabled = false;
        if (spinner) spinner.classList.add('d-none');
        if (text) text.classList.remove('d-none');
    }
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
}

function hideError() {
    document.getElementById('error-message').textContent = '';
}

function showSection(sectionId) {
    document.getElementById('login-section').classList.add('d-none');
    document.getElementById('commands-section').classList.add('d-none');
    document.getElementById(sectionId).classList.remove('d-none');
}

// Authentication
async function login(email, password) {
    showLoading('login', true);
    hideError();
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        session = data.session;
        showSection('commands-section');
        await loadFiles();
        await loadLastLocation();
    } catch (error) {
        showError('Login failed: ' + (error.message || error));
        document.getElementById('retry-login').classList.remove('d-none');
    } finally {
        showLoading('login', false);
    }
}

async function logout() {
    showLoading('logout', true);
    try {
        await supabase.auth.signOut();
        session = null;
        showSection('login-section');
    } catch (error) {
        showError('Logout failed: ' + (error.message || error));
    } finally {
        showLoading('logout', false);
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    await login(email, password);
});

document.getElementById('retry-login').addEventListener('click', () => {
    document.getElementById('retry-login').classList.add('d-none');
    hideError();
});

document.getElementById('logout').addEventListener('click', logout);

// Command Validation
function validateCommandOptions(type, options) {
    // Add any custom validation logic here, e.g. for durations/params
    return true;
}

// COMMANDS
async function sendCommand(type, options = {}) {
    showLoading(type === 'batchLocations' ? 'batchLocations' : type, true);
    try {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user.user) throw new Error('Not authenticated');
        if (!validateCommandOptions(type, options)) throw new Error('Invalid command options');
        const command = { user_id: user.user.id, type, options };
        const { error } = await supabase.from('commands').insert(command);
        if (error) throw new Error(error.message);
        console.log(`Command sent: ${type}`, options);
        if (type === 'getLocation') await loadLastLocation();
    } catch (error) {
        console.error('Command failed:', error);
        showError(`Command failed: ${error.message}`);
    } finally {
        showLoading(type === 'batchLocations' ? 'batchLocations' : type, false);
    }
}

// Command Button Event Listeners
document.getElementById('capturePhoto').addEventListener('click', async () => {
    const camera = document.getElementById('photo-camera').value;
    const flash = document.getElementById('photo-flash').value;
    await sendCommand('capturePhoto', { camera, flash });
});

document.getElementById('recordVideo').addEventListener('click', async () => {
    const camera = document.getElementById('video-camera').value;
    const quality = document.getElementById('video-quality').value;
    const duration = parseInt(document.getElementById('video-duration').value, 10);
    await sendCommand('recordVideo', { camera, quality, duration });
});

document.getElementById('recordAudio').addEventListener('click', async () => {
    const duration = parseInt(document.getElementById('audio-duration').value, 10);
    await sendCommand('recordAudio', { duration });
});

document.getElementById('getLocation').addEventListener('click', async () => {
    await sendCommand('getLocation');
});

document.getElementById('batchLocations').addEventListener('click', async () => {
    await sendCommand('batchLocations');
});

document.getElementById('ring').addEventListener('click', async () => {
    await sendCommand('ring', { duration: 5 });
});

document.getElementById('vibrate').addEventListener('click', async () => {
    await sendCommand('vibrate', { duration: 1 });
});

// FILES
async function loadFiles(page = 1, perPage = 10, type = '', dateStart = '', dateEnd = '') {
    document.getElementById('files-loading').classList.remove('d-none');
    document.getElementById('files-error').classList.add('d-none');
    try {
        let query = supabase.from('files').select('*', { count: 'exact' });
        if (type) query = query.eq('type', type);
        if (dateStart) query = query.gte('created_at', dateStart);
        if (dateEnd) query = query.lte('created_at', dateEnd + 'T23:59:59');
        query = query.order('created_at', { ascending: false })
            .range((page - 1) * perPage, page * perPage - 1);

        const { data, count, error } = await query;
        if (error) throw error;

        renderFilesTable(data || []);
        renderFilesPagination(count || 0, page, perPage);
    } catch (error) {
        document.getElementById('files-error').classList.remove('d-none');
        document.getElementById('files-error').textContent = error.message;
    } finally {
        document.getElementById('files-loading').classList.add('d-none');
    }
}

function renderFilesTable(files) {
    const tbody = document.getElementById('files-table');
    tbody.innerHTML = '';
    for (const file of files) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${file.type}</td>
            <td>${getFilePreview(file)}</td>
            <td>${file.path}</td>
            <td>
                <a href="${file.url}" target="_blank" class="btn btn-sm btn-primary">Download</a>
                <button class="btn btn-sm btn-danger delete-file" data-id="${file.id}">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
    // Delete file listeners
    document.querySelectorAll('.delete-file').forEach(btn => {
        btn.addEventListener('click', () => showDeleteModal(btn.dataset.id));
    });
}

function getFilePreview(file) {
    if (file.type === 'photo') {
        return `<img src="${file.url}" alt="photo" style="width:48px;height:48px;object-fit:cover;">`;
    }
    if (file.type === 'video') {
        return `<video src="${file.url}" style="width:48px;height:48px;object-fit:cover;" muted></video>`;
    }
    if (file.type === 'audio') {
        return `<audio src="${file.url}" controls style="width:100px;"></audio>`;
    }
    return `<span class="text-muted">-</span>`;
}

function renderFilesPagination(count, page, perPage) {
    const pagination = document.getElementById('files-pagination');
    pagination.innerHTML = '';
    const totalPages = Math.ceil(count / perPage);
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item${i === page ? ' active' : ''}`;
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = i;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const type = document.getElementById('file-type-filter').value;
            const dateStart = document.getElementById('file-date-start').value;
            const dateEnd = document.getElementById('file-date-end').value;
            loadFiles(i, parseInt(document.getElementById('files-per-page').value, 10), type, dateStart, dateEnd);
        });
        li.appendChild(a);
        pagination.appendChild(li);
    }
}

// File filters and per page listeners
document.getElementById('file-type-filter').addEventListener('change', () => {
    loadFiles(1, parseInt(document.getElementById('files-per-page').value, 10), document.getElementById('file-type-filter').value, document.getElementById('file-date-start').value, document.getElementById('file-date-end').value);
});
document.getElementById('file-date-start').addEventListener('change', () => {
    loadFiles(1, parseInt(document.getElementById('files-per-page').value, 10), document.getElementById('file-type-filter').value, document.getElementById('file-date-start').value, document.getElementById('file-date-end').value);
});
document.getElementById('file-date-end').addEventListener('change', () => {
    loadFiles(1, parseInt(document.getElementById('files-per-page').value, 10), document.getElementById('file-type-filter').value, document.getElementById('file-date-start').value, document.getElementById('file-date-end').value);
});
document.getElementById('files-per-page').addEventListener('change', () => {
    loadFiles(1, parseInt(document.getElementById('files-per-page').value, 10), document.getElementById('file-type-filter').value, document.getElementById('file-date-start').value, document.getElementById('file-date-end').value);
});
document.getElementById('retry-files').addEventListener('click', () => {
    loadFiles();
});

// Deleting Files
let fileToDelete = null;
function showDeleteModal(id) {
    fileToDelete = id;
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    modal.show();
}
document.getElementById('confirmDelete').addEventListener('click', async () => {
    if (!fileToDelete) return;
    try {
        await supabase.from('files').delete().eq('id', fileToDelete);
        loadFiles();
    } catch (error) {
        alert('Failed to delete file: ' + error.message);
    }
    fileToDelete = null;
    bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
});

// LOCATION
let map = null;
let markers = [];
async function loadLastLocation() {
    document.getElementById('location-loading').classList.remove('d-none');
    document.getElementById('location-error').classList.add('d-none');
    try {
        const { data, error } = await supabase.from('locations').select('*').order('created_at', { ascending: false }).limit(1);
        if (error) throw error;
        if (!data || data.length === 0) {
            document.getElementById('location-data').textContent = 'No location data.';
            return;
        }
        const loc = data[0];
        document.getElementById('location-data').textContent = `Last known location: Lat ${loc.latitude}, Lng ${loc.longitude} @ ${new Date(loc.created_at).toLocaleString()}`;
        showMap([loc]);
    } catch (error) {
        document.getElementById('location-error').classList.remove('d-none');
        document.getElementById('location-error').textContent = error.message;
    } finally {
        document.getElementById('location-loading').classList.add('d-none');
    }
}

async function loadAllLocations() {
    document.getElementById('location-loading').classList.remove('d-none');
    document.getElementById('location-error').classList.add('d-none');
    try {
        const { data, error } = await supabase.from('locations').select('*').order('created_at', { ascending: false }).limit(500);
        if (error) throw error;
        if (!data || data.length === 0) {
            document.getElementById('location-data').textContent = 'No location data.';
            return;
        }
        document.getElementById('location-data').textContent = `Showing ${data.length} locations.`;
        showMap(data);
    } catch (error) {
        document.getElementById('location-error').classList.remove('d-none');
        document.getElementById('location-error').textContent = error.message;
    } finally {
        document.getElementById('location-loading').classList.add('d-none');
    }
}

function showMap(locations) {
    if (!map) {
        map = L.map('location-map').setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    if (locations.length > 0) {
        const latlngs = locations.map(l => [l.latitude, l.longitude]);
        latlngs.forEach(ll => {
            const marker = L.marker(ll).addTo(map);
            markers.push(marker);
        });
        map.fitBounds(latlngs, { maxZoom: 16 });
    }
}

// Toggle location view
let showingAllLocations = false;
document.getElementById('toggle-location-view').addEventListener('click', async () => {
    if (!showingAllLocations) {
        await loadAllLocations();
        document.getElementById('toggle-location-view').textContent = 'Show Last Location';
        showingAllLocations = true;
    } else {
        await loadLastLocation();
        document.getElementById('toggle-location-view').textContent = 'Show All Locations';
        showingAllLocations = false;
    }
});
document.getElementById('retry-location').addEventListener('click', () => {
    if (showingAllLocations) {
        loadAllLocations();
    } else {
        loadLastLocation();
    }
});

// On page load, check if already logged in
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession) {
        session = currentSession;
        showSection('commands-section');
        await loadFiles();
        await loadLastLocation();
    } else {
        showSection('login-section');
    }
});
