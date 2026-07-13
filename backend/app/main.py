import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import db
from app.routes import auth, logs, alerts, incidents, dashboard, reports, admin

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("soc_main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database initialization on startup
    await db.connect()
    
    # Pre-seed initial users if needed
    try:
        from app.routes.auth import seed_users
        result = await seed_users()
        logger.info(f"Seeding process ran: {result}")
    except Exception as e:
        logger.error(f"Error seeding initial database: {e}")
        
    yield
    # Shutdown logic (if any)
    logger.info("Application shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware config
# Parse CORS_ORIGINS: "*" means allow all; otherwise it's a comma-separated list
_raw_cors = settings.CORS_ORIGINS.strip()
_cors_origins: list[str] = ["*"] if _raw_cors == "*" else [o.strip() for o in _raw_cors.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(logs.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "SOC Automation Dashboard API is running.",
        "documentation": "/docs"
    }
