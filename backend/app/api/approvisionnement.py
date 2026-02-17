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

@router.post("/search-mission", response_model=dict)
async def search_vehicle_mission(
    search: ApprovisionnementSearch,
    current_user: dict = Depends(get_current_user)
):
    """Search for any active vehicle by police number - for MISSION (no dotation required)"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT
                v.id,
                v.police,
                v.nCivil,
                v.marque,
                v.carburant,
                v.km,
                -- Get beneficiary matricule from active dotation if exists
                (
                    SELECT b.matricule
                    FROM dotation d
                    JOIN benificiaire b ON b.id = d.benificiaire_id
                    WHERE d.vehicule_id = v.id
                      AND d.cloture = FALSE
                    ORDER BY d.id DESC
                    LIMIT 1
                ) as matricule_conducteur,
                -- Get beneficiary name too (for display)
                (
                    SELECT b.nom
                    FROM dotation d
                    JOIN benificiaire b ON b.id = d.benificiaire_id
                    WHERE d.vehicule_id = v.id
                      AND d.cloture = FALSE
                    ORDER BY d.id DESC
                    LIMIT 1
                ) as benificiaire_nom
            FROM vehicule v
            WHERE v.police = %s
              AND v.actif = TRUE
        """, (search.police,))

        result = cur.fetchone()

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Véhicule non trouvé ou inactif"
            )

        return {
            "id": result['id'],
            "police": result['police'],
            "nCivil": result['ncivil'],
            "marque": result['marque'],
            "carburant": result['carburant'],
            "km": result['km'],
            "matricule_conducteur": result['matricule_conducteur'],  # None if no active dotation
            "benificiaire_nom": result['benificiaire_nom']           # None if no active dotation
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

            # If provisoire vehicle is used AND km_provisoire is provided
            # Try to update the provisoire vehicle's KM in the database
            if appro.vhc_provisoire and appro.km_provisoire:
                try:
                    cur.execute("""
                        UPDATE vehicule 
                        SET km = %s 
                        WHERE police = %s
                        RETURNING id
                    """, (appro.km_provisoire, appro.vhc_provisoire))
                    
                    updated = cur.fetchone()
                    if updated:
                        print(f"✅ Updated provisoire vehicle {appro.vhc_provisoire} KM to {appro.km_provisoire}")
                    else:
                        print(f"ℹ️ Provisoire vehicle {appro.vhc_provisoire} not found in DB - continuing without update")
                except Exception as e:
                    # Don't fail the entire operation if provisoire update fails
                    print(f"⚠️ Could not update provisoire vehicle KM: {str(e)}")
            
            # Auto-close dotation if quota reached
            cur.execute("""
                UPDATE dotation
                SET cloture = TRUE
                WHERE id = %s
                AND qte_consomme >= qte
                AND cloture = FALSE
            """, (appro.dotation_id,))
            
            # Fetch the auto-generated numero_bon from the trigger
            # Must be after commit so trigger value is fully persisted
            conn.commit()

            cur.execute("SELECT numero_bon FROM approvisionnement WHERE id = %s", (appro_id,))
            bon_row = cur.fetchone()
            numero_bon = bon_row['numero_bon'] if bon_row else None

            return {
                "success": True,
                "message": "Approvisionnement DOTATION ajouté avec succès",
                "id": appro_id,
                "numero_bon": numero_bon
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
                 num_envoi, police_vehicule, observations)
                VALUES ('MISSION', %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                appro.qte,
                appro.km_precedent,
                appro.km,
                appro.matricule_conducteur,
                appro.service_affecte,
                appro.destination,
                appro.num_envoi,
                appro.police_vehicule,
                appro.observations
            ))
            
            result = cur.fetchone()
            appro_id = result['id']

            # Commit first so trigger value is fully persisted
            conn.commit()

            # Fetch the auto-generated numero_bon
            cur.execute("SELECT numero_bon FROM approvisionnement WHERE id = %s", (appro_id,))
            bon_row = cur.fetchone()
            numero_bon = bon_row['numero_bon'] if bon_row else None

            return {
                "success": True,
                "message": "Approvisionnement MISSION ajouté avec succès",
                "id": appro_id,
                "numero_bon": numero_bon
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
        
        # Build query
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
        
        # Get paginated results with explicit aliases - avoids column conflicts
        offset = (page - 1) * per_page
        cur.execute(f"""
            SELECT 
                a.id,
                a.type_approvi,
                a.date,
                a.qte,
                a.km_precedent,
                a.km,
                a.vhc_provisoire,
                a.km_provisoire,
                a.observations,
                a.anomalie,
                a.dotation_id,
                a.police_vehicule,
                a.matricule_conducteur,
                a.service_affecte,
                a.destination,
                a.num_envoi,
                -- dotation fields with explicit aliases
                d.qte         AS dotation_quota,
                d.reste       AS dotation_reste,
                d.qte_consomme AS dotation_consomme,
                d.mois        AS dotation_mois,
                d.annee       AS dotation_annee,
                -- vehicle fields
                COALESCE(v.police, a.police_vehicule)          AS police,
                COALESCE(v.marque, '')                         AS marque,
                COALESCE(v.carburant, 'gazoil')                AS carburant,
                COALESCE(v.ncivil, '')                          AS ncivil,
                -- receipt number
                a.numero_bon,
                -- beneficiary fields (benificiaire_nom also used as chef_nom for PDF)
                COALESCE(b.nom, a.matricule_conducteur)        AS benificiaire_nom,
                COALESCE(b.fonction, '')                       AS benificiaire_fonction,
                COALESCE(b.matricule, '')                      AS benificiaire_matricule,
                -- service fields
                COALESCE(s.nom, a.service_affecte)             AS service_nom,
                COALESCE(s.direction, '')                      AS direction,
                -- provisoire vehicle
                vp.km     AS vhc_provisoire_km_db,
                vp.marque AS vhc_provisoire_marque
            FROM approvisionnement a
            LEFT JOIN dotation d    ON a.dotation_id = d.id AND a.type_approvi = 'DOTATION'
            LEFT JOIN vehicule v    ON d.vehicule_id = v.id
            LEFT JOIN benificiaire b ON d.benificiaire_id = b.id
            LEFT JOIN service s     ON b.service_id = s.id
            LEFT JOIN vehicule vp   ON a.vhc_provisoire = vp.police
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
                v.police, b.nom as benificiaire_nom, s.nom as service_nom,d.qte,d.reste,d.qte_consomme 
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
                police_vehicule, matricule_conducteur, service_affecte
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

@router.get("/by-dotation/{dotation_id}", response_model=List[dict])
async def get_approvisionnements_by_dotation(
    dotation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get all approvisionnements for a specific dotation (Feature 1)"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                a.id, a.type_approvi, a.date, a.qte, a.km_precedent, a.km,
                a.vhc_provisoire, a.km_provisoire, a.observations,
                v.police, v.marque, v.carburant,
                b.nom as benificiaire_nom,
                s.nom as service_nom
            FROM approvisionnement a
            JOIN dotation d ON a.dotation_id = d.id
            JOIN vehicule v ON d.vehicule_id = v.id
            JOIN benificiaire b ON d.benificiaire_id = b.id
            JOIN service s ON b.service_id = s.id
            WHERE a.dotation_id = %s
            ORDER BY a.date DESC
        """, (dotation_id,))
        results = cur.fetchall()
        return [dict(r) for r in results]

@router.get("/by-dotation/{dotation_id}", response_model=List[dict])
async def get_approvisionnements_by_dotation(
    dotation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get all approvisionnements for a specific dotation (Feature 1)"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                a.id, a.type_approvi, a.date, a.qte, a.km_precedent, a.km,
                a.vhc_provisoire, a.km_provisoire, a.observations,
                v.police, v.marque, v.carburant,
                b.nom as benificiaire_nom,
                s.nom as service_nom
            FROM approvisionnement a
            JOIN dotation d ON a.dotation_id = d.id
            JOIN vehicule v ON d.vehicule_id = v.id
            JOIN benificiaire b ON d.benificiaire_id = b.id
            JOIN service s ON b.service_id = s.id
            WHERE a.dotation_id = %s
            ORDER BY a.date DESC
        """, (dotation_id,))
        results = cur.fetchall()
        return [dict(r) for r in results]
    
    # ADD THIS TO backend/app/api/approvisionnement.py

@router.get("/last-km/{police}")
async def get_last_km_for_vehicle(
    police: str,
    current_user: dict = Depends(get_current_user)
):
    """Get the last recorded KM for a vehicle by police number"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        # Try to find from DOTATION approvisionnements first
        cur.execute("""
            SELECT a.km
            FROM approvisionnement a
            JOIN dotation d ON a.dotation_id = d.id
            JOIN vehicule v ON d.vehicule_id = v.id
            WHERE v.police = %s AND a.type_approvi = 'DOTATION'
            ORDER BY a.date DESC, a.id DESC
            LIMIT 1
        """, (police,))
        
        result = cur.fetchone()
        
        if result:
            return {
                "police": police,
                "last_km": result['km'],
                "source": "dotation"
            }
        
        # If not found in dotation, try MISSION approvisionnements
        cur.execute("""
            SELECT km
            FROM approvisionnement
            WHERE police_vehicule = %s AND type_approvi = 'MISSION'
            ORDER BY date DESC, id DESC
            LIMIT 1
        """, (police,))
        
        result = cur.fetchone()
        
        if result:
            return {
                "police": police,
                "last_km": result['km'],
                "source": "mission"
            }
        
        # If still not found, try from vehicule table
        cur.execute("""
            SELECT km
            FROM vehicule
            WHERE police = %s
        """, (police,))
        
        result = cur.fetchone()
        
        if result:
            return {
                "police": police,
                "last_km": result['km'],
                "source": "vehicule"
            }
        
        # Not found anywhere
        return {
            "police": police,
            "last_km": None,
            "source": None
        }
    

    # REPLACE THE /list ENDPOINT IN backend/app/api/approvisionnement.py with this:

# REPLACE the /list endpoint in backend/app/api/approvisionnement.py

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
    """List all approvisionnements with filters and pagination - WITH JOINED DATA"""
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
        count_query = f"""
            SELECT COUNT(*) as total 
            FROM approvisionnement a
            LEFT JOIN dotation d ON a.dotation_id = d.id AND a.type_approvi = 'DOTATION'
            {where_clause}
        """
        cur.execute(count_query, params)
        total = cur.fetchone()['total']
        
        # Get paginated results WITH JOINS
        offset = (page - 1) * per_page
        list_query = f"""
            SELECT 
                a.*,
                CASE WHEN a.type_approvi = 'DOTATION' THEN b.fonction ELSE NULL END as fonction,
                CASE WHEN a.type_approvi = 'DOTATION' THEN s.direction ELSE NULL END as direction,
                CASE WHEN a.type_approvi = 'DOTATION' THEN b.nom ELSE a.matricule_conducteur END as benificiaire_nom,
                CASE WHEN a.type_approvi = 'DOTATION' THEN s.nom ELSE a.service_affecte END as service_nom,
                CASE WHEN a.type_approvi = 'DOTATION' THEN v.police ELSE a.police_vehicule END as police,
                CASE WHEN a.type_approvi = 'DOTATION' THEN v.marque ELSE NULL END as marque,
                CASE WHEN a.type_approvi = 'DOTATION' THEN v.carburant ELSE 'gazoil' END as carburant
            FROM approvisionnement a
            LEFT JOIN dotation d ON a.dotation_id = d.id AND a.type_approvi = 'DOTATION'
            LEFT JOIN benificiaire b ON d.benificiaire_id = b.id
            LEFT JOIN service s ON b.service_id = s.id
            LEFT JOIN vehicule v ON d.vehicule_id = v.id
            {where_clause}
            ORDER BY a.date DESC, a.id DESC
            LIMIT %s OFFSET %s
        """
        cur.execute(list_query, params + [per_page, offset])
        
        results = cur.fetchall()
        return {
            "items": [dict(r) for r in results],
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0
        }