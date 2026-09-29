import os
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))

# Parse CORS origins from comma-separated string
raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
)
CORS_ORIGINS: List[str] = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
