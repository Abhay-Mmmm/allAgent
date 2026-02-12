# AllAgent Backend Setup

## 1. Prerequisites
- Python 3.10+
- OpenAI API Key (gpt-4o-mini or similar)
- AWS Credentials (for Nova Sonic / Bedrock)
- Pipecat-compatible transport (e.g., Daily.co API Key)

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
   - Copy `.env.example` to `.env` inside `backend/` OR ensure the root `.env` has the necessary keys.
   - Required Keys: `OPENAI_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

4. Run the server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## 3. API Endpoints

### Chat Mode (`POST /api/chat`)
Interacts with the low-cost OpenAI model.
**Request:**
```json
{
  "user_identifier": "user_unique_id",
  "message": "I am looking for health insurance for my family.",
  "phone_number": "+15550001234"
}
```
**Response:**
```json
{
  "response": "Certainly! I can help with that. What is your age?",
  "structured_data": { "insurance_interest": "health" }
}
```

### Voice Mode (`POST /api/voice-session`)
Initiates a Pipecat session for real-time speech-to-speech with AWS Nova Sonic.
**Request:**
```json
{
  "user_identifier": "user_unique_id",
  "phone_number": "+15551234567"
}
```
**Response:** connection details (session ID, URL/Token).

## 4. Docker Deployment

Build and run the container:
```bash
docker build -t allagent-backend .
docker run -p 8000:8000 --env-file .env allagent-backend
```
