// speech.js
// Handles Text-to-Speech (TTS) and Speech-to-Text (STT).

// We need these UI elements to update them from our STT functions
import { promptInput, micBtn, displayMessage } from './ui.js';

// --- Helper: Speak Text (TTS) ---
export function speakText(text) {
    const cleanText = text.replace(/[*#_-]/g, ' ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES'; 
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}


// --- Speech Recognition (STT) Setup ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
export let recognition; // Export the recognition object so new_script.js can use it

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // When the API hears something
    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        promptInput.value = speechResult; 
        promptInput.focus();
        micBtn.classList.remove('bg-red-500'); 
        micBtn.classList.add('bg-gray-500');
    };

    // On error
    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        displayMessage(`⚠️ Speech Error: ${event.error}`);
        micBtn.classList.remove('bg-red-500');
        micBtn.classList.add('bg-gray-500');
    };
    
    // When it stops listening
    recognition.onend = () => {
        micBtn.classList.remove('bg-red-500');
        micBtn.classList.add('bg-gray-500');
    };

} else {
    console.warn("Speech Recognition not supported in this browser.");
    // We will disable the button in new_script.js
}