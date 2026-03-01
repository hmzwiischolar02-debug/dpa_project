from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.schemas.schemas import (
    ApprovisionnementSearch,
    ApprovisionnementDotationCreate,
    ApprovisionnementMissionCreate,
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
    """Search for vehicle with active dotation by police number"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT DISTINCT ON (v.id)
                d.id as dotation_id, 
                v.police, 
                v.nCivil, 
                v.marque, 
                v.carburant, 
                v.km,
                b.nom as benificiaire, 
                b.fonction, 
                s.nom as service, 
                s.direction,
                d.qte as quota, 
                d.qte_consomme, 
                d.reste,
                COALESCE((
                    SELECT qte 
                    FROM approvisionnement 
                    WHERE dotation_id=d.id 
                    AND type_approvi='DOTATION'
                    ORDER BY date DESC 
                    LIMIT 1
                ), 0) as dernier_appro
            FROM vehicule v
            JOIN dotation d ON d.vehicule_id = v.id
            JOIN benificiaire b ON b.id = d.benificiaire_id
            JOIN service s ON s.id = b.service_id
            WHERE v.police=%s 
              AND d.cloture=FALSE
              AND v.actif=TRUE
            ORDER BY v.id, d.id DESC
        """, (search.police,))
        
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail="Véhicule non trouvé, dotation clôturée, ou véhicule inactif"
            )
        
        return {
            "dotation_id": result['dotation_id'],
            "police": result['police'],
            "nCivil": result['ncivil'],
            "marque": result['marque'],
            "carburant": result['carburant'],
            "km": result['km'],
            "benificiaire": result['benificiaire'],
            "fonction": result['fonction'],
            "service": result['service'],
            "direction": result['direction'],
            "quota": result['quota'],
            "qte_consomme": float(result['qte_consomme']),
            "reste": float(result['reste']),
            "dernier_appro": float(result['dernier_appro'])
        }

@router.post("/dotation", response_model=dict)
async def create_dotation_approvisionnement(
    appro: ApprovisionnementDotationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a DOTATION type fuel supply entry"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        try:
            cur.execute("""
                INSERT INTO approvisionnement
                (type_approvi, qte, km_precedent, km, dotation_id, 
                 vhc_provisoire, km_provisoire, observations)
                VALUES ('DOTATION', %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                appro.qte,
                appro.km_precedent,
                appro.km,
                appro.dotation_id,
                appro.vhc_provisoire,
                appro.km_provisoire,
                appro.observations
            ))
            
            result = cur.fetchone()
            appro_id = result['id']
            
            # Auto-close dotation if quota reached
            cur.execute("""
                UPDATE dotation
                SET cloture = TRUE
                WHERE id = %s
                AND qte_consomme >= qte
                AND cloture = FALSE
            """, (appro.dotation_id,))
            
            conn.commit()
            
            return {
                "success": True,
                "message": "Approvisionnement DOTATION ajouté avec succès",
                "id": appro_id
            }
            
        except psycopg2.errors.RaiseException as e:
            conn.rollback()
            error_msg = str(e).split('\n')[0] if e.pgerror else str(e)
            raise HTTPException(status_code=400, detail=error_msg)
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@router.post("/mission", response_model=dict)
async def create_mission_approvisionnement(
    appro: ApprovisionnementMissionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a MISSION type fuel supply entry"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        try:
            cur.execute("""
                INSERT INTO approvisionnement
                (type_approvi, qte, km_precedent, km,
                 matricule_conducteur, service_affecte, destination,
                 ordre_mission, police_vehicule, observations)
                VALUES ('MISSION', %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                appro.qte,
                appro.km_precedent,
                appro.km,
                appro.matricule_conducteur,
                appro.service_affecte,
                appro.destination,
                appro.ordre_mission,
                appro.police_vehicule,
                appro.observations
            ))
            
            result = cur.fetchone()
            conn.commit()
            
            return {
                "success": True,
                "message": "Approvisionnement MISSION ajouté avec succès",
                "id": result['id']
            }
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@router.get("/list", response_model=dict)
async def list_approvisionnements(
    page: int = 1,
    per_page: int = 20,
    type_filter: str = None,
    date_from: str = None,
    date_to: str = None,
    mois: int = None,
    annee: int = None,
    current_user: dict = Depends(get_current_user)
):
    """List all approvisionnements with filters and pagination"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        # Build WHERE clauses
        where_clauses = []
        params = []
        
        if type_filter and type_filter != 'all':
            where_clauses.append("a.type_approvi = %s")
            params.append(type_filter)
        
        if date_from:
            where_clauses.append("a.date >= %s")
            params.append(date_from)
        
        if date_to:
            where_clauses.append("a.date <= %s")
            params.append(date_to)
        
        if mois and annee:
            where_clauses.append("EXTRACT(MONTH FROM a.date) = %s AND EXTRACT(YEAR FROM a.date) = %s")
            params.extend([mois, annee])
        elif annee:
            where_clauses.append("EXTRACT(YEAR FROM a.date) = %s")
            params.append(annee)
        
        where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        
        # Count total
        count_query = f"SELECT COUNT(*) as total FROM approvisionnement a {where_clause}"
        cur.execute(count_query, params)
        total = cur.fetchone()['total']
        
        # Get paginated results with JOINs for DOTATION details
        offset = (page - 1) * per_page
        cur.execute(f"""
            SELECT 
                a.id,
                a.type_approvi,
                a.date,
                a.qte,
                a.km_precedent,
                a.km,
                a.anomalie,
                a.dotation_id,
                a.vhc_provisoire,
                a.km_provisoire,
                a.matricule_conducteur,
                a.service_affecte,
                a.destination,
                a.ordre_mission,
                a.police_vehicule,
                a.observations,
                a.numero_bon,
                -- DOTATION related fields (NULL for MISSION)
                v.police,
                b.nom as benificiaire_nom,
                s.nom as service_nom
            FROM approvisionnement a
            LEFT JOIN dotation d ON a.dotation_id = d.id
            LEFT JOIN vehicule v ON d.vehicule_id = v.id
            LEFT JOIN benificiaire b ON d.benificiaire_id = b.id
            LEFT JOIN service s ON b.service_id = s.id
            {where_clause}
            ORDER BY a.date DESC, a.id DESC
            LIMIT %s OFFSET %s
        """, params + [per_page, offset])
        
        results = cur.fetchall()
        return {
            "items": [dict(r) for r in results],
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0
        }

@router.get("/by-dotation/{dotation_id}", response_model=List[dict])
async def get_approvisionnements_by_dotation(
    dotation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get all approvisionnements for a specific dotation"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                a.id,
                a.type_approvi,
                a.date,
                a.qte,
                a.km_precedent,
                a.km,
                a.anomalie,
                a.vhc_provisoire,
                a.km_provisoire,
                a.observations,
                a.numero_bon,
                v.police,
                b.nom as benificiaire_nom,
                s.nom as service_nom
            FROM approvisionnement a
            LEFT JOIN dotation d ON a.dotation_id = d.id
            LEFT JOIN vehicule v ON d.vehicule_id = v.id
            LEFT JOIN benificiaire b ON d.benificiaire_id = b.id
            LEFT JOIN service s ON b.service_id = s.id
            WHERE a.dotation_id = %s
            ORDER BY a.date DESC, a.id DESC
        """, (dotation_id,))
        
        results = cur.fetchall()
        return [dict(r) for r in results]

@router.get("/dotation-list", response_model=List[dict])
async def list_dotation_approvisionnements(
    current_user: dict = Depends(get_current_user)
):
    """Get list of DOTATION approvisionnements"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                a.id, a.type_approvi, a.date, a.qte, a.km_precedent, a.km,
                v.police, b.nom as benificiaire_nom, s.nom as service_nom
            FROM approvisionnement a
            LEFT JOIN dotation d ON a.dotation_id = d.id
            LEFT JOIN vehicule v ON d.vehicule_id = v.id
            LEFT JOIN benificiaire b ON d.benificiaire_id = b.id
            LEFT JOIN service s ON b.service_id = s.id
            WHERE a.type_approvi = 'DOTATION'
            ORDER BY a.date DESC
            LIMIT 100
        """)
        results = cur.fetchall()
        return [dict(r) for r in results]

@router.get("/mission-list", response_model=List[dict])
async def list_mission_approvisionnements(
    current_user: dict = Depends(get_current_user)
):
    """Get list of MISSION approvisionnements"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                id, type_approvi, date, qte, km_precedent, km,
                police_vehicule, matricule_conducteur, service_affecte, destination
            FROM approvisionnement
            WHERE type_approvi = 'MISSION'
            ORDER BY date DESC
            LIMIT 100
        """)
        results = cur.fetchall()
        return [dict(r) for r in results]

@router.delete("/{appro_id}", response_model=dict)
async def delete_approvisionnement(
    appro_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete an approvisionnement (admin only)"""
    if current_user['role'] != 'ADMIN':
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute(
            "DELETE FROM approvisionnement WHERE id=%s RETURNING id",
            (appro_id,)
        )
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Approvisionnement non trouvé")
        
        conn.commit()
        return {"success": True, "message": "Approvisionnement supprimé"}