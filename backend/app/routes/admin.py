from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.models import SettingsSchema, PlaybookSchema, UserResponse
from app.auth import get_current_user, admin_required
from app.database import db
from datetime import datetime

router = APIRouter(tags=["Administration & Settings"])

# 1. Global Settings endpoints
@router.get("/settings", response_model=SettingsSchema)
async def get_settings(current_user: dict = Depends(get_current_user)):
    existing = await db.settings.find_one({})
    if not existing:
        # Return default settings schema
        default_settings = SettingsSchema().dict()
        default_settings["id"] = "global_settings"
        default_settings["_id"] = "global_settings"
        await db.settings.insert_one(default_settings)
        return default_settings
    return existing

@router.patch("/settings", response_model=SettingsSchema)
async def update_settings(update_data: SettingsSchema, current_user: dict = Depends(admin_required)):
    existing = await db.settings.find_one({})
    if not existing:
        # Create settings first
        settings_dict = update_data.dict()
        settings_dict["id"] = "global_settings"
        settings_dict["_id"] = "global_settings"
        await db.settings.insert_one(settings_dict)
        return settings_dict
        
    updated = await db.settings.update_one(
        {"id": "global_settings"},
        {"$set": update_data.dict()}
    )
    
    # Audit log
    await db.audit_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "user": current_user["email"],
        "action": "Update Settings",
        "details": "Updated global SMTP or Webhook details"
    })
    
    return updated

# 2. Playbooks endpoints
@router.get("/playbooks", response_model=List[PlaybookSchema])
async def get_playbooks(current_user: dict = Depends(get_current_user)):
    playbooks = await db.playbooks.find({})
    return playbooks

@router.patch("/playbooks/{playbook_id}")
async def toggle_playbook(
    playbook_id: str,
    is_active: bool,
    current_user: dict = Depends(admin_required)
):
    existing = await db.playbooks.find_one({"id": playbook_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )
        
    updated = await db.playbooks.update_one(
        {"id": playbook_id},
        {"$set": {"is_active": is_active}}
    )
    
    # Audit log
    await db.audit_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "user": current_user["email"],
        "action": "Toggle Playbook",
        "details": f"Set playbook {playbook_id} active status to {is_active}"
    })
    
    return updated

# 3. Users Management
@router.get("/users")
async def get_users(current_user: dict = Depends(admin_required)):
    users = await db.users.find({})
    # Strip passwords
    for u in users:
        if "hashed_password" in u:
            del u["hashed_password"]
        u["id"] = str(u["_id"])
    return users

# 4. Audit Logs
@router.get("/audit-logs")
async def get_audit_logs(limit: int = 50, current_user: dict = Depends(admin_required)):
    logs = await db.audit_logs.find({}, sort=[("timestamp", -1)], limit=limit)
    return logs

# 5. Threat Intelligence Lookup
@router.get("/threats/lookup")
async def threat_lookup(query: str, current_user: dict = Depends(get_current_user)):
    """
    Look up security reputation statistics for an IP, domain, or SHA256 file hash.
    Connects to external feeds (VirusTotal/AbuseIPDB simulation).
    """
    q = query.strip()
    
    # Check if we have cached this result
    cached = await db.threat_intel.find_one({"query": q})
    if cached:
        return cached

    # Pre-canned simulation answers
    reputation = "Clean"
    vt_positives = 0
    vt_total = 90
    abuse_score = 0
    details = {}
    
    # Simple logic to determine mock answer based on IP/Text content
    is_ip = bool(re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", q))
    is_hash = len(q) in [32, 40, 64] # MD5, SHA1, SHA256
    
    if is_ip:
        # Check octets
        first_octet = int(q.split(".")[0]) if q.count(".") == 3 else 0
        if first_octet in [185, 45, 91, 103] or q.endswith(".100") or q.endswith(".66"):
            reputation = "Malicious"
            vt_positives = 42
            abuse_score = 98
            details = {
                "isp": "Chingola Net LLC",
                "country": "Russian Federation",
                "abuse_history": "Active SSH brute-forcing and network scanning detected since 2026-05-12.",
                "asn": "AS5421",
                "domain_associated": "botnet.c2-servers.net"
            }
        elif first_octet in [192, 10, 172]:
            reputation = "Clean"
            vt_positives = 0
            abuse_score = 0
            details = {
                "isp": "RFC 1918 Private Network Address",
                "country": "Local",
                "abuse_history": "Internal IP. Intranet traffic only.",
                "asn": "N/A",
                "domain_associated": "intranet.local"
            }
        else:
            reputation = "Suspicious"
            vt_positives = 8
            abuse_score = 35
            details = {
                "isp": "Digital Ocean LLC",
                "country": "United States",
                "abuse_history": "Identified in minor web application scanning. No confirmed malware payload hosting.",
                "asn": "AS14061",
                "domain_associated": "cloud-proxy-node-42.xyz"
            }
    elif is_hash:
        # Mock file hash lookup
        if q.startswith("a") or q.startswith("8") or q.startswith("0"):
            reputation = "Malicious"
            vt_positives = 62
            details = {
                "file_type": "Win32 Executable (PE)",
                "threat_name": "W32/Mimikatz.Trojan.Gen",
                "first_seen": "2021-08-09T12:00:23Z",
                "imphash": "a739265f29f0dae47413ff7820",
                "behavior": "Injects LSASS, reads Windows SAM hashes, accesses local credentials."
            }
        else:
            reputation = "Clean"
            vt_positives = 0
            details = {
                "file_type": "Portable Document Format (PDF)",
                "threat_name": "Clean PDF File",
                "first_seen": "2024-01-01T08:00:00Z",
                "imphash": "N/A",
                "behavior": "No suspicious sandbox executions. Standard signature."
            }
    else:
        # Mock Domain lookup
        if "malware" in q or "botnet" in q or "hack" in q:
            reputation = "Malicious"
            vt_positives = 51
            details = {
                "registrar": "NameCheap Inc.",
                "hosting_ip": "185.190.140.23",
                "dns_records": ["A", "MX", "TXT"],
                "threat_feed_hits": ["AlienVault OTX", "PhishTank"]
            }
        else:
            reputation = "Clean"
            vt_positives = 0
            details = {
                "registrar": "GoDaddy LLC",
                "hosting_ip": "142.250.190.46",
                "dns_records": ["A", "AAAA", "MX", "NS", "TXT"],
                "threat_feed_hits": []
            }
            
    intel_doc = {
        "query": q,
        "vt_positives": vt_positives,
        "vt_total": vt_total,
        "abuse_score": abuse_score,
        "reputation": reputation,
        "details": details,
        "timestamp": datetime.utcnow()
    }
    
    # Save to cache
    await db.threat_intel.insert_one(intel_doc)
    return intel_doc

import re
