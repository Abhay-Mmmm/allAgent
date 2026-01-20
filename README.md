# allAgent - AI-Powered Insurance Assistant 🛡️

**allAgent** is next-generation insurance assistance platform designed for the Indian market. It bridges the gap between insurers and policyholders using advanced AI, providing a seamless experience across both web and mobile interfaces.

![Project Banner](https://via.placeholder.com/1200x400?text=allAgent+Project)

## 🌟 Key Features

### 📱 Mobile Experience (For Policyholders)
A simplified, accessible interface designed for mobile devices.

*   **AI Chat Assistant**: 
    *   Powered by **Groq (Llama 3.3 70B)** for instant, accurate responses.
    *   Context-aware conversations about Crop (PMFBY), Health, Life, and Vehicle insurance.
    *   Supports Hindi & English.
*   **Voice Call Support**:
    *   **Hands-free interaction**: Speak naturally to the AI.
    *   **Technology**: Uses **Whisper-large-v3-turbo** for transcription and browser TTS for response.
    *   **VAD (Voice Activity Detection)**: Automatically detects when you stop speaking.
*   **Smart Document Scanner**:
    *   **OCR Integration**: Instantly extract text from documents (e.g., Aadhaar cards) using Camera or Gallery.
    *   **Auto-Verify**: Validates Aadhaar card formatting and masked numbers.
    *   **Summarize with AI**: One-click workflow to send scanned text to the Chat Agent for explanation.
*   **Localization**: Instant switching between **English** and **Hindi** across the entire app.

### 💻 Web Dashboard (For Admins/Agents)
A comprehensive admin panel for monitoring and management.

*   **Analytics Dashboard**: Real-time stats on claims, policies, and active users.
*   **Interactive Charts**: 
    *   Regional coverage heatmaps (India map visualization).
    *   Claims trend analysis (Bar/Area charts).
    *   Policy distribution demographics (Pie charts).
*   **Claims Management**: Advanced filtering, search, and status tracking for insurance claims.
*   **Settings & Customization**: Manage user profiles and application preferences.

---

## 🛠️ Tech Stack

*   **Frontend**: React (Vite) + TypeScript
*   **Styling**: Tailwind CSS + Shadcn UI
*   **State Management**: React Context API
*   **AI & ML**:
    *   **LLM**: Groq API (Llama 3.3 70B)
    *   **Speech-to-Text**: Groq Whisper API
    *   **OCR**: Tesseract.js
*   **Routing**: React Router DOM (v6)
*   **Visualization**: Recharts & Framer Motion
*   **Icons**: Lucide React

---

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18+)
*   Groq API Key (for AI features)

### Installation & Running

This project is a **client-side Single Page Application (SPA)** built with Vite. There is no separate backend server process to run; all "backend" logic (AI, OCR) acts via serverless API calls directly from the browser.

#### 1. Frontend Setup (The Application)

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Abhay-Mmmm/allAgent.git
    cd allAgent
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    bun install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The app will proceed to start at `http://localhost:8080`.

#### 2. Backend Setup (API Keys)

Since the app relies on external AI services, you must configure the API keys. 

1.  Create a file named `.env` in the root folder.
2.  Add your Groq API keys (Get them from [console.groq.com](https://console.groq.com)):

    ```env
    VITE_GROQ_API_KEY_VOICE=gsk_...    # For Whisper (Voice Transcription)
    VITE_GROQ_API_KEY_CHAT=gsk_...     # For Llama 3 (Chat Intelligence)
    ```

> **Note**: You can use the same key for both variables if your token has access to both Whisper and Llama models.

---

## 🧭 Navigation

*   **Mobile App**: Navigate to `/mobile` (or use the toggle in the top-left).
*   **Web Dashboard**: Navigate to `/claims` (default web view).

---

## 🔄 AI Workflows

### Chat
1.  User asks a query (e.g., "What is PMFBY?").
2.  System Prompt directs AI to act as an Insurance Expert.
3.  Groq API generates a concise, formatted response.

### Voice Call 
1.  **Record**: `MediaRecorder` captures audio + `AudioContext` detects silence.
2.  **Transcribe**: Audio sent to Groq Whisper API.
3.  **Think**: Transcribed text sent to Groq LLM.
4.  **Speak**: LLM response read aloud via `window.speechSynthesis`.

### Scan-to-Chat
1.  User captures image.
2.  `Tesseract.js` runs client-side OCR.
3.  Extracted text is injected into Chat state.
4.  Chat Agent analyzes and summarizes the document content.

---

## 📜 License

This project is licensed under the MIT License.
