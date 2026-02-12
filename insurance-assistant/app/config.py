import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/insurance_assistant")
    
    # OpenAI settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # Using cost-effective model
    
    # AWS settings for Nova Sonic
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION_NAME: str = os.getenv("AWS_REGION_NAME", "us-east-1")
    
    # Nova Sonic model ID
    NOVA_SONIC_MODEL_ID: str = os.getenv("NOVA_SONIC_MODEL_ID", "nova-sonic-v1")
    
    # Security settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Application settings
    APP_NAME: str = "AI Insurance Assistant"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Allowed origins for CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:8080",
        "https://localhost",
        "https://localhost:3000",
        "https://localhost:8080",
    ]
    
    class Config:
        env_file = ".env"

settings = Settings()