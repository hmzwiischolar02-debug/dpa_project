from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.schemas import DotationCreate, DotationDetail
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user

router = APIRouter(prefix="/dotation", tags=["Dotation"])

@router.post("/", response_model=dict)
async def create_dotation(
    dotation: DotationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new monthly dotation (admin only)"""
    if current_user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        try:
            cur.execute("""
                INSERT INTO dotation (vehicule_id, benificiaire_id, mois, annee, qte)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (dotation.vehicule_id, dotation.benificiaire_id, dotation.mois, dotation.annee, dotation.qte))
            
            result = cur.fetchone()
            conn.commit()
            return {"success": True, "message": "Dotation créée", "id": result['id']}
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=str(e))

@router.get("/active", response_model=List[DotationDetail])
async def get_active_dotations(current_user: dict = Depends(get_current_user)):
    """Get all active (non-closed) dotations"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                d.id,
                d.vehicule_id,
                v.police,
                v.nCivil,
                v.marque,
                v.carburant,
                b.nom AS benificiaire_nom,
                b.fonction AS benificiaire_fonction,
                s.nom AS service_nom,
                s.direction,
                d.mois,
                d.annee,
                d.qte,
                d.qte_consomme,
                d.reste,
                d.cloture
            FROM dotation d
            JOIN vehicule v ON d.vehicule_id = v.id
            JOIN benificiaire b ON d.benificiaire_id = b.id
            JOIN service s ON b.service_id = s.id
            WHERE d.cloture = FALSE
            ORDER BY s.nom, v.police
        """)
        results = cur.fetchall()
        
        return [{
            "id": row['id'],
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
async def get_archived_dotations(current_user: dict = Depends(get_current_user)):
    """Get all archived (closed) dotations"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                d.id,
                d.vehicule_id,
                v.police,
                v.nCivil,
                v.marque,
                v.carburant,
                b.nom AS benificiaire_nom,
                b.fonction AS benificiaire_fonction,
                s.nom AS service_nom,
                s.direction,
                d.mois,
                d.annee,
                d.qte,
                d.qte_consomme,
                d.reste,
                d.cloture
            FROM dotation d
            JOIN vehicule v ON d.vehicule_id = v.id
            JOIN benificiaire b ON d.benificiaire_id = b.id
            JOIN service s ON b.service_id = s.id
            WHERE d.cloture = TRUE
            ORDER BY d.annee DESC, d.mois DESC, s.nom, v.police
        """)
        results = cur.fetchall()
        
        return [{
            "id": row['id'],
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

@router.delete("/{dotation_id}")
async def delete_dotation(
    dotation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a dotation (admin only)"""
    if current_user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("DELETE FROM dotation WHERE id=%s RETURNING id", (dotation_id,))
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Dotation non trouvée")
        
        conn.commit()
        return {"success": True, "message": "Dotation supprimée"}