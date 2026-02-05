from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# ============= Auth Schemas =============
class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserInfo(BaseModel):
    id_user: int
    username: str
    role: str
    statut: str

# ============= Service Schemas =============
class ServiceCreate(BaseModel):
    nom: str
    direction: str

class Service(BaseModel):
    id: int
    nom: str
    direction: str

# ============= Benificiaire Schemas =============
class BenificiaireCreate(BaseModel):
    nom: str
    fonction: str
    service_id: int

class Benificiaire(BaseModel):
    id: int
    matricule: str
    nom: str
    fonction: str
    service_id: int

# ============= Vehicle Schemas =============
class VehiculeBase(BaseModel):
    police: str
    nCivil: str = Field(alias='ncivil')
    marque: Optional[str] = None
    carburant: str
    km: int = Field(ge=0)

    class Config:
        populate_by_name = True
        from_attributes = True
        by_alias = False

class VehiculeCreate(VehiculeBase):
    pass

class Vehicule(VehiculeBase):
    id: int
    actif: bool
    created_at: datetime

# ============= Dotation Schemas =============
class DotationBase(BaseModel):
    vehicule_id: int
    benificiaire_id: int
    mois: int = Field(ge=1, le=12)
    annee: int = Field(ge=2020)
    qte: int

class DotationCreate(DotationBase):
    pass

class Dotation(DotationBase):
    id: int
    qte_consomme: float
    reste: float
    cloture: bool
    created_at: datetime

class DotationDetail(BaseModel):
    id: int
    vehicule_id: int
    police: str
    nCivil: str
    marque: Optional[str]
    carburant: str
    benificiaire_nom: str
    benificiaire_fonction: str
    service_nom: str
    direction: str
    mois: int
    annee: int
    qte: int
    qte_consomme: float
    reste: float
    cloture: bool

# ============= Approvisionnement Schemas =============
class ApprovisionnementSearch(BaseModel):
    police: str

class ApprovisionnementBase(BaseModel):
    type_approvi: str = "DOTATION"
    qte: float = Field(gt=0)
    km_precedent: int
    km: int
    observations: Optional[str] = None

class ApprovisionnementDotationCreate(ApprovisionnementBase):
    dotation_id: int
    vhc_provisoire: Optional[str] = None
    km_provisoire: Optional[int] = None

class ApprovisionnementMissionCreate(ApprovisionnementBase):
    matricule_conducteur: str
    service_externe: str
    ville_origine: str
    ordre_mission: str
    police_vehicule: str

class ApprovisionnementDetail(BaseModel):
    id: int
    type_approvi: str
    date: datetime
    qte: float
    km_precedent: int
    km: int
    anomalie: bool
    numero_bon: Optional[str]
    
    # For DOTATION type
    police: Optional[str]
    nCivil: Optional[str]
    marque: Optional[str]
    carburant: Optional[str]
    vehicule_utilise: Optional[str]
    vhc_provisoire: Optional[str]
    benificiaire_nom: Optional[str]
    service_nom: Optional[str]
    direction: Optional[str]
    dotation_id: Optional[int]
    mois: Optional[int]
    annee: Optional[int]
    quota: Optional[int]
    qte_consomme: Optional[float]
    reste: Optional[float]
    
    # For MISSION type
    matricule_conducteur: Optional[str]
    service_externe: Optional[str]
    ville_origine: Optional[str]
    ordre_mission: Optional[str]
    police_vehicule: Optional[str]
    
    observations: Optional[str]

class VehicleSearchResult(BaseModel):
    dotation_id: int
    police: str
    nCivil: str
    marque: Optional[str]
    carburant: str
    km: int
    benificiaire: str
    fonction: str
    service: str
    direction: str
    quota: int
    qte_consomme: float
    reste: float
    dernier_appro: float

# ============= Statistics Schemas =============
class DashboardStats(BaseModel):
    total_vehicules: int
    dotations_actives: int
    consommation_totale: float
    quota_total: int
    consommation_dotation: float
    consommation_mission: float
    nombre_appro_dotation: int
    nombre_appro_mission: int

class ConsommationParJour(BaseModel):
    date: str
    total: float

class ConsommationParCarburant(BaseModel):
    carburant: str
    total: float

class ConsommationParService(BaseModel):
    service: str
    direction: str
    total: float

class ConsommationParType(BaseModel):
    type_approvi: str
    total: float
    nombre: int