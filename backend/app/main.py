from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, approvisionnement, dotation, stats, vehicules, services

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="API for DPA SCL - Vehicle Fleet Fuel Management System"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api")
app.include_router(approvisionnement.router, prefix="/api")
app.include_router(dotation.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(vehicules.router, prefix="/api")
app.include_router(services.router, prefix="/api")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "DPA SCL API",
        "version": settings.VERSION,
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)