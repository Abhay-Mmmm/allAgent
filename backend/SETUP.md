# AllAgent Backend Setup

## 1. Prerequisites
- Python 3.10+
- Groq API Key (for LLM intelligence)
- VAPI Account + API Key (for voice AI — [dashboard.vapi.ai](https://dashboard.vapi.ai))
- Twilio or Exotel account (for telephony, configured through VAPI)
- ngrok or similar tunnel (for local webhook development)

## 2. Installation (Local)

1. Create a virtual environment:
   ```bash
   python -m venv venv
   # Activate:
   # Mac/Linux: source venv/bin/activate
   # Windows:   venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure Environment:
   - Copy `.env.example` to `../.env` (project root) or `backend/.env`
   - Required Keys:
     - `GROQ_API_KEY` — Groq API key for LLM (chat + data extraction)
     - `VAPI_API_KEY` — VAPI API key for voice assistant
     - `VAPI_PHONE_NUMBER_ID` — Your VAPI phone number ID
     - `VAPI_SERVER_URL` — Public webhook URL (e.g. `https://your-ngrok.ngrok.io/api/vapi-webhook`)
     - `VAPI_WEBHOOK_SECRET` — (Optional) HMAC secret for webhook validation

4. Run the server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. For local development with webhooks, use ngrok:
   ```bash
   ngrok http 8000
   ```
   Then set `VAPI_SERVER_URL` to the ngrok URL + `/api/vapi-webhook`.

## 3. Architecture

```
Incoming Call (Twilio/Exotel)
  → VAPI handles: STT → LLM → TTS (full conversation)
  → VAPI sends webhook events to your server
  → Backend processes end-of-call-report
  → Extracts structured data via Groq LLM
  → Updates SQLite DB (user profile + session)
```

## 4. API Endpoints

### Chat Mode (`POST /api/chat`)
Text-based chat with the insurance assistant (uses Groq LLM).

**Request:**
```json
{
  "user_identifier": "user_unique_id",
  "message": "I am looking for health insurance for my family.",
  "phone_number": "+919876543210"
}
```
**Response:**
```json
{
  "response": "Certainly! I can help with that. What is your age?",
  "structured_data": { "insurance_interest": "health" }
}
```

### Incoming Call (`POST /api/incoming-call`)
Accepts a Twilio/Exotel webhook for an incoming call and forwards to VAPI.

**Request (JSON):**
```json
{
  "from": "+919876543210",
  "to": "+911234567890"
}
```
**Response:**
```json
{
  "status": "ok",
  "message": "Call forwarded to VAPI assistant",
  "vapi_call_id": "vapi-call-uuid"
}
```

### VAPI Webhook (`POST /api/vapi-webhook`)
Receives server events from VAPI (end-of-call-report, transcript, status-update, etc.).
Configured as your VAPI assistant's Server URL.

### Caller Profile (`GET /api/caller-profile/{phone_number}`)
Returns stored profile for a phone number.

**Response:**
```json
{
  "phone_number": "+919876543210",
  "name": "Raj Sharma",
  "age": 35,
  "occupation": "Farmer",
  "location": "Pune, Maharashtra",
  "insurance_interest": "health",
  "last_summary": "Discussed health insurance options for family."
}
```

### Voice Chat — Emulated (`POST /api/voice-chat`)
Browser-based voice chat: browser handles STT/TTS, backend handles LLM.

**Request:**
```json
{
  "user_identifier": "user_unique_id",
  "transcript": "I want to know about crop insurance.",
  "phone_number": "+919876543210"
}
```
**Response:**
```json
{
  "text_response": "Crop insurance under PMFBY covers..."
}
```

## 5. Docker Deployment

Build and run the container:
```bash
docker build -t allagent-backend .
docker run -p 8000:8000 --env-file .env allagent-backend
```

## 6. Testing

Run the test suite:
```bash
# Start the server first, then in another terminal:
python test_vapi.py
python test_chat.py
```
