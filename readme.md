# 🇪🇸 AI Pedagogical Scaffolding Tutor for Spanish Literature

A web-based intelligent tutoring system for Spanish language and literature, built as part of a Master's Thesis in Digital Humanities. The application uses scaffolded, Socratic dialogue to guide learners through CEFR-adapted literary exercises — in Greek.

---

## ✨ Features

- **CEFR-adaptive exercises** — Supports A1 through C2 levels, with automatically adjusted vocabulary, grammar, and task complexity
- **Corpus-based learning** — Upload any `.txt` file as a literary corpus; all exercises are grounded in the provided text
- **Dual AI backend** — Switch between Google Gemini and Meta Llama 3.3 (via Hugging Face)
- **Answer checking** — Request model-generated solutions and explanations for any exercise
- **PDF export** — Download any AI response as a formatted A4 PDF with a custom logo watermark
- **Text-to-Speech** — Listen to AI responses read aloud (Spanish, `es-ES`)
- **Speech-to-Text** — Dictate your answers using your microphone
- **Conversation logging** — All interactions are automatically logged to a Google Sheet for research and analytics
- **Chat reset** — Clear history and start fresh at any time

---

## 🏗️ Architecture

```
├── index.html           # UI layout (Tailwind CSS)
├── main.js              # Application state & event handling
├── api.js               # Backend API connectors (Gemini & HuggingFace)
├── config.js            # Endpoints, model IDs, and system prompt
├── professionalPrompt.js # Pedagogical system prompt (Vygotsky / ZPD / CEFR)
├── ui.js                # DOM elements & message rendering
├── speech.js            # TTS & STT via Web Speech API
├── pdf.js               # PDF generation via jsPDF
└── server/
    └── server.js        # Express proxy server (hides API keys, logs to Sheets)
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A Google Cloud service account with Sheets API access
- A Gemini API key
- A Hugging Face API token

### 1. Clone the repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Install server dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
HF_API_TOKEN=your_huggingface_token_here
PORT=3000
```

### 4. Add Google credentials

Place your Google Cloud service account key file at the root as `google-creds.json`. The service account must have **Editor** access to the target Google Sheet.

Update the `SPREADSHEET_ID` constant in `server.js` to point to your sheet.

### 5. Start the server

```bash
node server.js
```

### 6. Open the frontend

Open `index.html` in your browser (or serve it with a local server such as VS Code Live Server).

---

## ⚙️ Configuration

| File | What to change |
|------|---------------|
| `config.js` | Toggle between local (`localhost:3000`) and deployed server URL |
| `professionalPrompt.js` | Modify the pedagogical persona, CEFR rules, or output language |
| `server.js` | Update `SPREADSHEET_ID` and `GOOGLE_CREDS_PATH` |

---

## 🤖 AI Models

| Selector | Model | Provider |
|----------|-------|----------|
| GPT | `meta-llama/Llama-3.3-70B-Instruct` | Hugging Face Inference Router |
| Gemini | `gemini-2.5-flash` | Google Generative Language API |

> The "GPT" label in the UI refers to the Llama model for user-facing simplicity.

---

## 📋 Pedagogical Design

The system prompt in `professionalPrompt.js` implements three theoretical frameworks:

- **Vygotsky's Zone of Proximal Development (ZPD)** — Tasks are calibrated just beyond the learner's current ability
- **Constructivism** — Students discover meaning through guided questioning, not direct instruction
- **CEFR Adaptive Learning** — Difficulty, vocabulary, and task type shift automatically per level

The AI tutor responds primarily in **Greek (Ελληνικά)**, using Spanish only for quotes, exercises, and literary terminology.

---

## 📊 Logging

Every interaction (timestamp, model, user message, AI response) is appended to a Google Sheet via the server. This supports longitudinal research analysis and thesis data collection.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JS (ES Modules), Tailwind CSS, Web Speech API, jsPDF
- **Backend:** Node.js, Express, node-fetch
- **AI:** Google Gemini API, Hugging Face Inference API
- **Logging:** Google Sheets API (`googleapis`)
- **Deployment:** [Render](https://render.com)

---

## 📄 License

This project was developed for academic research purposes as part of a Master's Thesis in Digital Humanities. Please contact the author before reusing or adapting this work.