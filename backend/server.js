require('dotenv').config(); // Loads environment variables from .env file
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch').default;
const app = express();

// --- ADDED THIS ---
// Import Google Sheets library
const { google } = require('googleapis');
// ------------------

app.use(cors()); // Allows frontend to connect
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Your API keys from environment variables (hidden!)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HF_API_TOKEN = process.env.HF_API_TOKEN;

// --- ADDED THIS (AND YOUR SECRETS) ---
// --- Google Sheets Configuration ---

// This is the "Secret #1" you saved from Phase 1.
// Paste the long ID from your sheet's URL between the quotes.
const SPREADSHEET_ID = '1ap8KeOPTkt6Ixc7J9iMeY_K54V2KiGKCOYYowkMD9jY'; // 👈 PASTE YOUR ID

// This tells Google to find the "Secret #2" file you added in Step 6.
const GOOGLE_CREDS_PATH = './google-creds.json';

// This sets up the authentication
const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_CREDS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
// ------------------------------------

// --- MODIFIED THIS ---
// --- Helper function for logging to Google Sheets ---
async function writeToLog(model, userMessage, aiResponse) {
    const timestamp = new Date().toISOString();
    
    // Format the user message (extracting the last part)
    const userText = (model.startsWith('HF')) 
        ? userMessage.content 
        : userMessage.parts[0].text;
    
    // Format the AI response (extracting just the text)
    const aiText = (model.startsWith('HF'))
        ? aiResponse.choices?.[0]?.message?.content
        : aiResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    // This is the data that will become a new row in your sheet
    // It matches the columns we created in Step 1
    const newRow = [
        timestamp,
        model,
        userText || 'No text content found.',
        aiText || 'No text content found.'
    ];

    try {
        // This command appends the new row to your sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:D', // This means "use columns A, B, C, and D"
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [newRow],
            },
        });
        console.log('Successfully logged to Google Sheet!'); // Good for debugging
    } catch (err) {
        // This will show an error in your VS Code terminal if it fails
        console.error('Failed to write to Google Sheet:', err);
    }
}
// ------------------------------------


// Endpoint for Gemini API
app.post('/api/gemini', async (req, res) => {
  const { contents } = req.body;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });
    const data = await response.json();
    console.log('Gemini Raw Response:', JSON.stringify(data, null, 2));

    // --- MODIFIED THIS ---
    // This tells our new function to run *after* we get a response
    // We don't use 'await' so the user doesn't have to wait for the log
    writeToLog('GEMINI', req.body.contents[req.body.contents.length - 1], data);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for Hugging Face API
app.post('/api/huggingface', async (req, res) => {
  const { messages, model } = req.body;
  const url = 'https://router.huggingface.co/v1/chat/completions';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages, model })
    });
    const data = await response.json();
    console.log('HuggingFace Raw Response:', JSON.stringify(data, null, 2));

    // --- MODIFIED THIS ---
    // This also tells our new function to run
    writeToLog(`HF/${req.body.model}`, req.body.messages[req.body.messages.length - 1], data);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});