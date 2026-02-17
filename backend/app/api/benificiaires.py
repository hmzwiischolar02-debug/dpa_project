from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.schemas import Benificiaire, BenificiaireCreate
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user

# redirect_slashes=False → accepts both /benificiaires and /benificiaires/
router = APIRouter(prefix="/benificiaires", tags=["Benificiaires"], redirect_slashes=False)


# ── GET list ──────────────────────────────────────────────────────────────────
@router.get("")
async def list_benificiaires(
    page: int = 1,
    per_page: int = 20,
    search: str = None,
    current_user: dict = Depends(get_current_user)
):
    with get_db() as conn:
        cur = get_db_cursor(conn)

        base_query = """
            SELECT
                b.id, b.matricule, b.nom, b.fonction, b.service_id,
                COALESCE(s.nom, 'N/A')       AS service_nom,
                COALESCE(s.direction, 'N/A') AS direction
            FROM benificiaire b
            LEFT JOIN service s ON b.service_id = s.id
        """

        where_clause = ""
        params = []

        if search:
            where_clause = """
                WHERE (
                    b.nom       ILIKE %s OR
                    b.matricule ILIKE %s OR
                    b.fonction  ILIKE %s OR
                    s.nom       ILIKE %s OR
                    s.direction ILIKE %s
                )
            """
            sp = f"%{search}%"
            params = [sp, sp, sp, sp, sp]

        count_query = f"""
            SELECT COUNT(*) FROM benificiaire b
            LEFT JOIN service s ON b.service_id = s.id
            {where_clause}
        """
        cur.execute(count_query, params)
        row = cur.fetchone()
        total = row[0] if isinstance(row, tuple) else row['count']

        offset = (page - 1) * per_page
        cur.execute(
            f"{base_query} {where_clause} ORDER BY b.nom LIMIT %s OFFSET %s",
            params + [per_page, offset]
        )
        results = cur.fetchall()

        items = [{
            'id':          r['id'],
            'matricule':   r['matricule'],
            'nom':         r['nom'],
            'fonction':    r['fonction'],
            'service_id':  r['service_id'],
            'service_nom': r.get('service_nom', 'N/A'),
            'direction':   r.get('direction',   'N/A'),
        } for r in results]

        return {
            "items": items,
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0
        }


# ── POST create ───────────────────────────────────────────────────────────────
@router.post("")
async def create_benificiaire(
    benificiaire: BenificiaireCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")

    with get_db() as conn:
        cur = get_db_cursor(conn)
        try:
            matricule = (benificiaire.matricule or '').strip()
            if not matricule:
                cur.execute("SELECT COUNT(*) AS cnt FROM benificiaire")
                cnt = cur.fetchone()['cnt']
                matricule = f"B{cnt + 1:04d}"

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


# ── GET by-service  (BEFORE /{id} to avoid int-cast conflict) ─────────────────
@router.get("/by-service/{service_id}")
async def get_benificiaires_by_service(
    service_id: int,
    current_user: dict = Depends(get_current_user)
):
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT b.*, COALESCE(s.nom,'') AS service_nom,
                        COALESCE(s.direction,'') AS direction
            FROM benificiaire b
            LEFT JOIN service s ON b.service_id = s.id
            WHERE b.service_id = %s
            ORDER BY b.nom
        """, (service_id,))
        return [dict(r) for r in cur.fetchall()]


# ── GET single ────────────────────────────────────────────────────────────────
@router.get("/{benificiaire_id}")
async def get_benificiaire(
    benificiaire_id: int,
    current_user: dict = Depends(get_current_user)
):
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("SELECT * FROM benificiaire WHERE id=%s", (benificiaire_id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Bénéficiaire non trouvé")
        return dict(result)


# ── PUT update ────────────────────────────────────────────────────────────────
@router.put("/{benificiaire_id}")
async def update_benificiaire(
    benificiaire_id: int,
    benificiaire: BenificiaireCreate,
    current_user: dict = Depends(get_current_user)
):
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


# ── DELETE ────────────────────────────────────────────────────────────────────
@router.delete("/{benificiaire_id}")
async def delete_benificiaire(
    benificiaire_id: int,
    current_user: dict = Depends(get_current_user)
):
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