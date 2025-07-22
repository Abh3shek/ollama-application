# 🧠 Local AI Chatbot (Ollama + Gemma:2b)

A local, ChatGPT-style full-stack chatbot built using **Ollama's open-source LLM**, inspired by the Cointab Developer Assignment. This project mimics the ChatGPT UI and functionality, but runs **fully offline**, leveraging the `gemma:2b` model for local inference and streaming.

> 🔄 All chat sessions are stored in a database and responses are streamed token-by-token for an authentic assistant experience.

---

## 🚀 Features

### ✅ Core Functionality

- **Chat interface** built with Next.js (React)
- **Streaming responses** from the LLM (token-by-token)
- **Chat history sidebar** to revisit past sessions
- **New Chat** button to start fresh conversations
- **Typing indicator** while LLM responds
- **Retry sending message** on failure
- **Keyboard shortcuts**:
  - `Enter` to send
  - `Esc` to clear input

### ⚠️ Not Implemented (Optional)

- ❌ Stop button to interrupt streaming
- ❌ Auto-generated chat names (e.g., "Marketing Plan")
- ❌ Rename or delete chats

---

## 🧱 Tech Stack

| Layer    | Tech              |
| -------- | ----------------- |
| Frontend | Next.js, React    |
| Backend  | Node.js, Express  |
| LLM      | Ollama (Gemma:2b) |
| Database | PostgreSQL        |
| Styling  | Tailwind CSS      |

---

## 🛠️ Setup Instructions

### 1. Clone the Repo

```bash
git clone https://github.com/your-username/local-ai-chatbot.git
cd local-ai-chatbot
```

### 2. Setup & Run Ollama (Gemma:2b)

> ⚠️ Gemma:1b could not be used due to a model error (File not found). This implementation uses Gemma:2b.

Install Ollama:

- 👉 https://ollama.com/download

Pull & Run Model:

```bash
ollama pull gemma:2b
ollama run gemma:2b
```

This will expose the local LLM API at:
http://localhost:11434/api/generate

### 3. Setup PostgreSQL

Make sure PostgreSQL is installed and running. Create a database named chatbot or as configured in your .env.

### 4. Configure Environment

Create a `.env` file in both frontend and backend as needed:

Example .env for backend:

```bash
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/chatbot
OLLAMA_URL=http://localhost:11434
```

### 5. Install Dependencies & Run

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## 🧩 Database Schema

I have provided prisma folder in repo where you can find `migrations`, `dev.db` & `schema`
