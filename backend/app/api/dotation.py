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

@router.get("/available-vehicles", response_model=List[dict])
async def get_available_vehicles(
    mois: int,
    annee: int,
    current_user: dict = Depends(get_current_user)
):
    """Get vehicles without active dotation for given month/year"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT v.id, v.police, v.ncivil, v.marque, v.carburant
            FROM vehicule v
            WHERE v.actif = TRUE
            AND NOT EXISTS (
                SELECT 1 FROM dotation d
                WHERE d.vehicule_id = v.id
                AND d.mois = %s
                AND d.annee = %s
                AND d.cloture = FALSE
            )
            ORDER BY v.police
        """, (mois, annee))
        results = cur.fetchall()
        return [dict(r) for r in results]

@router.get("/available-benificiaires", response_model=List[dict])
async def get_available_benificiaires(
    mois: int,
    annee: int,
    current_user: dict = Depends(get_current_user)
):
    """Get beneficiaires without active dotation for given month/year"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT b.id, b.matricule, b.nom, b.fonction, b.service_id,
                   s.nom as service_nom, s.direction
            FROM benificiaire b
            LEFT JOIN service s ON b.service_id = s.id
            WHERE NOT EXISTS (
                SELECT 1 FROM dotation d
                WHERE d.benificiaire_id = b.id
                AND d.mois = %s
                AND d.annee = %s
                AND d.cloture = FALSE
            )
            ORDER BY b.nom
        """, (mois, annee))
        results = cur.fetchall()
        return [dict(r) for r in results]

@router.get("/active", response_model=dict)
async def get_active_dotations(
    page: int = 1,
    per_page: int = 10,
    search: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all active (non-closed) dotations with pagination and search"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        # Build base query
        base_query = """
            SELECT 
                d.id, d.vehicule_id, v.police, v.nCivil, v.marque, v.carburant,
                b.nom AS benificiaire_nom, b.fonction AS benificiaire_fonction,
                s.nom AS service_nom, s.direction, d.mois, d.annee,
                d.qte, d.qte_consomme, d.reste, d.cloture
            FROM dotation d
            JOIN vehicule v ON d.vehicule_id = v.id
            JOIN benificiaire b ON d.benificiaire_id = b.id
            JOIN service s ON b.service_id = s.id
            WHERE d.cloture = FALSE
        """
        
        params = []
        if search:
            base_query += """ AND (
                v.police ILIKE %s OR 
                b.nom ILIKE %s OR 
                s.nom ILIKE %s
            )"""
            search_param = f"%{search}%"
            params = [search_param, search_param, search_param]
        
        # Get total count - corrected for dict cursor
        count_query = "SELECT COUNT(*) as total FROM dotation WHERE cloture = FALSE"
        
        if search:
            count_query += """ AND (
                EXISTS (SELECT 1 FROM vehicule v WHERE v.id = dotation.vehicule_id AND v.police ILIKE %s) OR
                EXISTS (SELECT 1 FROM benificiaire b WHERE b.id = dotation.benificiaire_id AND b.nom ILIKE %s) OR
                EXISTS (SELECT 1 FROM benificiaire b JOIN service s ON b.service_id = s.id WHERE b.id = dotation.benificiaire_id AND s.nom ILIKE %s)
            )"""
            cur.execute(count_query, [search_param, search_param, search_param])
        else:
            cur.execute(count_query)
        
        result = cur.fetchone()
        total = result['total'] if result else 0
        
        # Get paginated results
        offset = (page - 1) * per_page
        list_query = base_query + " ORDER BY s.nom, v.police LIMIT %s OFFSET %s"
        cur.execute(list_query, params + [per_page, offset])
        results = cur.fetchall()
        
        return {
            "items": [{
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
            } for row in results],
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0
        }

@router.get("/archived", response_model=dict)
async def get_archived_dotations(
    page: int = 1,
    per_page: int = 10,
    search: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all archived (closed) dotations with pagination"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        base_query = """
            SELECT 
                d.id, d.vehicule_id, v.police, v.nCivil, v.marque, v.carburant,
                b.nom AS benificiaire_nom, b.fonction AS benificiaire_fonction,
                s.nom AS service_nom, s.direction, d.mois, d.annee,
                d.qte, d.qte_consomme, d.reste, d.cloture
            FROM dotation d
            JOIN vehicule v ON d.vehicule_id = v.id
            JOIN benificiaire b ON d.benificiaire_id = b.id
            JOIN service s ON b.service_id = s.id
            WHERE d.cloture = TRUE
        """
        
        params = []
        if search:
            base_query += """ AND (
                v.police ILIKE %s OR 
                b.nom ILIKE %s OR 
                s.nom ILIKE %s
            )"""
            search_param = f"%{search}%"
            params = [search_param, search_param, search_param]
        
        # Count - corrected for dict cursor
        count_query = "SELECT COUNT(*) as total FROM dotation WHERE cloture = TRUE"
        
        if search:
            count_query += """ AND (
                EXISTS (SELECT 1 FROM vehicule v WHERE v.id = dotation.vehicule_id AND v.police ILIKE %s) OR
                EXISTS (SELECT 1 FROM benificiaire b WHERE b.id = dotation.benificiaire_id AND b.nom ILIKE %s) OR
                EXISTS (SELECT 1 FROM benificiaire b JOIN service s ON b.service_id = s.id WHERE b.id = dotation.benificiaire_id AND s.nom ILIKE %s)
            )"""
            cur.execute(count_query, [search_param, search_param, search_param])
        else:
            cur.execute(count_query)
        
        result = cur.fetchone()
        total = result['total'] if result else 0
        
        # Paginated results
        offset = (page - 1) * per_page
        list_query = base_query + " ORDER BY d.annee DESC, d.mois DESC, s.nom, v.police LIMIT %s OFFSET %s"
        cur.execute(list_query, params + [per_page, offset])
        results = cur.fetchall()
        
        return {
            "items": [{
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
            } for row in results],
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0
        }

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

@router.put("/{dotation_id}")
async def update_dotation(
    dotation_id: int,
    dotation: DotationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update a dotation (admin only)"""
    if current_user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        try:
            cur.execute("""
                UPDATE dotation 
                SET vehicule_id=%s, benificiaire_id=%s, mois=%s, annee=%s, qte=%s
                WHERE id=%s
                RETURNING id
            """, (dotation.vehicule_id, dotation.benificiaire_id, dotation.mois, dotation.annee, dotation.qte, dotation_id))
            
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Dotation non trouvée")
            
            conn.commit()
            return {"success": True, "message": "Dotation modifiée"}
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=str(e))

@router.put("/{dotation_id}/close")
async def close_dotation(
    dotation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Close a dotation (admin only)"""
    if current_user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            UPDATE dotation 
            SET cloture=TRUE
            WHERE id=%s
            RETURNING id
        """, (dotation_id,))
        
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Dotation non trouvée")
        
        conn.commit()
        return {"success": True, "message": "Dotation clôturée"}