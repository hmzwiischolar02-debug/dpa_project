from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.schemas import Vehicule, VehiculeCreate, VehiculeDetail
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user

router = APIRouter(prefix="/vehicules", tags=["Vehicules"])

@router.get("/", response_model=List[VehiculeDetail])
async def list_vehicles(
    active_only: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """List all vehicles"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        query = """
            SELECT v.id, v.police, v.nCivil, v.marque, v.carburant, v.km,
                   s.nom as service_nom, s.direction, v.actif
            FROM vehicule v
            JOIN service s ON s.id=v.service_id
        """
        
        if active_only:
            query += " WHERE v.actif=TRUE"
        
        query += " ORDER BY v.police"
        
        cur.execute(query)
        results = cur.fetchall()
        
        return [{
            "id": row['id'],
            "police": row['police'],
            "nCivil": row['ncivil'],
            "marque": row['marque'],
            "carburant": row['carburant'],
            "km": row['km'],
            "service_nom": row['service_nom'],
            "direction": row['direction'],
            "actif": row['actif']
        } for row in results]

@router.get("/{vehicle_id}", response_model=VehiculeDetail)
async def get_vehicle(
    vehicle_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get vehicle by ID"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT v.id, v.police, v.nCivil, v.marque, v.carburant, v.km,
                   s.nom as service_nom, s.direction, v.actif
            FROM vehicule v
            JOIN service s ON s.id=v.service_id
            WHERE v.id=%s
        """, (vehicle_id,))
        
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Véhicule non trouvé")
        
        return {
            "id": result['id'],
            "police": result['police'],
            "nCivil": result['ncivil'],
            "marque": result['marque'],
            "carburant": result['carburant'],
            "km": result['km'],
            "service_nom": result['service_nom'],
            "direction": result['direction'],
            "actif": result['actif']
        }

@router.post("/", response_model=dict)
async def create_vehicle(
    vehicle: VehiculeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new vehicle (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        try:
            cur.execute("""
                INSERT INTO vehicule (police, nCivil, marque, carburant, km, service_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                vehicle.police,
                vehicle.nCivil,
                vehicle.marque,
                vehicle.carburant,
                vehicle.km,
                vehicle.service_id
            ))
            
            result = cur.fetchone()
            conn.commit()
            
            return {
                "success": True,
                "message": "Véhicule créé avec succès",
                "id": result['id']
            }
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=str(e))

@router.put("/{vehicle_id}")
async def update_vehicle(
    vehicle_id: int,
    vehicle: VehiculeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update a vehicle (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        cur.execute("""
            UPDATE vehicule
            SET police=%s, nCivil=%s, marque=%s, carburant=%s, km=%s, service_id=%s
            WHERE id=%s
            RETURNING id
        """, (
            vehicle.police,
            vehicle.nCivil,
            vehicle.marque,
            vehicle.carburant,
            vehicle.km,
            vehicle.service_id,
            vehicle_id
        ))
        
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Véhicule non trouvé")
        
        conn.commit()
        return {"success": True, "message": "Véhicule modifié"}

@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Deactivate a vehicle (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        # Soft delete by setting actif=FALSE
        cur.execute("""
            UPDATE vehicule SET actif=FALSE WHERE id=%s RETURNING id
        """, (vehicle_id,))
        
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Véhicule non trouvé")
        
        conn.commit()
        return {"success": True, "message": "Véhicule désactivé"}