from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.models import UserCreate, UserResponse, UserRole
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user, admin_required
from app.database import db
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, current_user: dict = Depends(admin_required)):
    # Check if user already exists
    existing = await db.users.find_one({"email": user_in.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    hashed_pwd = get_password_hash(user_in.password)
    user_dict = {
        "email": user_in.email,
        "name": user_in.name,
        "role": user_in.role.value,
        "hashed_password": hashed_pwd,
        "created_at": datetime.utcnow()
    }
    
    new_user = await db.users.insert_one(user_dict)
    
    # Audit log
    await db.audit_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "user": current_user["email"],
        "action": "Register User",
        "details": f"Registered new user: {user_in.email} with role {user_in.role.value}"
    })
    
    # Map back to model
    user_dict["id"] = str(new_user["_id"])
    return user_dict

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    access_token = create_access_token(data={"sub": user["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "email": current_user["email"],
        "name": current_user["name"],
        "role": current_user["role"],
        "created_at": current_user.get("created_at")
    }

# Endpoint to check if users exist and seed initial users if empty
@router.post("/seed", tags=["Internal"])
async def seed_users():
    count = await db.users.count_documents({})
    if count > 0:
        return {"message": "Database already seeded", "count": count}
        
    # Seed Admin
    admin_pwd = get_password_hash("AdminPass123!")
    admin_dict = {
        "email": "admin@soc.local",
        "name": "SOC Administrator",
        "role": UserRole.ADMIN.value,
        "hashed_password": admin_pwd,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(admin_dict)
    
    # Seed Analyst
    analyst_pwd = get_password_hash("AnalystPass123!")
    analyst_dict = {
        "email": "analyst@soc.local",
        "name": "SOC Analyst L2",
        "role": UserRole.ANALYST.value,
        "hashed_password": analyst_pwd,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(analyst_dict)
    
    return {"message": "Users seeded successfully", "users": ["admin@soc.local", "analyst@soc.local"]}
