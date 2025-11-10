// config.js
// Holds all our static settings and API endpoints.

// We import the prompt from its own file
import { systemPrompt } from "./professionalPrompt.js";

// --- API Endpoints ---
const RENDER_SERVER_URL = "https://chat-assistant-txqb.onrender.com";
//const RENDER_SERVER_URL = "http://localhost:3000";

// We export everything so other files can use these settings
export const HF_API_URL = `${RENDER_SERVER_URL}/api/huggingface`;
export const HF_MODEL_ID = "openai/gpt-oss-20b:nebius";
export const GEMINI_API_URL = `${RENDER_SERVER_URL}/api/gemini`;

// Export the system prompt too
export { systemPrompt };