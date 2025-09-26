const { google } = require('googleapis');
const open = require('open');
const readline = require('readline');
require('dotenv').config();


// ✅ Replace these with your real credentials from Google Cloud Console
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback'; // This must match Google Console

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Request access to Google Drive (only file-level access)
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',      // 👈 Required for refresh token
    scope: SCOPES,
    prompt: 'consent'            // 👈 Ensures refresh token is returned
});

console.log('\n🔗 Open this URL in your browser to authorize:\n\n', authUrl, '\n');

open(authUrl); // Opens browser automatically

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('📥 Paste the code from the browser here: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\n✅ Your Refresh Token:\n\n', tokens.refresh_token, '\n');
        rl.close();
    } catch (err) {
        console.error('❌ Error fetching token:', err.message);
        rl.close();
    }
});
