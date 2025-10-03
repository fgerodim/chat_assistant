/**
 * script.js (refactored)
 * Adds CEFR + corpus integration AND externalized role/scope via promptConfig.js
 */

import { systemPrompt } from "./professionalPrompt.js";

// --- API Keys & Configuration ---
// SECURITY NOTE: In production, never expose keys client-side.

// --- API Endpoints ---
// This is the address of your live backend server on Render!
const RENDER_SERVER_URL = "https://chat-assistant-txqb.onrender.com"; 

// Your frontend now sends ALL requests to your own server, which handles the keys securely.
const HF_API_URL = `${RENDER_SERVER_URL}/api/huggingface`;
const HF_MODEL_ID = "openai/gpt-oss-20b:nebius"; // Keep the model ID
const GEMINI_API_URL = `${RENDER_SERVER_URL}/api/gemini`;

//const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";
//const HF_MODEL_ID = "openai/gpt-oss-20b:nebius";
//const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

// --- HTML Elements ---
const messagesDiv = document.getElementById('messages');
const promptInput = document.getElementById('prompt-input');
const sendBtn = document.getElementById('send-btn');
const thinkingMessage = document.getElementById('thinking-message');
const llmSelector = document.getElementById('llm-selector');
const cefrSelector = document.getElementById('cefr-level');
const corpusInput = document.getElementById('corpus-file-input');
const downloadBtn = document.getElementById('download-btn'); 

// --- Conversation Histories ---
let hfConversationHistory = [];
let geminiConversationHistory = [];

// --- State for CEFR + Corpus ---
let currentCEFR = cefrSelector.value;
let corpusText = "";

// --- State for Download ---
let lastAssistantResponse = "";

// --- Helper: Display messages ---
function displayMessage(text, isUser = false) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('p-3', 'rounded-lg', 'max-w-xs', 'shadow-md');
    messageEl.textContent = text;

    if (isUser) {
        messageEl.classList.add('bg-gray-200', 'text-gray-800', 'self-end');
    } else {
        messageEl.classList.add('bg-blue-500', 'text-white', 'self-start', 'assistant-response'); // Added class
    }

    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// --- Helper: Reset Chat State ---
function resetChat() {
    messagesDiv.innerHTML = '';
    hfConversationHistory = [];
    geminiConversationHistory = [];
    displayMessage(`Chat reset. Using the ${llmSelector.value.toUpperCase()} model.`);
    promptInput.focus();
}

// --- Helper: Build augmented prompt ---
function buildAugmentedPrompt(userInput) {
    let prefix = `Target CEFR Level: ${currentCEFR}.`;
    if (corpusText) {
        prefix += ` Use the following corpus as context:\n---\n${corpusText}\n---\n`;
    }
    return `${prefix}\nUser Request: ${userInput}`;
}
// --- Helper: Download Last Response ---
function downloadLastResponse() {
    if (!lastAssistantResponse) {
        alert("There is no response to download!");
        return;
    }

    const filename = "assistant_response.txt";
    // 1. Create a Blob object from the text string
    const blob = new Blob([lastAssistantResponse], { type: 'text/plain;charset=utf-8' });
    
    // 2. Create a temporary anchor element
    const a = document.createElement('a');
    
    // 3. Create a URL for the Blob and set it as the link's href
    const url = URL.createObjectURL(blob);
    a.href = url;
    
    // 4. Set the download attribute with the desired filename
    a.download = filename;
    
    // 5. Simulate a click to trigger the download
    document.body.appendChild(a);
    a.click();
    
    // 6. Clean up: remove the element and revoke the temporary URL
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
// -----------------------------------------------------------
// Gemini Connector
// -----------------------------------------------------------
async function getGeminiCompletion(history) {
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: history })
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Gemini backend error: ${errorBody.error}`);
  }

  const result = await response.json();
  return result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

// -----------------------------------------------------------
// Hugging Face Connector
// -----------------------------------------------------------
async function getHuggingFaceCompletion(messages) {
  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model: HF_MODEL_ID })
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`HF backend error: ${errorBody.error}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content?.trim() || "";
}

// -----------------------------------------------------------
// Main Handler
// -----------------------------------------------------------
async function sendMessage() {
    const userInput = promptInput.value.trim();
    if (!userInput) return;

    const augmentedPrompt = buildAugmentedPrompt(userInput);

    // UI updates
    displayMessage(userInput, true);

    promptInput.value = '';
    thinkingMessage.classList.remove('hidden');
    promptInput.disabled = true;
    sendBtn.disabled = true;

    const selectedLLM = llmSelector.value;
    let aiResponseText = "";

    try {
        if (selectedLLM === 'gemini') {
            if (geminiConversationHistory.length === 0) {
                geminiConversationHistory.push({
                    role: "user",
                    parts: [{ text: systemPrompt }]
                });
            }
            geminiConversationHistory.push({ role: "user", parts: [{ text: augmentedPrompt }] });
            aiResponseText = await getGeminiCompletion(geminiConversationHistory);
            geminiConversationHistory.push({ role: "model", parts: [{ text: aiResponseText }] });
        } else {
            if (hfConversationHistory.length === 0) {
                hfConversationHistory.push({ role: "system", content: systemPrompt });
            }
            hfConversationHistory.push({ role: "user", content: augmentedPrompt });
            aiResponseText = await getHuggingFaceCompletion(hfConversationHistory);
            hfConversationHistory.push({ role: "assistant", content: aiResponseText });
        }

        displayMessage(aiResponseText);
        // --- NEW: Store response and enable button ---
        lastAssistantResponse = aiResponseText;
        downloadBtn.disabled = false;
        // ---------------------------------------------
    } catch (err) {
        console.error(err);
        displayMessage(`❌ API Error: ${err.message}`);
    } finally {
        thinkingMessage.classList.add('hidden');
        promptInput.disabled = false;
        sendBtn.disabled = false;
        promptInput.focus();
    }
}

// -----------------------------------------------------------
// Event Listeners
// -----------------------------------------------------------
sendBtn.addEventListener('click', sendMessage);
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

llmSelector.addEventListener('change', resetChat);
cefrSelector.addEventListener('change', (e) => {
    currentCEFR = e.target.value;
    resetChat();
});

corpusInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (evt) => {
            corpusText = evt.target.result;
            resetChat();
            displayMessage(`Corpus loaded (${file.name}, ${corpusText.length} chars).`);
        };
        reader.readAsText(file);
    } else {
        corpusText = "";
        displayMessage("⚠️ Please upload a valid .txt file.");
    }
});

// --- NEW/UPDATED EVENT LISTENERS START HERE ---

// 1. Download Button Listener
downloadBtn.addEventListener('click', downloadLastResponse);

// 2. Reset Button Listener (using the ID from index.html)
document.getElementById('reset-btn').addEventListener('click', () => {
    resetChat(); // Clears messages and history
    lastAssistantResponse = "";
    downloadBtn.disabled = true;
    displayMessage("Chat history and download state cleared.");
});

// 3. Updated Document Load Listener
document.addEventListener('DOMContentLoaded', () => {
    resetChat(); // Calls the initial chat reset
    lastAssistantResponse = "";
    downloadBtn.disabled = true;
});

document.addEventListener('DOMContentLoaded', resetChat);
