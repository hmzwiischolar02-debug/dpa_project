from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.schemas import Benificiaire, BenificiaireCreate
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user

router = APIRouter(prefix="/benificiaires", tags=["Benificiaires"])

@router.get("/", response_model=List[dict])
async def list_benificiaires(current_user: dict = Depends(get_current_user)):
    """List all beneficiaries with service info"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                b.id, b.matricule, b.nom, b.fonction, b.service_id,
                s.nom as service_nom, s.direction
            FROM benificiaire b
            LEFT JOIN service s ON b.service_id = s.id
            ORDER BY b.nom
        """)
        results = cur.fetchall()
        
        return [dict(r) for r in results]

@router.get("/{benificiaire_id}", response_model=Benificiaire)
async def get_benificiaire(
    benificiaire_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get beneficiary by ID"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("SELECT * FROM benificiaire WHERE id=%s", (benificiaire_id,))
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Bénéficiaire non trouvé")
        
        return dict(result)

@router.post("/", response_model=dict)
async def create_benificiaire(
    benificiaire: BenificiaireCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new beneficiary (admin only)"""
    if current_user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        try:
            # Generate matricule (simple auto-increment based approach)
            cur.execute("SELECT COUNT(*) as count FROM benificiaire")
            count = cur.fetchone()['count']
            matricule = f"MAT-{count + 1:05d}"
            
            cur.execute("""
                INSERT INTO benificiaire (matricule, nom, fonction, service_id)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (matricule, benificiaire.nom, benificiaire.fonction, benificiaire.service_id))
            
            result = cur.fetchone()
            conn.commit()
            return {"success": True, "message": "Bénéficiaire créé", "id": result['id']}
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=str(e))

@router.put("/{benificiaire_id}", response_model=dict)
async def update_benificiaire(
    benificiaire_id: int,
    benificiaire: BenificiaireCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update a beneficiary (admin only)"""
    if current_user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        try:
            cur.execute("""
                UPDATE benificiaire 
                SET nom=%s, fonction=%s, service_id=%s
                WHERE id=%s
                RETURNING id
            """, (benificiaire.nom, benificiaire.fonction, benificiaire.service_id, benificiaire_id))
            
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Bénéficiaire non trouvé")
            
            conn.commit()
            return {"success": True, "message": "Bénéficiaire modifié"}
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{benificiaire_id}")
async def delete_benificiaire(
    benificiaire_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a beneficiary (admin only)"""
    if current_user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("DELETE FROM benificiaire WHERE id=%s RETURNING id", (benificiaire_id,))
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Bénéficiaire non trouvé")
        
        conn.commit()
        return {"success": True, "message": "Bénéficiaire supprimé"}

@router.get("/by-service/{service_id}", response_model=List[Benificiaire])
async def get_benificiaires_by_service(
    service_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get all beneficiaries for a specific service"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("SELECT * FROM benificiaire WHERE service_id=%s ORDER BY nom", (service_id,))
        results = cur.fetchall()
        
        return [dict(r) for r in results]