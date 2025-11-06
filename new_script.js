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
const micBtn = document.getElementById('mic-btn');
const checkAnswerBtn = document.getElementById('check-answer-btn');

// --- Conversation Histories ---
let hfConversationHistory = [];
let geminiConversationHistory = [];

// --- State for CEFR + Corpus ---
let currentCEFR = cefrSelector.value;
let corpusText = "";

// --- State for Download ---
let lastAssistantResponse = "";

let logoImage = null;

// --- Helper: Display messages (NOW WITH TTS!) ---
function displayMessage(text, isUser = false) {
    const messageEl = document.createElement('div');
    // Make the bubble a flex container to hold text and button
    messageEl.classList.add('p-3', 'rounded-lg', 'max-w-xs', 'shadow-md', 'flex', 'items-center', 'space-x-2');

    // 1. Put the text in its own <span> element
    const textEl = document.createElement('span');
    textEl.textContent = text;
    textEl.classList.add('flex-grow'); // Lets the text take up most of the space

    messageEl.appendChild(textEl); // Add the text to the bubble

    if (isUser) {
        // --- THIS IS FOR THE USER ---
        messageEl.classList.add('bg-gray-200', 'text-gray-800', 'self-end');
    } else {
        // --- THIS IS FOR THE ASSISTANT ---
        messageEl.classList.add('bg-blue-500', 'text-white', 'self-start', 'assistant-response');

        // 2. Create the speaker button
        const speakButton = document.createElement('button');
        speakButton.classList.add('flex-shrink-0', 'p-1', 'rounded-full', 'hover:bg-blue-400', 'focus:outline-none');
        speakButton.title = "Read aloud";
        
        // 3. Add the speaker icon (pasted SVG)
        speakButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
  <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
</svg>`;

        // 4. Add the click action!
        speakButton.onclick = () => {
            speakText(text); // Calls our new function from Step 1
        };

        messageEl.appendChild(speakButton); // Add the button to the bubble
    }

    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// --- Helper: Speak Text ---
function speakText(text) {
    const cleanText = text.replace(/[*#_-]/g, ' ');

   
    // 1. Create a "speech object" from the text you want to speak
    const utterance = new SpeechSynthesisUtterance(cleanText);


    
    // 2. (Optional) Tell it what language/accent to use.
    // Since your project is about Spanish, you might want 'es-ES'!
    utterance.lang = 'es-ES'; 
    //utterance.lang = 'en-US'; // For English

    // 3. Stop any speech that is already playing
    window.speechSynthesis.cancel();

    // 4. Tell the browser to speak your new text
    window.speechSynthesis.speak(utterance);
}

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

// --- *** NEW HELPER: Load Image as Promise *** ---
function loadLogoImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (err) => {
            console.error(`Failed to load image: ${src}`, err);
            reject(err);
        };
    });
}
// --- Helper: Download Last Response ---
// --- *** UPDATED HELPER: Download Last Response (with Logo) *** ---
async function downloadLastResponse() { // <-- It's now "async"
    if (!lastAssistantResponse) {
        alert("There is no response to download!");
        return;
    }

    // Safety check: If pre-load failed, try to load it now.
    if (!logoImage) {
        console.warn("Logo was not pre-loaded. Attempting to load now...");
        try {
            // This will only run if the pre-load failed
            logoImage = await loadLogoImage('cervantes.jpg'); 
            console.log("Logo loaded on-demand.");
        } catch (err) {
            console.error("Failed to load logo on-demand:", err);
            // We can still proceed to generate the PDF without the logo
        }
    }

    // --- 1. CONFIGURACIÓN (Setup) ---
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // --- 2. TAMAÑO DE LETRA ---
    const fontSize = 10;
    doc.setFontSize(fontSize); 

    // --- 3. MÁRGENES y TAMAÑO de PÁGINA ---
    const margin = 15; // 15mm
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - (margin * 2);
    const maxPageHeight = pageHeight - margin; // Max Y position for text

    // --- 4. CONFIGURACIÓN DE IMAGEN (LOGO) ---
    const imgWidth = 15; // 10mm width (you can change this)
    const imgHeight = 15; // 10mm height (you can change this)

    // Position: Bottom-right corner
    const imgX = pageWidth - margin - imgWidth;
    const imgY = pageHeight - margin - imgHeight;

    // --- 5. LÍNEAS DE TEXTO (Text lines) ---
    const cleanText = lastAssistantResponse.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, '');
    const lines = doc.splitTextToSize(cleanText, usableWidth);

    // --- 6. LÓGICA DE BUCLE (Loop Logic) ---
    let cursorY = margin;
    const lineHeight = 5; 

    // --- Add image to the FIRST page ---
    if (logoImage) {
        // We tell jsPDF it's a 'JPEG' file
        doc.addImage(logoImage, 'JPEG', imgX, imgY, imgWidth, imgHeight);
    }

    lines.forEach(line => {
        // When we need a new page...
        if (cursorY + lineHeight > maxPageHeight) {
            doc.addPage();
            doc.setFontSize(fontSize);
            cursorY = margin;

            // --- Add image to the NEW page too ---
            if (logoImage) {
                doc.addImage(logoImage, 'JPEG', imgX, imgY, imgWidth, imgHeight);
            }
        }

        doc.text(line, margin, cursorY);
        cursorY += lineHeight;
    });

    // --- 7. GUARDAR (Save) ---
    const filename = "assistant_response.pdf";
    doc.save(filename);
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

// 1. Ελέγχουμε αν ο browser υποστηρίζει το SpeechRecognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; // Σταματάει μόλις πάψουμε να μιλάμε
    recognition.lang = 'es-ES';      // <-- ΣΗΜΑΝΤΙΚΟ: Ακούει για Ισπανικά!
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // 2. Τι συμβαίνει όταν το API ακούσει κάτι
    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        promptInput.value = speechResult; // Βάζει το κείμενο στο κουτί
        
        // (Προαιρετικό: Κάνει focus και αλλάζει χρώμα κουμπιού)
        promptInput.focus();
        micBtn.classList.remove('bg-red-500'); // Σταματάει το κόκκινο
        micBtn.classList.add('bg-gray-500');
    };

    // 3. Τι συμβαίνει αν γίνει λάθος (π.χ. δεν βρήκε μικρόφωνο)
    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        displayMessage(`⚠️ Speech Error: ${event.error}`);
        micBtn.classList.remove('bg-red-500');
        micBtn.classList.add('bg-gray-500');
    };
    
    // 4. Όταν σταματήσει να ακούει
    recognition.onend = () => {
        micBtn.classList.remove('bg-red-500');
        micBtn.classList.add('bg-gray-500');
    };

} else {
    // Αν ο browser (π.χ. παλιός Firefox) δεν το υποστηρίζει
    console.warn("Speech Recognition not supported in this browser.");
    // Κάνουμε το κουμπί να μην πατιέται
    if (micBtn) {
        micBtn.disabled = true;
        micBtn.title = "Speech recognition not supported in your browser";
    }
}
// --- START: NEW CHECK ANSWER FUNCTION ---
async function checkAnswer() {
    // 1. Check if there is an exercise to check
    if (!lastAssistantResponse) {
        displayMessage("⚠️ There is no exercise to check.");
        return;
    }

    // 2. Create the special prompt for the AI
    const checkAnswerPrompt = `
        The user has just completed the following exercise:
        ---
        ${lastAssistantResponse}
        ---
        Please provide the correct answers and a brief, supportive explanation.
        Do not ask a new question. Just provide the solution.
    `;

    // 3. UI updates (Thinking...)
    displayMessage("Checking answer...", true); // Show "Checking answer..." as a user message
    thinkingMessage.classList.remove('hidden');
    promptInput.disabled = true;
    sendBtn.disabled = true;
    checkAnswerBtn.disabled = true;

    const selectedLLM = llmSelector.value;
    let aiSolutionText = "";

    try {
        // 4. Call the AI (similar to sendMessage)
        if (selectedLLM === 'gemini') {
            // We create a *temporary* history for this request.
            // We include the system prompt, the exercise, and our new request.
            const tempGeminiHistory = [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: lastAssistantResponse }] },
                { role: "user", parts: [{ text: checkAnswerPrompt }] }
            ];
            aiSolutionText = await getGeminiCompletion(tempGeminiHistory);
            // IMPORTANT: We do *not* save this to the main geminiConversationHistory
            // because we don't want it to confuse the AI's memory.
            
        } else {
            // Temporary history for HF
            const tempHfHistory = [
                { role: "system", content: systemPrompt },
                { role: "assistant", content: lastAssistantResponse },
                { role: "user", content: checkAnswerPrompt }
            ];
            aiSolutionText = await getHuggingFaceCompletion(tempHfHistory);
            // We also do *not* save this to hfConversationHistory
        }

        // 5. Display the AI's solution
        displayMessage(aiSolutionText);
        // We DON'T update lastAssistantResponse here, 
        // so the user can download the *original exercise*, not the answer.

    } catch (err) {
        console.error(err);
        displayMessage(`❌ API Error: ${err.message}`);
    } finally {
        // 6. Re-enable UI
        thinkingMessage.classList.add('hidden');
        promptInput.disabled = false;
        sendBtn.disabled = false;
        checkAnswerBtn.disabled = false;
        promptInput.focus();
    }
}
// --- END: NEW CHECK ANSWER FUNCTION ---

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

// --- START: ADD THIS NEW LISTENER ---
checkAnswerBtn.addEventListener('click', checkAnswer);
// --- END: ADD THIS NEW LISTENER ---
// --- ΝΕΟ: Mic Button Listener ---
micBtn.addEventListener('click', () => {
    if (recognition) { // Ελέγχει αν το API ομιλίας υπάρχει
        try {
            // Αλλάζει το κουμπί σε κόκκινο για να δείξει ότι "ακούει"
            micBtn.classList.remove('bg-gray-500');
            micBtn.classList.add('bg-red-500');
            micBtn.title = "Listening... (Escuchando...)";
            
            // Ξεκινά την αναγνώριση ομιλίας
            recognition.start();
        } catch (err) {
            // Αυτό συμβαίνει αν ο χρήστης πατήσει ξανά το κουμπί ενώ ήδη "ακούει"
            console.warn("Recognition already started.", err.message);
        }
    } else {
        // Αυτό θα τρέξει μόνο αν ο browser δεν υποστηρίζεται
        displayMessage("⚠️ Speech recognition is not supported in your browser.");
    }
});
// 2. Reset Button Listener (using the ID from index.html)
document.getElementById('reset-btn').addEventListener('click', () => {
    resetChat(); // Clears messages and history
    lastAssistantResponse = "";
    downloadBtn.disabled = true;
    displayMessage("Chat history and download state cleared.");
});

// --- *** UPDATED Document Load Listener (with Logo Pre-load) *** ---
document.addEventListener('DOMContentLoaded', () => {
    resetChat(); // Calls the initial chat reset
    lastAssistantResponse = "";
    downloadBtn.disabled = true;

    // --- NEW: Pre-load the logo image ---
    loadLogoImage('cervantes.jpg')
        .then(img => {
            logoImage = img; // Store the loaded image object
            console.log("Logo image 'cervantes.jpg' pre-loaded successfully.");
        })
        .catch(err => {
            console.error("Error pre-loading logo image 'cervantes.jpg'. Make sure it's in the correct folder.", err);
        });
    // ------------------------------------
});

