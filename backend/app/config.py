import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from .env file — resolve path relative to this file
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "CYXXR SOC Platform"
    API_V1_STR: str = "/api"
    
    # JWT & Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Database
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = "soc_automation"
    
    # CORS — comma-separated list of allowed frontend origins.
    # Set to your Vercel URL in production, e.g.:
    # CORS_ORIGINS=https://soc-dashboard.vercel.app
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")
    
    # Failback settings if MongoDB is not available
    DB_FALLBACK_SQLITE_PATH: str = "soc_fallback.db"
    
    class Config:
        case_sensitive = True

settings = Settings()
