from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, approvisionnement, dotation, stats, vehicules, services, benificiaires

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="API pour la gestion du parc automobile - Version 3.0 avec support DOTATION et MISSION"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(approvisionnement.router, prefix="/api")
app.include_router(dotation.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(vehicules.router, prefix="/api")
app.include_router(services.router, prefix="/api")
app.include_router(benificiaires.router, prefix="/api")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "DPA SCL API v3.0",
        "description": "Gestion du Parc Automobile avec support DOTATION et MISSION",
        "docs": "/docs",
        "redoc": "/redoc",
        "status": "running",
        "version": settings.VERSION
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "version": settings.VERSION}

@app.get("/api/info")
async def api_info():
    """API information"""
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "features": [
            "DOTATION - Approvisionnements sur dotation mensuelle",
            "MISSION - Approvisionnements pour missions externes",
            "Temporary vehicles - Support véhicules provisoires",
            "Statistics - Statistiques par type (DOTATION vs MISSION)",
            "Views - Vues PostgreSQL pour performance optimale"
        ],
        "endpoints": {
            "auth": "/api/auth",
            "approvisionnement": "/api/approvisionnement",
            "dotation": "/api/dotation",
            "stats": "/api/stats",
            "vehicules": "/api/vehicules",
            "services": "/api/services",
            "benificiaires": "/api/benificiaires"
        }
    }