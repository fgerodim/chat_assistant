// new_script.js
// This is the main "brain" of the application.
// It imports functions from other modules and manages the application state.

// --- Imports from our modules ---
import { systemPrompt } from "./config.js";
import { getGeminiCompletion, getHuggingFaceCompletion } from "./api.js";
import { recognition } from "./speech.js";
import { loadLogoImage, downloadLastResponse } from "./pdf.js";
import {
    messagesDiv, promptInput, sendBtn, thinkingMessage, llmSelector,
    cefrSelector, corpusInput, downloadBtn, micBtn, checkAnswerBtn,
    resetBtn, displayMessage
} from "./ui.js";

// --- Conversation Histories ---
let hfConversationHistory = [];
let geminiConversationHistory = [];

// --- State for CEFR + Corpus ---
let currentCEFR = cefrSelector.value;
let corpusText = "";

// --- State for Download ---
let lastAssistantResponse = "";
let logoImage = null;

// --- Helper: Reset Chat State ---
function resetChat() {
    window.speechSynthesis.cancel();
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
                geminiConversationHistory.push({ role: "user", parts: [{ text: systemPrompt }] });
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
        lastAssistantResponse = aiResponseText;
        downloadBtn.disabled = false;
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

// --- Check Answer Function ---
async function checkAnswer() {
    if (!lastAssistantResponse) {
        displayMessage("⚠️ There is no exercise to check.");
        return;
    }

    const checkAnswerPrompt = `
        The user has just completed the following exercise:
        ---
        ${lastAssistantResponse}
        ---
        Please provide the correct answers and a brief, supportive explanation.
        Do not ask a new question. Just provide the solution.
    `;

    displayMessage("Checking answer...", true);
    thinkingMessage.classList.remove('hidden');
    promptInput.disabled = true;
    sendBtn.disabled = true;
    checkAnswerBtn.disabled = true;

    const selectedLLM = llmSelector.value;
    let aiSolutionText = "";

    try {
        if (selectedLLM === 'gemini') {
            const tempGeminiHistory = [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: lastAssistantResponse }] },
                { role: "user", parts: [{ text: checkAnswerPrompt }] }
            ];
            aiSolutionText = await getGeminiCompletion(tempGeminiHistory);
        } else {
            const tempHfHistory = [
                { role: "system", content: systemPrompt },
                { role: "assistant", content: lastAssistantResponse },
                { role: "user", content: checkAnswerPrompt }
            ];
            aiSolutionText = await getHuggingFaceCompletion(tempHfHistory);
        }

        displayMessage(aiSolutionText);

    } catch (err) {
        console.error(err);
        displayMessage(`❌ API Error: ${err.message}`);
    } finally {
        thinkingMessage.classList.add('hidden');
        promptInput.disabled = false;
        sendBtn.disabled = false;
        checkAnswerBtn.disabled = false;
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

downloadBtn.addEventListener('click', () => {
    // We pass the state variables into the modular function
    downloadLastResponse(lastAssistantResponse, logoImage);
});

checkAnswerBtn.addEventListener('click', checkAnswer);

micBtn.addEventListener('click', () => {
    if (recognition) { 
        try {
            micBtn.classList.remove('bg-gray-500');
            micBtn.classList.add('bg-red-500');
            micBtn.title = "Listening... (Escuchando...)";
            recognition.start();
        } catch (err) {
            console.warn("Recognition already started.", err.message);
        }
    } else {
        displayMessage("⚠️ Speech recognition is not supported in your browser.");
    }
});

resetBtn.addEventListener('click', () => {
    resetChat(); 
    lastAssistantResponse = "";
    downloadBtn.disabled = true;
    displayMessage("Chat history and download state cleared.");
});

// --- Document Load Listener ---
document.addEventListener('DOMContentLoaded', () => {
    resetChat(); 
    lastAssistantResponse = "";
    downloadBtn.disabled = true;

    // Check if speech is supported and disable button if not
    if (!recognition) {
        if (micBtn) {
            micBtn.disabled = true;
            micBtn.title = "Speech recognition not supported in your browser";
        }
    }

    // Pre-load the logo
    loadLogoImage('cervantes.jpg')
        .then(img => {
            logoImage = img; // Store the loaded image object
            console.log("Logo image 'cervantes.jpg' pre-loaded successfully.");
        })
        .catch(err => {
            console.error("Error pre-loading logo image 'cervantes.jpg'. Make sure it's in the correct folder.", err);
        });
});