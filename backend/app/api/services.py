from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.schemas import Service, Benificiaire, BenificiaireCreate
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user

router = APIRouter(tags=["Services & Benificiaires"])

# ============= SERVICES =============

@router.get("/services", response_model=List[Service])
async def list_services(current_user: dict = Depends(get_current_user)):
    """List all services"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("SELECT id, nom, direction FROM service ORDER BY direction, nom")
        results = cur.fetchall()
        return results

@router.get("/services/{service_id}", response_model=Service)
async def get_service(
    service_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get service by ID"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute(
            "SELECT id, nom, direction FROM service WHERE id=%s",
            (service_id,)
        )
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Service non trouvé")
        
        return result

@router.get("/directions", response_model=List[str])
async def list_directions(current_user: dict = Depends(get_current_user)):
    """List all unique directions"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("SELECT DISTINCT direction FROM service ORDER BY direction")
        results = cur.fetchall()
        return [row['direction'] for row in results]

# ============= BENIFICIAIRES =============

@router.get("/benificiaires", response_model=List[Benificiaire])
async def list_benificiaires(current_user: dict = Depends(get_current_user)):
    """List all beneficiaries"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT b.id, b.matricule, b.nom, b.fonction, b.service_id
            FROM benificiaire b
            ORDER BY b.nom
        """)
        results = cur.fetchall()
        return results

@router.get("/benificiaires/{benificiaire_id}", response_model=Benificiaire)
async def get_benificiaire(
    benificiaire_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get beneficiary by ID"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute(
            "SELECT id, matricule, nom, fonction, service_id FROM benificiaire WHERE id=%s",
            (benificiaire_id,)
        )
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Bénificiaire non trouvé")
        
        return result

@router.get("/benificiaires/by-service/{service_id}", response_model=List[Benificiaire])
async def list_benificiaires_by_service(
    service_id: int,
    current_user: dict = Depends(get_current_user)
):
    """List beneficiaries by service"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT id, matricule, nom, fonction, service_id
            FROM benificiaire
            WHERE service_id=%s
            ORDER BY nom
        """, (service_id,))
        results = cur.fetchall()
        return results

@router.post("/benificiaires", response_model=dict)
async def create_benificiaire(
    benificiaire: BenificiaireCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new beneficiary (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        try:
            cur.execute("""
                INSERT INTO benificiaire (matricule, nom, fonction, service_id)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (
                benificiaire.matricule,
                benificiaire.nom,
                benificiaire.fonction,
                benificiaire.service_id
            ))
            
            result = cur.fetchone()
            conn.commit()
            
            return {
                "success": True,
                "message": "Bénificiaire créé avec succès",
                "id": result['id']
            }
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=str(e))

@router.put("/benificiaires/{benificiaire_id}")
async def update_benificiaire(
    benificiaire_id: int,
    benificiaire: BenificiaireCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update a beneficiary (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        cur.execute("""
            UPDATE benificiaire
            SET matricule=%s, nom=%s, fonction=%s, service_id=%s
            WHERE id=%s
            RETURNING id
        """, (
            benificiaire.matricule,
            benificiaire.nom,
            benificiaire.fonction,
            benificiaire.service_id,
            benificiaire_id
        ))
        
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Bénificiaire non trouvé")
        
        conn.commit()
        return {"success": True, "message": "Bénificiaire modifié"}

@router.delete("/benificiaires/{benificiaire_id}")
async def delete_benificiaire(
    benificiaire_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a beneficiary (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        cur.execute(
            "DELETE FROM benificiaire WHERE id=%s RETURNING id",
            (benificiaire_id,)
        )
        
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Bénificiaire non trouvé")
        
        conn.commit()
        return {"success": True, "message": "Bénificiaire supprimé"}