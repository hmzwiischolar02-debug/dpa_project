from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.schemas import Benificiaire, BenificiaireCreate
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user

router = APIRouter(prefix="/benificiaires", tags=["Benificiaires"])

@router.get("/", response_model=dict)
async def list_benificiaires(
    page: int = 1,
    per_page: int = 10,
    search: str = None,
    current_user: dict = Depends(get_current_user)
):
    """List all beneficiaries with service info, pagination and search"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        # Build query with search
        base_query = """
            SELECT 
                b.id, b.matricule, b.nom, b.fonction, b.service_id,
                COALESCE(s.nom, 'N/A') as service_nom, 
                COALESCE(s.direction, 'N/A') as direction
            FROM benificiaire b
            LEFT JOIN service s ON b.service_id = s.id
        """
        
        where_clause = ""
        params = []
        
        if search:
            where_clause = """
                WHERE (
                    b.nom ILIKE %s OR 
                    b.fonction ILIKE %s OR
                    s.nom ILIKE %s OR
                    s.direction ILIKE %s
                )
            """
            search_param = f"%{search}%"
            params = [search_param, search_param, search_param, search_param]
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM benificiaire b LEFT JOIN service s ON b.service_id = s.id {where_clause}"
        cur.execute(count_query, params)
        total = cur.fetchone()['total']
        
        # Get paginated results
        offset = (page - 1) * per_page
        list_query = f"{base_query} {where_clause} ORDER BY b.nom LIMIT %s OFFSET %s"
        cur.execute(list_query, params + [per_page, offset])
        results = cur.fetchall()
        
        return {
            "items": [dict(r) for r in results],
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0
        }

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