from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine
from app.models.user import Base
from app.routes import chat, voice

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app instance
app = FastAPI(
    title="AI Insurance Assistant",
    description="Production-ready chat and voice insurance assistant with persistent memory",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Expose headers for client-side access
    expose_headers=["Access-Control-Allow-Origin"]
)

# Include API routes
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(voice.router, prefix="/api/v1", tags=["voice"])

@app.get("/")
async def root():
    return {"message": "AI Insurance Assistant API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "AI Insurance Assistant"}

# Event handlers
@app.on_event("startup")
async def startup_event():
    print("Starting up AI Insurance Assistant API...")

@app.on_event("shutdown")
async def shutdown_event():
    print("Shutting down AI Insurance Assistant API...")