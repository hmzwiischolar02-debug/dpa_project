from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.schemas import Benificiaire, BenificiaireCreate
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user

router = APIRouter(prefix="/benificiaires", tags=["Benificiaires"])
@router.get("/")
async def list_benificiaires(
    page: int = 1,
    per_page: int = 10,
    search: str = None,
    current_user: dict = Depends(get_current_user)
):
    with get_db() as conn:
        cur = get_db_cursor(conn)

        base_query = """
            SELECT 
                b.id,
                b.matricule,
                b.nom,
                b.fonction,
                b.service_id,
                s.nom AS service_nom,
                s.direction AS direction
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
            params = [search_param] * 4

        # 🔢 total count (FIXED)
        count_query = f"""
            SELECT COUNT(*) AS count
            FROM benificiaire b
            LEFT JOIN service s ON b.service_id = s.id
            {where_clause}
        """
        cur.execute(count_query, params)
        row = cur.fetchone()
        total = row["count"] if row else 0

        # 📄 paginated data
        offset = (page - 1) * per_page
        list_query = f"""
            {base_query}
            {where_clause}
            ORDER BY b.nom
            LIMIT %s OFFSET %s
        """
        cur.execute(list_query, params + [per_page, offset])
        results = cur.fetchall()

        items = [dict(row) for row in results]

        return {
            "items": items,
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0
        }
