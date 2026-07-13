import json
import logging
from typing import List
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, status
from app.models import LogUploadRequest
from app.auth import get_current_user
from app.rules import process_and_correlate
from app.database import db

router = APIRouter(prefix="/logs", tags=["Logs"])
logger = logging.getLogger("soc_logs")

# Active WebSocket connections
active_connections: List[WebSocket] = []

async def broadcast_log(log: dict):
    for connection in active_connections:
        try:
            await connection.send_json({"type": "log", "data": log})
        except Exception:
            pass

async def broadcast_alert(alert: dict):
    for connection in active_connections:
        try:
            await connection.send_json({"type": "alert", "data": alert})
        except Exception:
            pass

# Bind the alert callback in rules.py to our WebSocket broadcaster
import app.rules as rules
rules.alert_broadcast_callback = broadcast_alert

@router.post("/upload")
async def upload_logs(request: LogUploadRequest):
    """
    Ingest logs from network sensors, endpoints, firewalls, and cloud sources.
    Run correlation engine rules on the ingested logs.
    """
    logs_data = [log.dict() for log in request.logs]
    
    # Run the threat correlation rules
    await process_and_correlate(logs_data)
    
    # Broadcast logs via websocket for live viewing
    for log in logs_data:
        # Convert datetime objects to string for JSON serialization
        log_copy = log.copy()
        if hasattr(log_copy.get("timestamp"), "isoformat"):
            log_copy["timestamp"] = log_copy["timestamp"].isoformat()
        await broadcast_log(log_copy)
        
    return {"status": "success", "count": len(logs_data)}

@router.get("")
async def get_logs(
    source: str = None, 
    severity: str = None, 
    limit: int = 100, 
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    Fetch historical log records with filtering.
    """
    query = {}
    if source:
        query["source"] = source
    if severity:
        query["severity"] = severity
        
    logs = await db.logs.find(query, sort=[("timestamp", -1)], limit=limit, skip=skip)
    return logs

@router.websocket("/live")
async def live_logs_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time log ticking and alert feeds.
    """
    await websocket.accept()
    active_connections.append(websocket)
    logger.info(f"WebSocket client connected. Total clients: {len(active_connections)}")
    
    try:
        while True:
            # Keep connection alive, listen for any client messages
            data = await websocket.receive_text()
            # Echo or process if needed, else ignore
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(active_connections)}")
    except Exception as e:
        if websocket in active_connections:
            active_connections.remove(websocket)
        logger.error(f"WebSocket exception: {e}")
