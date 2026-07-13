import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.models import IncidentEntry, IncidentCreate, IncidentUpdate, TimelineEvent, IncidentStatus
from app.auth import get_current_user
from app.database import db

router = APIRouter(prefix="/incidents", tags=["Incident Management"])

@router.get("")
async def get_incidents(
    status_filter: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    List incidents with optional filtering.
    """
    query = {}
    if status_filter:
        query["status"] = status_filter
    if severity:
        query["severity"] = severity
        
    incidents = await db.incidents.find(query, sort=[("created_at", -1)], limit=limit, skip=skip)
    return incidents

@router.post("", response_model=IncidentEntry)
async def create_incident(
    incident_in: IncidentCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Manually create an incident ticket.
    """
    incident_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    incident_dict = {
        "id": incident_id,
        "_id": incident_id,
        "title": incident_in.title,
        "description": incident_in.description,
        "status": IncidentStatus.OPEN.value,
        "severity": incident_in.severity.value,
        "assigned_to": incident_in.assigned_to,
        "created_at": now,
        "updated_at": now,
        "timeline": [
            {
                "timestamp": now,
                "analyst_name": current_user["name"],
                "message": "Incident manually opened."
            }
        ],
        "evidence": [ev.dict() for ev in incident_in.evidence],
        "mitre_technique": None,
        "root_cause": None,
        "lessons_learned": None
    }
    
    await db.incidents.insert_one(incident_dict)
    
    # Audit log
    await db.audit_logs.insert_one({
        "timestamp": now,
        "user": current_user["email"],
        "action": "Create Incident",
        "details": f"Created Incident: {incident_in.title} (Severity: {incident_in.severity.value})"
    })
    
    return incident_dict

@router.patch("/{incident_id}")
async def update_incident(
    incident_id: str,
    update: IncidentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update incident details (status, assignee, timeline notes, root cause).
    """
    incident = await db.incidents.find_one({"id": incident_id})
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
        
    update_data = {}
    
    if update.status:
        update_data["status"] = update.status.value
    if update.severity:
        update_data["severity"] = update.severity.value
    if update.assigned_to is not None:
        update_data["assigned_to"] = update.assigned_to
    if update.root_cause is not None:
        update_data["root_cause"] = update.root_cause
    if update.lessons_learned is not None:
        update_data["lessons_learned"] = update.lessons_learned
        
    timeline = incident.get("timeline", [])
    if update.timeline_event:
        timeline.append({
            "timestamp": datetime.utcnow(),
            "analyst_name": current_user["name"],
            "message": update.timeline_event
        })
        update_data["timeline"] = timeline
        
    updated = await db.incidents.update_one(
        {"id": incident_id},
        {"$set": update_data}
    )
    
    # Audit log
    await db.audit_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "user": current_user["email"],
        "action": "Update Incident",
        "details": f"Updated Incident ID {incident_id} (fields: {list(update_data.keys())})"
    })
    
    return updated
