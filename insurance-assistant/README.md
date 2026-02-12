# AI Insurance Assistant

A production-ready chat and voice insurance assistant with persistent memory, built with FastAPI, OpenAI, and AWS Nova Sonic.

## 🚀 Overview

The AI Insurance Assistant is a sophisticated system that provides two parallel interaction modes:

### 1. Chat Mode
- User text → OpenAI (low-cost model) → Text response
- Uses gpt-4o-mini for cost-effective reasoning

### 2. Voice Mode
- User speech → Pipecat → AWS Nova Sonic → Voice response
- Real-time speech-to-speech processing

Both modes share persistent memory and maintain session continuity.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Insurance Assistant                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────────┐    ┌──────────────┐   │
│  │   Chat      │    │   FastAPI        │    │   OpenAI     │   │
│  │   Client    │───▶│   Backend        │───▶│   Service    │   │
│  │             │    │                  │    │              │   │
│  └─────────────┘    └──────────────────┘    └──────────────┘   │
│                                                              │
│  ┌─────────────┐    ┌──────────────────┐    ┌──────────────┐   │
│  │   Voice     │    │                  │    │   AWS Nova   │   │
│  │   Client    │───▶│                  │───▶│   Sonic      │   │
│  │             │    │                  │    │   Service    │   │
│  └─────────────┘    └──────────────────┘    └──────────────┘   │
│                         │                                      │
│                         ▼                                      │
│                    ┌─────────────────┐                         │
│                    │   Shared        │                         │
│                    │   Memory        │                         │
│                    │   Layer         │                         │
│                    └─────────────────┘                         │
│                         │                                      │
│                         ▼                                      │
│                    ┌─────────────────┐                         │
│                    │   PostgreSQL    │                         │
│                    │   Database      │                         │
│                    └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python 3.11)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **AI Services**: OpenAI (gpt-4o-mini) for chat reasoning
- **Voice Processing**: AWS Nova Sonic for speech-to-speech
- **Containerization**: Docker & Docker Compose
- **Caching**: Redis (optional)
- **Async Processing**: Celery (optional)

## 📋 Prerequisites

- Docker and Docker Compose
- Python 3.11+ (if running locally)
- OpenAI API key
- AWS account with access to Nova Sonic model
- PostgreSQL-compatible database

## 🚀 Setup Instructions

### Option 1: Docker Deployment (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd insurance-assistant
```

2. Copy the environment file and configure your settings:
```bash
cp .env.example .env
```

3. Edit the `.env` file with your actual credentials:
```bash
OPENAI_API_KEY=your_actual_openai_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION_NAME=your_preferred_region
SECRET_KEY=your-super-secret-key-change-in-production
```

4. Start the services:
```bash
docker-compose up -d
```

5. The API will be available at `http://localhost:8000`

### Option 2: Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd insurance-assistant
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables (copy from .env.example)

5. Run the application:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📡 API Endpoints

### Chat Endpoint
- `POST /api/v1/chat` - Process text input and return text response

Request Body:
```json
{
  "message": "I want to know about health insurance",
  "user_id": "optional_user_id",
  "phone_number": "optional_phone_number"
}
```

Response:
```json
{
  "response": "AI response text",
  "user_id": "user_id",
  "session_id": "session_id",
  "structured_data": {
    "intent": "health_insurance",
    "topics": ["health_insurance"]
  }
}
```

### Voice Session Endpoint
- `POST /api/v1/voice-session` - Initialize a voice session

Request Body:
```json
{
  "user_id": "optional_user_id",
  "phone_number": "optional_phone_number",
  "session_type": "voice"
}
```

Response:
```json
{
  "session_id": "session_id",
  "user_id": "user_id",
  "status": "initialized",
  "ws_url": "/api/v1/voice-stream/session_id"
}
```

### Voice Streaming Endpoint
- `WS /api/v1/voice-stream/{session_id}` - WebSocket for real-time audio streaming

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check endpoint

## 🔐 Security Features

- Secure credential handling via environment variables
- Rate limiting per user
- SQL injection prevention via SQLAlchemy ORM
- Input validation using Pydantic schemas
- HTTPS enforcement in production

## 📊 Database Schema

### Users Table
- `id`: UUID (Primary Key)
- `phone_number`: VARCHAR(15) (Unique)
- `user_id`: VARCHAR(50) (Unique)
- `name`: VARCHAR(100)
- `age`: INTEGER
- `location`: TEXT
- `insurance_interest`: VARCHAR(50)
- `last_summary`: TEXT
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### Sessions Table
- `session_id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to Users)
- `transcript`: TEXT
- `structured_data`: JSONB
- `mode`: VARCHAR(10) (chat or voice)
- `timestamp`: TIMESTAMP

## 🤖 AI Behavior

The AI assistant follows these behavioral rules:
- Polite, patient, and professional
- Asks one question at a time
- Confirms important details before storing
- Collects information progressively
- Offers human agent transfer when needed
- Does not hallucinate policy details

## 🧠 Memory Persistence

- Persistent user profiles by phone number or user ID
- Conversation history tracking
- Progressive data collection
- Context continuity across chat and voice sessions
- Structured data extraction

## 🚨 Error Handling

- Graceful degradation for service outages
- Comprehensive logging
- Proper exception handling
- Circuit breaker patterns for external services

## 📈 Scalability Features

- Stateless API design
- Horizontal scaling with Docker
- Connection pooling for database
- Async I/O for voice streaming
- Redis for session management
- Celery for background processing

## 🧪 Testing

To run tests (when implemented):
```bash
pytest tests/
```

## 🚢 Deployment

For production deployment:
1. Use SSL certificates
2. Set `DEBUG=false`
3. Use strong `SECRET_KEY`
4. Implement proper logging aggregation
5. Set up monitoring and alerting
6. Configure backup strategies

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [AWS Nova Sonic Documentation](https://docs.aws.amazon.com/nova-sonic/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## ©️ License

This project is licensed under the MIT License - see the LICENSE file for details.