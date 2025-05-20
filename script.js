import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://yxdnyavcxouutwkvdoef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZG55YXZjeG91dXR3a3Zkb2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNjE0MDQsImV4cCI6MjA2MjYzNzQwNH0.y07v2koScA07iztFr366pB5f5n5UCCzc_Agn228dujI';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 10 } }
});
console.log('Supabase initialized');

// ... (rest of your variables and functions) ...

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

        // === FCM Integration START ===
        // 1. Get the device's FCM token from Supabase
        const { data: fcmTokenRows, error: fcmError } = await supabase
            .from('fcm_tokens')
            .select('token')
            .eq('user_id', user.user.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (fcmError) {
            console.error('Error fetching FCM token:', fcmError.message);
        } else if (fcmTokenRows && fcmTokenRows.length > 0) {
            const device_token = fcmTokenRows[0].token;
            // 2. Call the Supabase Edge Function to send FCM
            const edgeFunctionURL = `${supabaseUrl.replace('.co', '.co/functions/v1/send_fcm')}`;
            const response = await fetch(edgeFunctionURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_token, command: type, options })
            });
            const fcmResult = await response.json();
            if (response.ok) {
                console.log('FCM push sent:', fcmResult);
            } else {
                console.error('FCM push failed:', fcmResult);
            }
        } else {
            console.warn('No FCM token found for user/device.');
        }
        // === FCM Integration END ===

    } catch (error) {
        console.error('Command failed:', error);
        document.getElementById('error-message').textContent = `Command failed: ${error.message}`;
    } finally {
        showLoading(type === 'batchLocations' ? 'batchLocations' : type, false);
    }
}

// ... (rest of your script.js unchanged) ...
