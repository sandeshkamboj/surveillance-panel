import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Initialize Supabase client
const supabaseUrl = 'https://yxdnyavcxouutwkvdoef.supabase.co';
const supabaseKey = 'your-supabase-anon-key'; // Replace with your anon key
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Supabase initialized');

// Login function
async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) {
            throw new Error(error.message);
        }
        console.log('Login successful:', data);
        document.getElementById('login-section').classList.add('d-none');
        document.getElementById('commands-section').classList.remove('d-none');
        document.getElementById('error-message').textContent = '';
    } catch (error) {
        console.error('Login failed:', error);
        document.getElementById('error-message').textContent = `Login failed: ${error.message}`;
    }
}

// Send command to Supabase Realtime
async function sendCommand(commandType) {
    try {
        const user = supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { error } = await supabase
            .from('commands')
            .insert({ user_id: (await user).data.user.id, type: commandType });
        if (error) throw new Error(error.message);
        console.log(`Command sent: ${commandType}`);
    } catch (error) {
        console.error('Command failed:', error);
        document.getElementById('error-message').textContent = `Command failed: ${error.message}`;
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
    document.getElementById('login-section').classList.remove('d-none');
    document.getElementById('commands-section').classList.add('d-none');
    document.getElementById('error-message').textContent = 'Logged out';
});

['capturePhoto', 'recordVideo', 'recordAudio', 'getLocation', 'ring', 'vibrate'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => sendCommand(id));
});
