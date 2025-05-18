const supabase = Supabase.createClient('https://yxdnyavcxouutwkvdoef.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZG55YXZjeG91dXR3a3Zkb2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNjE0MDQsImV4cCI6MjA2MjYzNzQwNH0.y07v2koScA07iztFr366pB5f5n5UCCzc_Agn228dujI');
let userId = null;
const commandsChannel = supabase.channel('commands');

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const status = document.getElementById('status');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        userId = data.user.id;
        document.getElementById('auth').style.display = 'none';
        document.getElementById('controls').style.display = 'block';
        status.textContent = 'Logged in successfully!';
        
        commandsChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Subscribed to commands channel');
            }
        });
    } catch (error) {
        status.textContent = `Login failed: ${error.message}`;
    }
}

async function sendCommand(type, params = {}) {
    if (!userId) {
        document.getElementById('status').textContent = 'Please login first';
        return;
    }

    const payload = {
        event: 'command',
        user_id: userId,
        type,
        ...params
    };

    try {
        await commandsChannel.send({
            type: 'broadcast',
            event: 'command',
            payload
        });
        document.getElementById('status').textContent = `Sent command: ${type}`;
    } catch (error) {
        document.getElementById('status').textContent = `Error sending command: ${error.message}`;
    }
}

async function logout() {
    try {
        await supabase.auth.signOut();
        userId = null;
        document.getElementById('auth').style.display = 'block';
        document.getElementById('controls').style.display = 'none';
        document.getElementById('status').textContent = 'Logged out';
    } catch (error) {
        document.getElementById('status').textContent = `Logout failed: ${error.message}`;
    }
}
