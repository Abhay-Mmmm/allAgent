# AllAgent Backend Setup

## 1. Prerequisites
- Python 3.10+
- Groq API Key (for LLM intelligence — [console.groq.com](https://console.groq.com/keys))
- Twilio Account + API credentials ([console.twilio.com](https://console.twilio.com))
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
     - `TWILIO_ACCOUNT_SID` — Twilio account SID
     - `TWILIO_AUTH_TOKEN` — Twilio auth token
     - `TWILIO_PHONE_NUMBER` — Your Twilio phone number (E.164 format, e.g. `+14155551234`)
     - `TWILIO_BASE_URL` — Public base URL reachable by Twilio (e.g. `https://your-ngrok.ngrok-free.app`)

4. Run the server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. For local development with webhooks, use ngrok:
   ```bash
   ngrok http 8000
   ```
   Then set `TWILIO_BASE_URL` to the ngrok HTTPS URL (no trailing slash).

   In the **Twilio Console** → your phone number → Voice Configuration:
   - **"A call comes in"** → `{TWILIO_BASE_URL}/api/twilio/voice` (HTTP POST)
   - **"Call Status Changes"** → `{TWILIO_BASE_URL}/api/twilio/status` (HTTP POST)

## 3. Architecture

```
QueueManager.start_campaign()
  → POST Twilio REST API /Calls.json  (initiates outbound call)
  → Twilio dials the lead

Lead picks up
  → POST /api/twilio/voice            (entry TwiML — greeting + <Gather>)
  → Lead speaks
  → POST /api/twilio/process-speech   (speech → Groq → TwiML <Say> + <Gather>)
  → Conversation loop …
  → POST /api/twilio/status           (terminal status → DB update + session saved)
  → Groq extract_lead_data() runs on transcript
  → Lead profile + CallSession persisted to PostgreSQL
```

## 4. API Endpoints

### Twilio Voice Entry (`POST /api/twilio/voice`)
Twilio calls this when the lead picks up. Returns TwiML greeting + `<Gather>`.

### Twilio Process Speech (`POST /api/twilio/process-speech`)
Receives `SpeechResult` from Twilio, sends to Groq, returns TwiML `<Say>` + new `<Gather>`.

### Twilio Status (`POST /api/twilio/status`)
Receives call lifecycle events. On terminal status (`completed`, `failed`, `busy`, `no-answer`):
- Updates `CallQueue` row status
- Saves `CallSession` with conversation transcript
- Clears in-memory conversation history

### Leads (`GET /api/leads`, `POST /api/leads/import`)
Lead profile management and CSV import.

### Queue (`GET /api/queue`, `POST /api/queue/add`, `POST /api/queue/start`)
Outbound call queue management and campaign runner.

### Calls (`GET /api/calls`, `GET /api/calls/{id}`)
Completed call session history with transcripts.

## 5. Docker Deployment

Build and run the container:
```bash
docker build -t allagent-backend .
docker run -p 8000:8000 --env-file .env allagent-backend
```

## 6. Testing

```bash
# Start the server first, then in another terminal:
python test_db.py
python test_chat.py
```
