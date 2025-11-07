// ui.js
// Handles all DOM elements and UI display functions.

// Import the speaker function to attach it to the button
import { speakText } from './speech.js';

// --- HTML Elements ---
// Export all elements so new_script.js can use them
export const messagesDiv = document.getElementById('messages');
export const promptInput = document.getElementById('prompt-input');
export const sendBtn = document.getElementById('send-btn');
export const thinkingMessage = document.getElementById('thinking-message');
export const llmSelector = document.getElementById('llm-selector');
export const cefrSelector = document.getElementById('cefr-level');
export const corpusInput = document.getElementById('corpus-file-input');
export const downloadBtn = document.getElementById('download-btn'); 
export const micBtn = document.getElementById('mic-btn');
export const checkAnswerBtn = document.getElementById('check-answer-btn');
export const resetBtn = document.getElementById('reset-btn');


// --- Helper: Display messages ---
export function displayMessage(text, isUser = false) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('p-3', 'rounded-lg', 'max-w-xs', 'shadow-md', 'flex', 'items-center', 'space-x-2');

    const textEl = document.createElement('span');
    textEl.textContent = text;
    textEl.classList.add('flex-grow'); 
    messageEl.appendChild(textEl); 

    if (isUser) {
        messageEl.classList.add('bg-gray-200', 'text-gray-800', 'self-end');
    } else {
        messageEl.classList.add('bg-blue-500', 'text-white', 'self-start', 'assistant-response');
        const speakButton = document.createElement('button');
        speakButton.classList.add('flex-shrink-0', 'p-1', 'rounded-full', 'hover:bg-blue-400', 'focus:outline-none');
        speakButton.title = "Read aloud";
        speakButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
  <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
</svg>`;
        
        // The button's click action is self-contained here
        speakButton.onclick = () => {
            speakText(text); 
        };
        messageEl.appendChild(speakButton);
    }

    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}