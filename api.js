// api.js
// Handles all communication with our backend server.

// Import the URLs from our config file
import { GEMINI_API_URL, HF_API_URL, HF_MODEL_ID } from "./config.js";

// --- Gemini Connector ---
export async function getGeminiCompletion(history) {
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

// --- Hugging Face Connector ---
export async function getHuggingFaceCompletion(messages) {
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