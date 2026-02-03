from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.schemas import Dotation, DotationCreate, DotationDetail
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user

router = APIRouter(prefix="/dotation", tags=["Dotation"])

@router.post("/", response_model=dict)
async def create_dotation(
    dotation: DotationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new monthly quota (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        try:
            cur.execute("""
                INSERT INTO dotation 
                (NumOrdre, vehicule_id, benificiaire_id, mois, annee, qte)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                dotation.NumOrdre,
                dotation.vehicule_id,
                dotation.benificiaire_id,
                dotation.mois,
                dotation.annee,
                dotation.qte
            ))
            
            result = cur.fetchone()
            conn.commit()
            
            return {
                "success": True,
                "message": "Dotation créée avec succès",
                "id": result['id']
            }
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=str(e))

@router.get("/active", response_model=List[DotationDetail])
async def list_active_dotations(
    current_user: dict = Depends(get_current_user)
):
    """List all active (non-closed) monthly quotas"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT d.id, d.NumOrdre, d.vehicule_id, v.police, v.nCivil, v.marque, v.carburant,
                   b.nom as benificiaire_nom, b.fonction as benificiaire_fonction,
                   s.nom as service_nom, s.direction,
                   d.mois, d.annee, d.qte, d.qte_consomme, d.reste, d.cloture
            FROM dotation d
            JOIN vehicule v ON v.id=d.vehicule_id
            JOIN benificiaire b ON b.id=d.benificiaire_id
            JOIN service s ON s.id=v.service_id
            WHERE d.cloture=FALSE
            ORDER BY d.NumOrdre, v.police
        """)
        
        results = cur.fetchall()
        
        return [{
            "id": row['id'],
            "NumOrdre": row['numordre'],
            "vehicule_id": row['vehicule_id'],
            "police": row['police'],
            "nCivil": row['ncivil'],
            "marque": row['marque'],
            "carburant": row['carburant'],
            "benificiaire_nom": row['benificiaire_nom'],
            "benificiaire_fonction": row['benificiaire_fonction'],
            "service_nom": row['service_nom'],
            "direction": row['direction'],
            "mois": row['mois'],
            "annee": row['annee'],
            "qte": row['qte'],
            "qte_consomme": float(row['qte_consomme']),
            "reste": float(row['reste']),
            "cloture": row['cloture']
        } for row in results]

@router.get("/archived", response_model=List[DotationDetail])
async def list_archived_dotations(
    current_user: dict = Depends(get_current_user)
):
    """List all closed/archived monthly quotas"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT d.id, d.NumOrdre, d.vehicule_id, v.police, v.nCivil, v.marque, v.carburant,
                   b.nom as benificiaire_nom, b.fonction as benificiaire_fonction,
                   s.nom as service_nom, s.direction,
                   d.mois, d.annee, d.qte, d.qte_consomme, d.reste, d.cloture
            FROM dotation d
            JOIN vehicule v ON v.id=d.vehicule_id
            JOIN benificiaire b ON b.id=d.benificiaire_id
            JOIN service s ON s.id=v.service_id
            WHERE d.cloture=TRUE
            ORDER BY d.annee DESC, d.mois DESC, d.NumOrdre
        """)
        
        results = cur.fetchall()
        
        return [{
            "id": row['id'],
            "NumOrdre": row['numordre'],
            "vehicule_id": row['vehicule_id'],
            "police": row['police'],
            "nCivil": row['ncivil'],
            "marque": row['marque'],
            "carburant": row['carburant'],
            "benificiaire_nom": row['benificiaire_nom'],
            "benificiaire_fonction": row['benificiaire_fonction'],
            "service_nom": row['service_nom'],
            "direction": row['direction'],
            "mois": row['mois'],
            "annee": row['annee'],
            "qte": row['qte'],
            "qte_consomme": float(row['qte_consomme']),
            "reste": float(row['reste']),
            "cloture": row['cloture']
        } for row in results]

@router.get("/all", response_model=List[DotationDetail])
async def list_all_dotations(
    current_user: dict = Depends(get_current_user)
):
    """List all monthly quotas (active and archived)"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT d.id, d.NumOrdre, d.vehicule_id, v.police, v.nCivil, v.marque, v.carburant,
                   b.nom as benificiaire_nom, b.fonction as benificiaire_fonction,
                   s.nom as service_nom, s.direction,
                   d.mois, d.annee, d.qte, d.qte_consomme, d.reste, d.cloture
            FROM dotation d
            JOIN vehicule v ON v.id=d.vehicule_id
            JOIN benificiaire b ON b.id=d.benificiaire_id
            JOIN service s ON s.id=v.service_id
            ORDER BY d.annee DESC, d.mois DESC, d.NumOrdre
        """)
        
        results = cur.fetchall()
        
        return [{
            "id": row['id'],
            "NumOrdre": row['numordre'],
            "vehicule_id": row['vehicule_id'],
            "police": row['police'],
            "nCivil": row['ncivil'],
            "marque": row['marque'],
            "carburant": row['carburant'],
            "benificiaire_nom": row['benificiaire_nom'],
            "benificiaire_fonction": row['benificiaire_fonction'],
            "service_nom": row['service_nom'],
            "direction": row['direction'],
            "mois": row['mois'],
            "annee": row['annee'],
            "qte": row['qte'],
            "qte_consomme": float(row['qte_consomme']),
            "reste": float(row['reste']),
            "cloture": row['cloture']
        } for row in results]

@router.get("/vehicles-without/{mois}/{annee}")
async def vehicles_without_dotation(
    mois: int,
    annee: int,
    current_user: dict = Depends(get_current_user)
):
    """Get vehicles without quota for specific month (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT v.id, v.police, v.nCivil, v.marque, v.carburant,
                   s.nom as service, s.direction
            FROM vehicule v
            JOIN service s ON s.id=v.service_id
            LEFT JOIN dotation d ON v.id = d.vehicule_id 
                AND d.mois = %s AND d.annee = %s
            WHERE d.id IS NULL AND v.actif=TRUE
            ORDER BY v.police
        """, (mois, annee))
        
        results = cur.fetchall()
        return results

@router.put("/{dotation_id}/close")
async def close_dotation(
    dotation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Manually close a monthly quota (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute(
            "UPDATE dotation SET cloture=TRUE WHERE id=%s RETURNING id",
            (dotation_id,)
        )
        
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Dotation non trouvée")
        
        conn.commit()
        return {"success": True, "message": "Dotation clôturée"}

@router.put("/{dotation_id}/reopen")
async def reopen_dotation(
    dotation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Reopen a closed monthly quota (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute(
            "UPDATE dotation SET cloture=FALSE WHERE id=%s RETURNING id",
            (dotation_id,)
        )
        
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Dotation non trouvée")
        
        conn.commit()
        return {"success": True, "message": "Dotation réouverte"}

@router.delete("/{dotation_id}")
async def delete_dotation(
    dotation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a monthly quota (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute(
            "DELETE FROM dotation WHERE id=%s RETURNING id",
            (dotation_id,)
        )
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Dotation non trouvée")
        
        conn.commit()
        return {"success": True, "message": "Dotation supprimée"}