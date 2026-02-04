from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.schemas.schemas import Token, UserInfo, UserLogin
from app.core.security import create_access_token, decode_access_token
from app.db.database import get_db, get_db_cursor

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    return {"username": username, "role": payload.get("role")}

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login endpoint - returns JWT token
    
    IMPORTANT: v3.0 database uses PLAIN TEXT passwords!
    This should be fixed in production by hashing passwords.
    """
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute(
            "SELECT id_user, username, password, role FROM users WHERE username = %s AND statut = 'ACTIF'",
            (credentials.username,)
        )
        user = cur.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Nom d'utilisateur ou mot de passe incorrect"
            )
        
        # IMPORTANT: Plain text password comparison (v3.0 database structure)
        # TODO: In production, hash passwords and use verify_password()
        if user['password'] != credentials.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Nom d'utilisateur ou mot de passe incorrect"
            )
        
        # Create JWT access token
        access_token = create_access_token(
            data={"sub": user['username'], "role": user['role']}
        )
        
        return {"access_token": access_token, "token_type": "bearer"}

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 compatible token endpoint"""
    credentials = UserLogin(username=form_data.username, password=form_data.password)
    return await login(credentials)

@router.get("/me", response_model=UserInfo)
async def get_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    with get_db() as conn:
        cur = get_db_cursor(conn)
        cur.execute(
            "SELECT id_user, username, role, statut FROM users WHERE username = %s",
            (current_user['username'],)
        )
        user = cur.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        return user