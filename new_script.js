/**
 * script.js (refactored)
 * Adds CEFR + corpus integration AND externalized role/scope via promptConfig.js
 */

import { systemPrompt } from "./promptConfig.js";

// --- API Keys & Configuration ---
// SECURITY NOTE: In production, never expose keys client-side.


const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_MODEL_ID = "openai/gpt-oss-20b:nebius";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

// --- HTML Elements ---
const messagesDiv = document.getElementById('messages');
const promptInput = document.getElementById('prompt-input');
const sendBtn = document.getElementById('send-btn');
const thinkingMessage = document.getElementById('thinking-message');
const llmSelector = document.getElementById('llm-selector');
const cefrSelector = document.getElementById('cefr-level');
const corpusInput = document.getElementById('corpus-file-input');

// --- Conversation Histories ---
let hfConversationHistory = [];
let geminiConversationHistory = [];

// --- State for CEFR + Corpus ---
let currentCEFR = cefrSelector.value;
let corpusText = "";

// --- Helper: Display messages ---
function displayMessage(text, isUser = false) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('p-3', 'rounded-lg', 'max-w-xs', 'shadow-md');
    messageEl.textContent = text;

    if (isUser) {
        messageEl.classList.add('bg-gray-200', 'text-gray-800', 'self-end');
    } else {
        messageEl.classList.add('bg-blue-500', 'text-white', 'self-start');
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

// -----------------------------------------------------------
// Gemini Connector
// -----------------------------------------------------------
async function getGeminiCompletion(history) {
  const response = await fetch('http://localhost:3000/api/gemini', {
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
  const response = await fetch('http://localhost:3000/api/huggingface', {
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

document.addEventListener('DOMContentLoaded', resetChat);
