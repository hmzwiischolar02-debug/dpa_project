from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.schemas import Service, Benificiaire
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user

router = APIRouter(tags=["Services"])

@router.get("/services", response_model=List[Service])
async def list_services(current_user: dict = Depends(get_current_user)):
    """List all services"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("SELECT * FROM service ORDER BY direction, nom")
        results = cur.fetchall()
        return [dict(r) for r in results]

@router.get("/services/{service_id}", response_model=Service)
async def get_service(
    service_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get service by ID"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("SELECT * FROM service WHERE id=%s", (service_id,))
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Service non trouvé")
        
        return dict(result)

@router.get("/directions", response_model=List[str])
async def list_directions(current_user: dict = Depends(get_current_user)):
    """List all unique directions"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("SELECT DISTINCT direction FROM service ORDER BY direction")
        results = cur.fetchall()
        return [r['direction'] for r in results]

@router.get("/benificiaires", response_model=List[Benificiaire])
async def list_benificiaires(current_user: dict = Depends(get_current_user)):
    """List all beneficiaires"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("SELECT * FROM benificiaire ORDER BY nom")
        results = cur.fetchall()
        return [dict(r) for r in results]

@router.get("/benificiaires/{benificiaire_id}", response_model=Benificiaire)
async def get_benificiaire(
    benificiaire_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get beneficiaire by ID"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("SELECT * FROM benificiaire WHERE id=%s", (benificiaire_id,))
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Bénéficiaire non trouvé")
        
        return dict(result)

@router.get("/benificiaires/by-service/{service_id}", response_model=List[Benificiaire])
async def get_benificiaires_by_service(
    service_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get beneficiaires by service"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute(
            "SELECT * FROM benificiaire WHERE service_id=%s ORDER BY nom",
            (service_id,)
        )
        results = cur.fetchall()
        return [dict(r) for r in results]