from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.schemas import (
    Approvisionnement,
    ApprovisionnementCreate,
    ApprovisionnementSearch,
    ApprovisionnementDetail,
    VehicleSearchResult
)
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user
import psycopg2

router = APIRouter(prefix="/approvisionnement", tags=["Approvisionnement"])

@router.post("/search", response_model=VehicleSearchResult)
async def search_vehicle(
    search: ApprovisionnementSearch,
    current_user: dict = Depends(get_current_user)
):
    """Search for vehicle information by police number for fuel supply"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT d.id as dotation_id, v.police, v.nCivil, v.marque, v.carburant, v.km as km_actuel,
                   b.nom as benificiaire, b.fonction, s.nom as service, s.direction,
                   d.qte as quota, d.qte_consomme, d.reste,
                   COALESCE((SELECT qte FROM approvisionnement 
                            WHERE dotation_id=d.id ORDER BY date DESC LIMIT 1), 0) as dernier_appro
            FROM dotation d
            JOIN vehicule v ON v.id=d.vehicule_id
            JOIN benificiaire b ON b.id=d.benificiaire_id
            JOIN service s ON s.id=v.service_id
            WHERE v.police=%s AND d.cloture=FALSE
        """, (search.police,))
        
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail="Véhicule non trouvé ou mois clôturé"
            )
        
        return {
            "dotation_id": result['dotation_id'],
            "police": result['police'],
            "nCivil": result['ncivil'],
            "marque": result['marque'],
            "carburant": result['carburant'],
            "km_actuel": result['km_actuel'],
            "benificiaire": result['benificiaire'],
            "fonction": result['fonction'],
            "service": result['service'],
            "direction": result['direction'],
            "quota": result['quota'],
            "qte_consomme": float(result['qte_consomme']),
            "reste": float(result['reste']),
            "dernier_appro": float(result['dernier_appro'])
        }

@router.post("/", response_model=dict)
async def create_approvisionnement(
    appro: ApprovisionnementCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new fuel supply entry"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        try:
            cur.execute("""
                INSERT INTO approvisionnement
                (dotation_id, qte, km_precedent, km_actuel)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (appro.dotation_id, appro.qte, appro.km_precedent, appro.km_actuel))
            
            result = cur.fetchone()
            conn.commit()
            
            return {
                "success": True,
                "message": "Approvisionnement ajouté avec succès",
                "id": result['id']
            }
            
        except psycopg2.errors.RaiseException as e:
            conn.rollback()
            # Extract error message from PostgreSQL trigger
            error_msg = str(e).split('\n')[0] if e.pgerror else str(e)
            raise HTTPException(status_code=400, detail=error_msg)
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@router.get("/list", response_model=List[ApprovisionnementDetail])
async def list_approvisionnements(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """List all fuel supply entries with pagination"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT a.id, a.date, a.qte, a.km_precedent, a.km_actuel, a.anomalie,
                   v.police, v.nCivil, v.marque, v.carburant,
                   b.nom as benificiaire, s.nom as service, s.direction,
                   d.qte as quota, d.qte_consomme, d.reste
            FROM approvisionnement a
            JOIN dotation d ON d.id=a.dotation_id
            JOIN vehicule v ON v.id=d.vehicule_id
            JOIN benificiaire b ON b.id=d.benificiaire_id
            JOIN service s ON s.id=v.service_id
            ORDER BY a.date DESC
            LIMIT %s OFFSET %s
        """, (limit, skip))
        
        results = cur.fetchall()
        
        return [{
            "id": row['id'],
            "date": row['date'],
            "qte": float(row['qte']),
            "km_precedent": row['km_precedent'],
            "km_actuel": row['km_actuel'],
            "police": row['police'],
            "nCivil": row['ncivil'],
            "marque": row['marque'],
            "carburant": row['carburant'],
            "benificiaire": row['benificiaire'],
            "service": row['service'],
            "direction": row['direction'],
            "quota": row['quota'],
            "qte_consomme": float(row['qte_consomme']),
            "reste": float(row['reste']),
            "anomalie": row['anomalie']
        } for row in results]

@router.get("/by-service/{service_name}", response_model=List[ApprovisionnementDetail])
async def list_by_service(
    service_name: str,
    current_user: dict = Depends(get_current_user)
):
    """List fuel supply entries filtered by service"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT a.id, a.date, a.qte, a.km_precedent, a.km_actuel, a.anomalie,
                   v.police, v.nCivil, v.marque, v.carburant,
                   b.nom as benificiaire, s.nom as service, s.direction,
                   d.qte as quota, d.qte_consomme, d.reste
            FROM approvisionnement a
            JOIN dotation d ON d.id=a.dotation_id
            JOIN vehicule v ON v.id=d.vehicule_id
            JOIN benificiaire b ON b.id=d.benificiaire_id
            JOIN service s ON s.id=v.service_id
            WHERE s.nom=%s
            ORDER BY a.date DESC
        """, (service_name,))
        
        results = cur.fetchall()
        
        return [{
            "id": row['id'],
            "date": row['date'],
            "qte": float(row['qte']),
            "km_precedent": row['km_precedent'],
            "km_actuel": row['km_actuel'],
            "police": row['police'],
            "nCivil": row['ncivil'],
            "marque": row['marque'],
            "carburant": row['carburant'],
            "benificiaire": row['benificiaire'],
            "service": row['service'],
            "direction": row['direction'],
            "quota": row['quota'],
            "qte_consomme": float(row['qte_consomme']),
            "reste": float(row['reste']),
            "anomalie": row['anomalie']
        } for row in results]

@router.get("/by-vehicle/{police}", response_model=List[ApprovisionnementDetail])
async def list_by_vehicle(
    police: str,
    current_user: dict = Depends(get_current_user)
):
    """List fuel supply history for a specific vehicle"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT a.id, a.date, a.qte, a.km_precedent, a.km_actuel, a.anomalie,
                   v.police, v.nCivil, v.marque, v.carburant,
                   b.nom as benificiaire, s.nom as service, s.direction,
                   d.qte as quota, d.qte_consomme, d.reste
            FROM approvisionnement a
            JOIN dotation d ON d.id=a.dotation_id
            JOIN vehicule v ON v.id=d.vehicule_id
            JOIN benificiaire b ON b.id=d.benificiaire_id
            JOIN service s ON s.id=v.service_id
            WHERE v.police=%s
            ORDER BY a.date DESC
        """, (police,))
        
        results = cur.fetchall()
        
        return [{
            "id": row['id'],
            "date": row['date'],
            "qte": float(row['qte']),
            "km_precedent": row['km_precedent'],
            "km_actuel": row['km_actuel'],
            "police": row['police'],
            "nCivil": row['ncivil'],
            "marque": row['marque'],
            "carburant": row['carburant'],
            "benificiaire": row['benificiaire'],
            "service": row['service'],
            "direction": row['direction'],
            "quota": row['quota'],
            "qte_consomme": float(row['qte_consomme']),
            "reste": float(row['reste']),
            "anomalie": row['anomalie']
        } for row in results]

@router.delete("/{appro_id}")
async def delete_approvisionnement(
    appro_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a fuel supply entry (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Accès administrateur requis"
        )
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute(
            "DELETE FROM approvisionnement WHERE id=%s RETURNING id",
            (appro_id,)
        )
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail="Approvisionnement non trouvé"
            )
        
        conn.commit()
        return {"success": True, "message": "Approvisionnement supprimé"}

@router.put("/{appro_id}", response_model=dict)
async def update_approvisionnement(
    appro_id: int,
    qte: float,
    current_user: dict = Depends(get_current_user)
):
    """Update fuel supply quantity (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Accès administrateur requis"
        )
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute(
            "UPDATE approvisionnement SET qte=%s WHERE id=%s RETURNING id",
            (qte, appro_id)
        )
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail="Approvisionnement non trouvé"
            )
        
        conn.commit()
        return {"success": True, "message": "Approvisionnement modifié"}