require('dotenv').config(); // Loads environment variables from .env file
const express = require('express');
const cors = require('cors');
//const fetch = require('node-fetch'); // We'll install this next
const fetch = require('node-fetch').default; // Added
const app = express();
app.use(cors()); // Allows frontend to connect
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Your API keys from environment variables (hidden!)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HF_API_TOKEN = process.env.HF_API_TOKEN;

// Endpoint for Gemini API
app.post('/api/gemini', async (req, res) => {
  const { contents } = req.body; // Get data from frontend
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });
    const data = await response.json();
    console.log('Gemini Raw Response:', JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for Hugging Face API
app.post('/api/huggingface', async (req, res) => {
  const { messages, model } = req.body; // Get data from frontend
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