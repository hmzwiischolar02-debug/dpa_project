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

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserInfo(BaseModel):
    id: int
    username: str
    role: str

# ============= Service Schema =============
class ServiceBase(BaseModel):
    nom: str
    direction: str

class Service(ServiceBase):
    id: int

    class Config:
        from_attributes = True

# ============= Benificiaire Schemas =============
class BenificiaireBase(BaseModel):
    matricule: str
    nom: str
    fonction: str
    service_id: int

class BenificiaireCreate(BenificiaireBase):
    pass

class Benificiaire(BenificiaireBase):
    id: int

    class Config:
        from_attributes = True

# ============= Vehicle Schemas =============
class VehiculeBase(BaseModel):
    police: str
    nCivil: str
    marque: Optional[str] = None
    carburant: str  # 'gazoil' or 'essence'
    km: int = Field(ge=0)
    service_id: int

class VehiculeCreate(VehiculeBase):
    pass

class Vehicule(VehiculeBase):
    id: int
    actif: bool
    created_at: datetime

    class Config:
        from_attributes = True

class VehiculeDetail(BaseModel):
    id: int
    police: str
    nCivil: str
    marque: Optional[str]
    carburant: str
    km: int
    service_nom: str
    direction: str
    actif: bool

# ============= Dotation Schemas =============
class DotationBase(BaseModel):
    NumOrdre: int
    vehicule_id: int
    benificiaire_id: int
    mois: int = Field(ge=1, le=12)
    annee: int = Field(ge=2020)
    qte: int = Field(description="Quota: 120 or 140")

class DotationCreate(DotationBase):
    pass

class Dotation(DotationBase):
    id: int
    qte_consomme: float
    reste: float
    cloture: bool
    created_at: datetime

    class Config:
        from_attributes = True

class DotationDetail(BaseModel):
    id: int
    NumOrdre: int
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
class ApprovisionnementBase(BaseModel):
    dotation_id: int
    qte: float = Field(gt=0)
    km_precedent: int
    km: int

class ApprovisionnementCreate(ApprovisionnementBase):
    pass

class Approvisionnement(ApprovisionnementBase):
    id: int
    date: datetime
    anomalie: bool

    class Config:
        from_attributes = True

class ApprovisionnementSearch(BaseModel):
    police: str

class ApprovisionnementDetail(BaseModel):
    id: int
    date: datetime
    qte: float
    km_precedent: int
    km: int
    police: str
    nCivil: str
    marque: Optional[str]
    carburant: str
    benificiaire: str
    service: str
    direction: str
    quota: int
    qte_consomme: float
    reste: float
    anomalie: bool

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
    total_dotations: int
    dotations_actives: int
    dotations_closes: int
    total_benificiaires: int
    total_services: int
    consommation_totale: float
    quota_total: int

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