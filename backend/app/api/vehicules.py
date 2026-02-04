from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.schemas import Vehicule, VehiculeCreate
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user

router = APIRouter(prefix="/vehicules", tags=["Vehicules"])

@router.get("/", response_model=dict)
async def list_vehicules(
    page: int = 1,
    per_page: int = 10,
    active_only: bool = True,
    search: str = None,
    current_user: dict = Depends(get_current_user)
):
    """List all vehicles with pagination and search"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        # Build query
        where_clauses = []
        params = []
        
        if active_only:
            where_clauses.append("actif=TRUE")
        
        if search:
            where_clauses.append("(police ILIKE %s OR ncivil ILIKE %s OR marque ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])
        
        where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM vehicule {where_clause}"
        cur.execute(count_query, params)
        total = cur.fetchone()['total']
        
        # Get paginated results
        offset = (page - 1) * per_page
        list_query = f"SELECT * FROM vehicule {where_clause} ORDER BY police LIMIT %s OFFSET %s"
        cur.execute(list_query, params + [per_page, offset])
        results = cur.fetchall()
        
        return {
            "items": [dict(r) for r in results],
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0
        }

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