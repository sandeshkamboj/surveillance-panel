const supabase = Supabase.createClient(
    'https://yxdnyavcxouutwkvdoef.supabase.co',
    'your-actual-supabase-anon-key'
);

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        document.getElementById('login').style.display = 'none';
        document.getElementById('panel').style.display = 'block';
    } else {
        document.getElementById('login').style.display = 'block';
        document.getElementById('panel').style.display = 'none';
    }
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        document.getElementById('error').innerText = error.message;
    } else {
        checkSession();
    }
}

async function logout() {
    await supabase.auth.signOut();
    checkSession();
}

async function sendCommand(type, params = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const command = { type, params };
    await supabase.from('commands').insert(command);
}

async function getLocation() {
    const { data, error } = await supabase
        .from('locations')
        .select('latitude, longitude, timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);
    if (error) {
        document.getElementById('location').innerText = 'Error fetching location';
    } else if (data.length > 0) {
        const { latitude, longitude, timestamp } = data[0];
        document.getElementById('location').innerText = `Latitude: ${latitude}, Longitude: ${longitude}, Time: ${new Date(timestamp).toLocaleString()}`;
    }
}

async function listFiles() {
    const { data, error } = await supabase.from('files').select('files');
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';
    if (error || !data) {
        fileList.innerText = 'Error fetching files';
        return;
    }
    const files = data[0]?.files || [];
    files.forEach(file => {
        const div = document.createElement('div');
        div.innerText = file;
        fileList.appendChild(div);
    });
}

checkSession();
