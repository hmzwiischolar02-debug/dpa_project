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
            conn.commit()
            
            return {
                "success": True,
                "message": "Approvisionnement DOTATION ajouté avec succès",
                "id": result['id']
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
                 matricule_conducteur, service_externe, ville_origine,
                 ordre_mission, police_vehicule, observations)
                VALUES ('MISSION', %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                appro.qte,
                appro.km_precedent,
                appro.km,
                appro.matricule_conducteur,
                appro.service_externe,
                appro.ville_origine,
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

@router.get("/list", response_model=List[ApprovisionnementDetail])
async def list_approvisionnements(
    skip: int = 0,
    limit: int = 1000,
    type_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all approvisionnements (both DOTATION and MISSION types)"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        # Combined query using UNION for both types
        query = """
            SELECT 
                id, 'DOTATION' as type_approvi, date, numero_bon, qte, km_precedent, km, anomalie,
                police, nCivil, marque, carburant, 
                COALESCE(vhc_provisoire, police) as vehicule_utilise,
                vhc_provisoire,
                benificiaire_nom, benificiaire_fonction, service_nom as service_nom, service_direction as direction,
                dotation_id, mois, annee, dotation_qte as quota, qte_consomme, dotation_reste as reste,
                NULL as matricule_conducteur, NULL as service_externe,
                NULL as ville_origine, NULL as ordre_mission, NULL as police_vehicule,
                observations
            FROM v_appro_dotation
        """
        
        if type_filter == 'MISSION':
            query = """
                SELECT 
                    id, 'MISSION' as type_approvi, date, numero_bon, qte, km_precedent, km, anomalie,
                    NULL as police, NULL as nCivil, NULL as marque, NULL as carburant,
                    police_vehicule as vehicule_utilise, NULL as vhc_provisoire,
                    NULL as benificiaire_nom, NULL as benificiaire_fonction,
                    NULL as service_nom, NULL as direction,
                    NULL as dotation_id, NULL as mois, NULL as annee, NULL as quota,
                    NULL as qte_consomme, NULL as reste,
                    matricule_conducteur, service_externe, ville_origine,
                    ordre_mission, police_vehicule, observations
                FROM v_appro_mission
            """
        elif type_filter is None:
            query = """
                SELECT * FROM (
                    SELECT 
                        id, 'DOTATION' as type_approvi, date, numero_bon, qte, km_precedent, km, anomalie,
                        police, nCivil, marque, carburant,
                        COALESCE(vhc_provisoire, police) as vehicule_utilise,
                        vhc_provisoire,
                        benificiaire_nom, benificiaire_fonction, service_nom, service_direction as direction,
                        dotation_id, mois, annee, dotation_qte as quota, qte_consomme, dotation_reste as reste,
                        NULL as matricule_conducteur, NULL as service_externe,
                        NULL as ville_origine, NULL as ordre_mission, NULL as police_vehicule,
                        observations
                    FROM v_appro_dotation
                    UNION ALL
                    SELECT 
                        id, 'MISSION' as type_approvi, date, numero_bon, qte, km_precedent, km, anomalie,
                        NULL as police, NULL as nCivil, NULL as marque, NULL as carburant,
                        police_vehicule as vehicule_utilise, NULL as vhc_provisoire,
                        NULL as benificiaire_nom, NULL as benificiaire_fonction,
                        NULL as service_nom, NULL as direction,
                        NULL as dotation_id, NULL as mois, NULL as annee, NULL as quota,
                        NULL as qte_consomme, NULL as reste,
                        matricule_conducteur, service_externe, ville_origine,
                        ordre_mission, police_vehicule, observations
                    FROM v_appro_mission
                ) combined
            """
        
        query += " ORDER BY date DESC LIMIT %s OFFSET %s"
        
        cur.execute(query, (limit, skip))
        results = cur.fetchall()
        
        return [{
            "id": row['id'],
            "type_approvi": row['type_approvi'],
            "date": row['date'],
            "qte": float(row['qte']),
            "km_precedent": row['km_precedent'],
            "km": row['km'],
            "anomalie": row['anomalie'],
            "numero_bon": row['numero_bon'],
            "police": row.get('police'),
            "nCivil": row.get('ncivil'),
            "marque": row.get('marque'),
            "carburant": row.get('carburant'),
            "vehicule_utilise": row.get('vehicule_utilise'),
            "vhc_provisoire": row.get('vhc_provisoire'),
            "benificiaire_nom": row.get('benificiaire_nom'),
            "service_nom": row.get('service_nom'),
            "direction": row.get('direction'),
            "dotation_id": row.get('dotation_id'),
            "mois": row.get('mois'),
            "annee": row.get('annee'),
            "quota": row.get('quota'),
            "qte_consomme": float(row['qte_consomme']) if row.get('qte_consomme') else None,
            "reste": float(row['reste']) if row.get('reste') else None,
            "matricule_conducteur": row.get('matricule_conducteur'),
            "service_externe": row.get('service_externe'),
            "ville_origine": row.get('ville_origine'),
            "ordre_mission": row.get('ordre_mission'),
            "police_vehicule": row.get('police_vehicule'),
            "observations": row.get('observations')
        } for row in results]

@router.delete("/{appro_id}")
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