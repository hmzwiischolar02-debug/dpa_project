from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.schemas import Vehicule, VehiculeCreate
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user

router = APIRouter(prefix="/vehicules", tags=["Vehicules"])

@router.get("/", response_model=List[Vehicule])
async def list_vehicules(
    active_only: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """List all vehicles"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        query = "SELECT * FROM vehicule"
        if active_only:
            query += " WHERE actif=TRUE"
        query += " ORDER BY police"
        
        cur.execute(query)
        results = cur.fetchall()
        
        return [dict(r) for r in results]

@router.get("/{vehicule_id}", response_model=Vehicule)
async def get_vehicule(
    vehicule_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get vehicle by ID"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("SELECT * FROM vehicule WHERE id=%s", (vehicule_id,))
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Véhicule non trouvé")
        
        return dict(result)

@router.post("/", response_model=dict)
async def create_vehicule(
    vehicule: VehiculeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new vehicle (admin only)"""
    if current_user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        try:
            cur.execute("""
                INSERT INTO vehicule (police, nCivil, marque, carburant, km)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (vehicule.police, vehicule.nCivil, vehicule.marque, vehicule.carburant, vehicule.km))
            
            result = cur.fetchone()
            conn.commit()
            return {"success": True, "message": "Véhicule créé", "id": result['id']}
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=str(e))

@router.put("/{vehicule_id}", response_model=dict)
async def update_vehicule(
    vehicule_id: int,
    vehicule: VehiculeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update a vehicle (admin only)"""
    if current_user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            UPDATE vehicule 
            SET police=%s, nCivil=%s, marque=%s, carburant=%s, km=%s
            WHERE id=%s
            RETURNING id
        """, (vehicule.police, vehicule.nCivil, vehicule.marque, vehicule.carburant, vehicule.km, vehicule_id))
        
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Véhicule non trouvé")
        
        conn.commit()
        return {"success": True, "message": "Véhicule modifié"}

@router.delete("/{vehicule_id}")
async def delete_vehicule(
    vehicule_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Deactivate a vehicle (admin only)"""
    if current_user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute(
            "UPDATE vehicule SET actif=FALSE WHERE id=%s RETURNING id",
            (vehicule_id,)
        )
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Véhicule non trouvé")
        
        conn.commit()
        return {"success": True, "message": "Véhicule désactivé"}