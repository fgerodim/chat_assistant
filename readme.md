


# Master Thesis Chat Assistant & Language Tool

This project implements a secure, full-stack web application designed to assist master's students with academic writing and language practice. It integrates powerful large language models (LLMs) with custom pedagogical features, such as the Common European Framework of Reference (CEFR) leveling and text corpus analysis.

The application uses a modern, split architecture:

1. **Frontend (Client-side):** HTML, CSS (Tailwind CSS), and JavaScript for the user interface. Hosted via GitHub Pages.

2. **Backend (Server-side):** A secure Node.js (Express) proxy server. Hosted via Render, which securely handles all API key interactions.

## 🚀 Features

* **Secure API Proxy:** API keys for Gemini and Hugging Face are securely managed on the server (Render) and are never exposed to the client (browser).

* **Dual LLM Support:** Users can switch between the Gemini and Hugging Face models instantly.

* **CEFR Leveling:** The system prompt is dynamically adjusted to ensure the AI's response complexity and vocabulary match the selected CEFR level (A1 to C2).

* **Corpus Analysis:** Users can upload a `.txt` file (their thesis draft, reference articles, etc.) which is injected into the prompt, allowing the AI to generate exercises, summaries, or paraphrasing tasks based on the provided source material.

* **Chat History:** Maintains conversation context for both selected LLMs.

## ⚙️ Architecture and Deployment Status

| Component | Technology | Status | URL / Location | 
 | ----- | ----- | ----- | ----- | 
| **Frontend** | HTML, JS, Tailwind CSS | Deployed | $$ Your GitHub Pages URL Here $$ | 
| **Backend (API Proxy)** | Node.js (Express), `dotenv` | **LIVE** | `https://chat-assistant-txqb.onrender.com` | 

## 🛠️ Local Setup (For Development)

To run this project locally or understand its structure, follow these steps:

### 1. Repository Structure

Your project is organized as follows:

```

/chat\_assistant
├── backend/                  \<- Node.js Server (API Proxy)
│   ├── package.json          \<- Dependencies (express, cors, dotenv)
│   ├── server.js             \<- Handles secure API calls to LLMs
│   └── .env                  \<- Stores GEMINI\_API\_KEY, HF\_API\_TOKEN (IGNORED by Git)
├── index.html                \<- Main application interface (Frontend)
├── new\_script.js             \<- Frontend logic (Handles chat, CEFR, Corpus, and fetches data from the Render API)
├── promptConfig.js           \<- Customizable AI system persona and instructions
└── style.css                 \<- Custom CSS for styling

```

### 2. Frontend Connection (Already Completed)

The `new_script.js` file must be configured to point to the live Render backend.

```

// In new\_script.js:

const RENDER\_SERVER\_URL = "[https://chat-assistant-txqb.onrender.com](https://chat-assistant-txqb.onrender.com)";

const HF\_API\_URL = `${RENDER_SERVER_URL}/api/huggingface`;
const GEMINI\_API\_URL = `${RENDER_SERVER_URL}/api/gemini`;
// ... etc.

```

### 3. Backend Deployment (For Maintenance)

The backend is deployed to Render using the **`backend`** folder as the **Root Directory**.

* **Build Command:** `npm install`

* **Start Command:** `npm start`

* **Environment Variables:** `GEMINI_API_KEY` and `HF_API_TOKEN` are set securely in the Render dashboard.

## 📜 System Persona (`promptConfig.js`)

The AI model is instructed to act as a supportive **Master Thesis Writing Coach and Language Tutor**. Its core instructions are:

* **Role:** Supportive writing coach and exercise generator.

* **Scope:** Use uploaded corpus text as context; align complexity with the selected CEFR level.

* **Style:** Concise, polite, and student-friendly.

This project was built to demonstrate secure, decoupled architecture for LLM applications.
