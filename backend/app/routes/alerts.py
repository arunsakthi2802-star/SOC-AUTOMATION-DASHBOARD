from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.models import AlertUpdate, AlertStatus
from app.auth import get_current_user
from app.database import db
from datetime import datetime

router = APIRouter(prefix="/alerts", tags=["Alert Management"])

@router.get("")
async def get_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    List alerts with optional severity and status filtering.
    """
    query = {}
    if severity:
        query["severity"] = severity
    if status:
        query["status"] = status
        
    alerts = await db.alerts.find(query, sort=[("timestamp", -1)], limit=limit, skip=skip)
    return alerts

@router.patch("/{alert_id}")
async def update_alert(
    alert_id: str,
    update: AlertUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update alert status (e.g., Acknowledged, Suppressed, Resolved).
    """
    existing = await db.alerts.find_one({"id": alert_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
        
    updated = await db.alerts.update_one(
        {"id": alert_id},
        {"$set": {"status": update.status.value}}
    )
    
    # Audit log
    await db.audit_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "user": current_user["email"],
        "action": "Update Alert Status",
        "details": f"Updated Alert ID {alert_id} status to {update.status.value}"
    })
    
    return updated
