from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

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
    matricule: str = None   # optional — auto-generated if empty
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
    """Schema for searching vehicle by police number"""
    police: str

class VehicleSearchResult(BaseModel):
    """Result from vehicle search for DOTATION creation
    
    Updated to allow NULL values for nCivil and km
    This makes the schema more flexible with existing database data
    """
    dotation_id: int
    police: str
    nCivil: Optional[str] = None      # ✅ Allows NULL - won't crash if database has NULL
    marque: Optional[str] = None
    carburant: str
    km: Optional[int] = None          # ✅ Allows NULL - won't crash if database has NULL
    benificiaire: str
    fonction: str
    service: str
    direction: str
    quota: int
    qte_consomme: float
    reste: float
    dernier_appro: float

class ApprovisionnementBase(BaseModel):
    type_approvi: str = "DOTATION"
    qte: float = Field(gt=0)
    km_precedent: int
    km: int
    observations: Optional[str] = None

class ApprovisionnementDotationCreate(ApprovisionnementBase):
    """Schema for creating DOTATION approvisionnement"""
    dotation_id: int
    vhc_provisoire: Optional[str] = None
    km_provisoire: Optional[int] = None

class ApprovisionnementMissionCreate(BaseModel):
    """Schema for creating MISSION approvisionnement"""
    qte: float = Field(..., gt=0, description="Quantity in liters")
    km_precedent: int = Field(..., ge=0, description="Previous km")
    km: int = Field(..., gt=0, description="Current km")
    matricule_conducteur: str = Field(..., min_length=1, description="Driver ID")
    service_affecte: str = Field(..., min_length=1, description="Assigned service")
    destination: str = Field(..., min_length=1, description="Destination city")
    ordre_mission: str = Field(..., min_length=1, description="Mission order number")
    police_vehicule: str = Field(..., min_length=1, description="Vehicle police number")
    observations: Optional[str] = Field(None, description="Optional notes")
    
    @field_validator('km')
    @classmethod
    def validate_km_greater(cls, v, info):
        if 'km_precedent' in info.data and v <= info.data['km_precedent']:
            raise ValueError('km must be greater than km_precedent')
        return v

class ApprovisionnementDetail(BaseModel):
    """Detailed approvisionnement info"""
    id: int
    type_approvi: str
    date: datetime
    qte: float
    km_precedent: int
    km: int
    anomalie: bool = False
    
    # DOTATION fields
    dotation_id: Optional[int] = None
    vhc_provisoire: Optional[str] = None
    km_provisoire: Optional[int] = None
    police: Optional[str] = None
    benificiaire_nom: Optional[str] = None
    service_nom: Optional[str] = None
    
    # MISSION fields
    matricule_conducteur: Optional[str] = None
    service_affecte: Optional[str] = None
    destination: Optional[str] = None
    ordre_mission: Optional[str] = None
    police_vehicule: Optional[str] = None
    
    # Common
    observations: Optional[str] = None
    numero_bon: Optional[str] = None
    
    class Config:
        from_attributes = True

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