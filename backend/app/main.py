from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import chat, voice
from app.db.database import engine, Base
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

# Load environment variables. Assuming run from backend/ directory.
load_dotenv(dotenv_path="../.env")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables are created on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialized.")
    yield

app = FastAPI(lifespan=lifespan, title="AllAgent Backend")

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(voice.router, prefix="/api", tags=["voice"])

@app.get("/")
def read_root():
    return {"status": "online", "service": "AllAgent Backend"}
