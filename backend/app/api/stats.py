from fastapi import APIRouter, Depends
from typing import List
from app.schemas.schemas import (
    DashboardStats,
    ConsommationParJour,
    ConsommationParCarburant,
    ConsommationParService
)
from app.db.database import get_db, get_db_cursor
from app.api.auth import get_current_user

router = APIRouter(prefix="/stats", tags=["Statistics"])

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics overview"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        # Total vehicles
        cur.execute("SELECT COUNT(*) as count FROM vehicule WHERE actif=TRUE")
        total_vehicules = cur.fetchone()['count']
        
        # Total dotations
        cur.execute("SELECT COUNT(*) as count FROM dotation")
        total_dotations = cur.fetchone()['count']
        
        # Active dotations
        cur.execute("SELECT COUNT(*) as count FROM dotation WHERE cloture=FALSE")
        dotations_actives = cur.fetchone()['count']
        
        # Closed dotations
        cur.execute("SELECT COUNT(*) as count FROM dotation WHERE cloture=TRUE")
        dotations_closes = cur.fetchone()['count']
        
        # Total benificiaires
        cur.execute("SELECT COUNT(*) as count FROM benificiaire")
        total_benificiaires = cur.fetchone()['count']
        
        # Total services
        cur.execute("SELECT COUNT(*) as count FROM service")
        total_services = cur.fetchone()['count']
        
        # Total consumption
        cur.execute("SELECT COALESCE(SUM(qte_consomme), 0) as total FROM dotation")
        consommation_totale = float(cur.fetchone()['total'])
        
        # Total quota (active only)
        cur.execute("SELECT COALESCE(SUM(qte), 0) as total FROM dotation WHERE cloture=FALSE")
        quota_total = cur.fetchone()['total'] or 0
        
        return {
            "total_vehicules": total_vehicules,
            "total_dotations": total_dotations,
            "dotations_actives": dotations_actives,
            "dotations_closes": dotations_closes,
            "total_benificiaires": total_benificiaires,
            "total_services": total_services,
            "consommation_totale": consommation_totale,
            "quota_total": quota_total
        }

@router.get("/consommation-par-jour", response_model=List[ConsommationParJour])
async def get_consommation_par_jour(current_user: dict = Depends(get_current_user)):
    """Get fuel consumption grouped by day"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT DATE(a.date) as date, SUM(a.qte) as total
            FROM approvisionnement a
            GROUP BY DATE(a.date)
            ORDER BY DATE(a.date) DESC
            LIMIT 30
        """)
        
        results = cur.fetchall()
        
        return [{
            "date": str(row['date']),
            "total": float(row['total'])
        } for row in results]

@router.get("/consommation-par-carburant", response_model=List[ConsommationParCarburant])
async def get_consommation_par_carburant(current_user: dict = Depends(get_current_user)):
    """Get fuel consumption grouped by fuel type (gazoil vs essence)"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT v.carburant, SUM(a.qte) as total
            FROM approvisionnement a
            JOIN dotation d ON d.id=a.dotation_id
            JOIN vehicule v ON v.id=d.vehicule_id
            GROUP BY v.carburant
            ORDER BY total DESC
        """)
        
        results = cur.fetchall()
        
        return [{
            "carburant": row['carburant'],
            "total": float(row['total'])
        } for row in results]

@router.get("/consommation-par-service", response_model=List[ConsommationParService])
async def get_consommation_par_service(current_user: dict = Depends(get_current_user)):
    """Get fuel consumption grouped by service"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT s.nom as service, s.direction, SUM(a.qte) as total
            FROM approvisionnement a
            JOIN dotation d ON d.id=a.dotation_id
            JOIN vehicule v ON v.id=d.vehicule_id
            JOIN service s ON s.id=v.service_id
            GROUP BY s.nom, s.direction
            ORDER BY total DESC
        """)
        
        results = cur.fetchall()
        
        return [{
            "service": row['service'],
            "direction": row['direction'],
            "total": float(row['total'])
        } for row in results]

@router.get("/anomalies")
async def get_anomalies(current_user: dict = Depends(get_current_user)):
    """Get list of fuel supply entries marked as anomalies"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute("""
            SELECT a.id, a.date, a.qte, a.km_precedent, a.km_actuel,
                   v.police, v.nCivil, v.marque,
                   b.nom as benificiaire, s.nom as service
            FROM approvisionnement a
            JOIN dotation d ON d.id=a.dotation_id
            JOIN vehicule v ON v.id=d.vehicule_id
            JOIN benificiaire b ON b.id=d.benificiaire_id
            JOIN service s ON s.id=v.service_id
            WHERE a.anomalie=TRUE
            ORDER BY a.date DESC
        """)
        
        results = cur.fetchall()
        return results

@router.get("/monthly/{mois}/{annee}")
async def get_monthly_stats(
    mois: int,
    annee: int,
    current_user: dict = Depends(get_current_user)
):
    """Get statistics for a specific month"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        
        # Total quotas for the month
        cur.execute("""
            SELECT COALESCE(SUM(qte), 0) as total_quota,
                   COALESCE(SUM(qte_consomme), 0) as total_consomme,
                   COALESCE(SUM(reste), 0) as total_reste,
                   COUNT(*) as total_dotations
            FROM dotation
            WHERE mois=%s AND annee=%s
        """, (mois, annee))
        
        result = cur.fetchone()
        
        return {
            "mois": mois,
            "annee": annee,
            "total_quota": result['total_quota'],
            "total_consomme": float(result['total_consomme']),
            "total_reste": float(result['total_reste']),
            "total_dotations": result['total_dotations']
        }