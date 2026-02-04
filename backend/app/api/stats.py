from fastapi import APIRouter, Depends
from app.schemas.schemas import (
    DashboardStats,
    ConsommationParJour,
    ConsommationParCarburant,
    ConsommationParService,
    ConsommationParType
)
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user
from typing import List

router = APIRouter(prefix="/stats", tags=["Statistics"])

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        # Total vehicles
        cur.execute("SELECT COUNT(*) as count FROM vehicule WHERE actif=TRUE")
        total_vehicules = cur.fetchone()['count']
        
        # Active dotations
        cur.execute("SELECT COUNT(*) as count FROM dotation WHERE cloture=FALSE")
        dotations_actives = cur.fetchone()['count']
        
        # Total consumption
        cur.execute("SELECT COALESCE(SUM(qte), 0) as total FROM approvisionnement")
        consommation_totale = float(cur.fetchone()['total'])
        
        # Total quota
        cur.execute("SELECT COALESCE(SUM(qte), 0) as total FROM dotation WHERE cloture=FALSE")
        quota_total = cur.fetchone()['total']
        
        # Consumption by type
        cur.execute("""
            SELECT 
                type_approvi,
                SUM(qte) as total,
                COUNT(*) as nombre
            FROM approvisionnement
            GROUP BY type_approvi
        """)
        type_stats = cur.fetchall()
        
        dotation_stats = next((r for r in type_stats if r['type_approvi'] == 'DOTATION'), None)
        mission_stats = next((r for r in type_stats if r['type_approvi'] == 'MISSION'), None)
        
        return {
            "total_vehicules": total_vehicules,
            "dotations_actives": dotations_actives,
            "consommation_totale": consommation_totale,
            "quota_total": quota_total or 0,
            "consommation_dotation": float(dotation_stats['total']) if dotation_stats else 0,
            "consommation_mission": float(mission_stats['total']) if mission_stats else 0,
            "nombre_appro_dotation": dotation_stats['nombre'] if dotation_stats else 0,
            "nombre_appro_mission": mission_stats['nombre'] if mission_stats else 0
        }

@router.get("/consommation-par-jour", response_model=List[ConsommationParJour])
async def get_consommation_par_jour(current_user: dict = Depends(get_current_user)):
    """Get consumption by day (last 30 days)"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                TO_CHAR(DATE(date), 'YYYY-MM-DD') as date,
                SUM(qte) as total
            FROM approvisionnement
            WHERE date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(date)
            ORDER BY DATE(date) ASC
        """)
        results = cur.fetchall()
        
        return [{"date": r['date'], "total": float(r['total'])} for r in results]

@router.get("/consommation-par-carburant", response_model=List[ConsommationParCarburant])
async def get_consommation_par_carburant(current_user: dict = Depends(get_current_user)):
    """Get consumption by fuel type (DOTATION only)"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                carburant,
                SUM(qte) as total
            FROM v_appro_dotation
            GROUP BY carburant
        """)
        results = cur.fetchall()
        
        return [{"carburant": r['carburant'], "total": float(r['total'])} for r in results]

@router.get("/consommation-par-service", response_model=List[ConsommationParService])
async def get_consommation_par_service(current_user: dict = Depends(get_current_user)):
    """Get consumption by service (DOTATION only)"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                service_nom as service,
                service_direction as direction,
                SUM(qte) as total
            FROM v_appro_dotation
            GROUP BY service_nom, service_direction
            ORDER BY total DESC
        """)
        results = cur.fetchall()
        
        return [{
            "service": r['service'],
            "direction": r['direction'],
            "total": float(r['total'])
        } for r in results]

@router.get("/consommation-par-type", response_model=List[ConsommationParType])
async def get_consommation_par_type(current_user: dict = Depends(get_current_user)):
    """Get consumption by type (DOTATION vs MISSION)"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                type_approvi,
                SUM(qte) as total,
                COUNT(*) as nombre
            FROM approvisionnement
            GROUP BY type_approvi
        """)
        results = cur.fetchall()
        
        return [{
            "type_approvi": r['type_approvi'],
            "total": float(r['total']),
            "nombre": r['nombre']
        } for r in results]

@router.get("/anomalies", response_model=List[dict])
async def get_anomalies(current_user: dict = Depends(get_current_user)):
    """Get anomalous approvisionnements"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT 
                a.id,
                a.date,
                a.qte,
                a.km_precedent,
                a.km,
                (a.km - a.km_precedent) as km_difference,
                v.police,
                v.marque,
                b.nom as benificiaire,
                s.nom as service
            FROM approvisionnement a
            JOIN dotation d ON a.dotation_id = d.id
            JOIN vehicule v ON d.vehicule_id = v.id
            JOIN benificiaire b ON d.benificiaire_id = b.id
            JOIN service s ON b.service_id = s.id
            WHERE a.type_approvi = 'DOTATION' 
              AND a.anomalie = TRUE
            ORDER BY a.date DESC
        """)
        results = cur.fetchall()
        
        return [{
            "id": r['id'],
            "date": r['date'],
            "qte": float(r['qte']),
            "km_precedent": r['km_precedent'],
            "km": r['km'],
            "km_difference": r['km_difference'],
            "police": r['police'],
            "marque": r['marque'],
            "benificiaire": r['benificiaire'],
            "service": r['service']
        } for r in results]