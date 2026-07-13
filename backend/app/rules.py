import re
import uuid
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models import AlertSeverity, AlertStatus, IncidentStatus
from app.database import db
from app.playbooks import run_playbooks_for_alert

logger = logging.getLogger("soc_rules")

# Mitre ATT&CK mappings
MITRE_MAPPINGS = {
    "Brute Force": "T1110",
    "SQL Injection": "T1190",
    "XSS (Cross-Site Scripting)": "T1190",
    "PowerShell Abuse": "T1059.001",
    "Privilege Escalation": "T1068",
    "Port Scan": "T1046",
    "Credential Dumping": "T1003",
    "Impossible Travel": "T1228"
}

# In-memory alert broadcast hook (set by WebSocket router)
alert_broadcast_callback = None

async def create_alert(
    title: str,
    description: str,
    severity: AlertSeverity,
    category: str,
    source_log_ids: List[str],
    ip_address: str = None,
    username: str = None
) -> Dict[str, Any]:
    alert_id = str(uuid.uuid4())
    alert = {
        "id": alert_id,
        "_id": alert_id,
        "timestamp": datetime.utcnow(),
        "title": title,
        "description": description,
        "severity": severity.value,
        "source_log_ids": source_log_ids,
        "status": AlertStatus.NEW.value,
        "mitre_technique": MITRE_MAPPINGS.get(category, "T1204"),
        "category": category,
        "ip_address": ip_address,
        "username": username
    }
    
    # Save Alert to DB
    await db.alerts.insert_one(alert)
    logger.info(f"[ALERT GENERATED] Category: {category}, Severity: {severity.value}, IP: {ip_address}")
    
    # Trigger WebSocket Broadcast to Front-end
    if alert_broadcast_callback:
        await alert_broadcast_callback(alert)
        
    # Auto-escalation to Incident if Severity is High or Critical
    if severity in [AlertSeverity.CRITICAL, AlertSeverity.HIGH]:
        await escalate_to_incident(alert)
        
    # Trigger Playbook (SOAR actions)
    asyncio.create_task(run_playbooks_for_alert(alert))
    
    return alert

async def escalate_to_incident(alert: dict):
    incident_id = str(uuid.uuid4())
    incident = {
        "id": incident_id,
        "_id": incident_id,
        "title": f"Incident: {alert['title']}",
        "description": f"Automated escalation of {alert['severity']} severity alert '{alert['title']}'. Details: {alert['description']}",
        "status": IncidentStatus.OPEN.value,
        "severity": alert["severity"],
        "assigned_to": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "timeline": [
            {
                "timestamp": datetime.utcnow(),
                "analyst_name": "SOAR Engine",
                "message": f"Incident automatically created from Alert {alert['id']}."
            }
        ],
        "evidence": [
            {
                "type": "IP Address" if alert["ip_address"] else "Source",
                "value": alert["ip_address"] or "Unknown",
                "description": "Attacker IP"
            }
        ],
        "mitre_technique": alert["mitre_technique"],
        "root_cause": f"Detected suspicious {alert['category']} activity.",
        "lessons_learned": None
    }
    await db.incidents.insert_one(incident)
    logger.info(f"[INCIDENT ESCALATED] Incident ID: {incident_id} created from Alert ID: {alert['id']}")

async def process_and_correlate(logs: List[dict]):
    """
    Main correlation logic. Runs on every ingested log batch.
    """
    # 1. Insert logs to DB
    log_docs = []
    for log in logs:
        # Standardize timestamp
        if isinstance(log.get("timestamp"), str):
            try:
                log["timestamp"] = datetime.fromisoformat(log["timestamp"])
            except ValueError:
                log["timestamp"] = datetime.utcnow()
        elif not log.get("timestamp"):
            log["timestamp"] = datetime.utcnow()
            
        log_id = str(uuid.uuid4())
        log["id"] = log_id
        log["_id"] = log_id
        await db.logs.insert_one(log)
        log_docs.append(log)
        
    # 2. Run correlation checks
    for log in log_docs:
        msg = log.get("message", "")
        ip = log.get("ip_address")
        user = log.get("username")
        
        # SQL Injection Check
        sqli_patterns = [
            r"(?i)(UNION\s+SELECT)",
            r"(?i)(SELECT\s+.*\s+FROM)",
            r"(?i)(' OR '1'='1)",
            r"(?i)(--)",
            r"(?i)(INFORMATION_SCHEMA)"
        ]
        if any(re.search(pat, msg) for pat in sqli_patterns):
            await create_alert(
                title=f"SQL Injection Attempt from {ip or 'unknown'}",
                description=f"Log message matched SQL Injection signatures: {msg}",
                severity=AlertSeverity.HIGH,
                category="SQL Injection",
                source_log_ids=[log["id"]],
                ip_address=ip,
                username=user
            )
            continue
            
        # XSS Check
        xss_patterns = [
            r"(?i)(<script.*?>)",
            r"(?i)(javascript:)",
            r"(?i)(onerror\s*=)",
            r"(?i)(onload\s*=)"
        ]
        if any(re.search(pat, msg) for pat in xss_patterns):
            await create_alert(
                title=f"Cross-Site Scripting (XSS) Attack from {ip or 'unknown'}",
                description=f"Log message matched XSS injection pattern: {msg}",
                severity=AlertSeverity.MEDIUM,
                category="XSS (Cross-Site Scripting)",
                source_log_ids=[log["id"]],
                ip_address=ip,
                username=user
            )
            continue

        # PowerShell Abuse Check
        ps_patterns = [
            r"(?i)(powershell\.exe\s+-enc)",
            r"(?i)(powershell\.exe\s+-encodedcommand)",
            r"(?i)(-executionpolicy\s+bypass)",
            r"(?i)(-nop\s+)",
            r"(?i)(-noprofile)"
        ]
        if any(re.search(pat, msg) for pat in ps_patterns):
            await create_alert(
                title=f"Suspicious PowerShell Execution by {user or 'unknown'}",
                description=f"PowerShell abuse signature detected: {msg}",
                severity=AlertSeverity.HIGH,
                category="PowerShell Abuse",
                source_log_ids=[log["id"]],
                ip_address=ip,
                username=user
            )
            continue

        # Credential Dumping Check
        cred_dumping_patterns = [
            r"(?i)(mimikatz)",
            r"(?i)(sekurlsa)",
            r"(?i)(samdump2)",
            r"(?i)(lsass.*\.dmp)"
        ]
        if any(re.search(pat, msg) for pat in cred_dumping_patterns):
            await create_alert(
                title=f"Credential Dumping Tool Detected on {log.get('source')}",
                description=f"Memory dumping command patterns matched: {msg}",
                severity=AlertSeverity.CRITICAL,
                category="Credential Dumping",
                source_log_ids=[log["id"]],
                ip_address=ip,
                username=user
            )
            continue
            
        # Privilege Escalation Check
        priv_esc_patterns = [
            r"(?i)(sudo:\s+root\s+privilege)",
            r"(?i)(privilege escalation)",
            r"(?i)(privilege:\s+admin)",
            r"(?i)(event\s+4672)"
        ]
        if any(re.search(pat, msg) for pat in priv_esc_patterns):
            await create_alert(
                title=f"Privilege Escalation Detected",
                description=f"Privileged access action or local exploit indication: {msg}",
                severity=AlertSeverity.HIGH,
                category="Privilege Escalation",
                source_log_ids=[log["id"]],
                ip_address=ip,
                username=user
            )
            continue
            
    # 3. Sliding window checks (Brute Force / Port Scan)
    # Check failed logins (Brute Force)
    time_window = datetime.utcnow() - timedelta(seconds=60)
    
    # We query the DB logs created in the last 60 seconds
    recent_logs = await db.logs.find({"timestamp": {"$gt": time_window}})
    
    # Brute Force Analysis: group failed logins by IP/User
    failed_logins_by_ip = {}
    failed_logins_by_user = {}
    for log in recent_logs:
        msg = log.get("message", "").lower()
        ip = log.get("ip_address")
        user = log.get("username")
        
        is_failed = any(term in msg for term in ["failed login", "invalid password", "authentication failure", "event 4625", "login failed"])
        
        if is_failed and ip:
            failed_logins_by_ip[ip] = failed_logins_by_ip.get(ip, []) + [log]
        if is_failed and user:
            failed_logins_by_user[user] = failed_logins_by_user.get(user, []) + [log]
            
    # Raise Brute Force alert if > 5 failed attempts from same IP
    for ip, logs_list in failed_logins_by_ip.items():
        if len(logs_list) >= 5:
            # Check if alert already raised recently
            recent_alerts = await db.alerts.find({
                "category": "Brute Force",
                "ip_address": ip,
                "timestamp": {"$gt": datetime.utcnow() - timedelta(minutes=5)}
            })
            if not recent_alerts:
                await create_alert(
                    title=f"Brute Force Detected from IP {ip}",
                    description=f"Detected {len(logs_list)} failed login attempts from IP {ip} within 60 seconds.",
                    severity=AlertSeverity.HIGH,
                    category="Brute Force",
                    source_log_ids=[l["id"] for l in logs_list],
                    ip_address=ip
                )

    # Port Scan Analysis: group connections by IP, count unique ports
    conn_by_ip = {}
    for log in recent_logs:
        msg = log.get("message", "").lower()
        ip = log.get("ip_address")
        
        # Check if log suggests connection attempts or port triggers
        is_connection = "port" in msg or "connection" in msg or "dropped" in msg or log.get("source") == "Firewall"
        
        if is_connection and ip:
            # Try to extract a port number from the log message (e.g., "port 443", "port: 22")
            port_match = re.search(r"port\s*:?\s*(\d+)", msg)
            port = port_match.group(1) if port_match else "unknown"
            if port != "unknown":
                if ip not in conn_by_ip:
                    conn_by_ip[ip] = {}
                conn_by_ip[ip][port] = conn_by_ip[ip].get(port, []) + [log]
                
    for ip, ports in conn_by_ip.items():
        unique_ports_count = len(ports.keys())
        if unique_ports_count >= 5:
            recent_alerts = await db.alerts.find({
                "category": "Port Scan",
                "ip_address": ip,
                "timestamp": {"$gt": datetime.utcnow() - timedelta(minutes=5)}
            })
            if not recent_alerts:
                all_associated_logs = []
                for p_logs in ports.values():
                    all_associated_logs.extend(p_logs)
                    
                await create_alert(
                    title=f"Port Scanning Activity from {ip}",
                    description=f"Source IP {ip} attempted connections to {unique_ports_count} different ports within 60 seconds.",
                    severity=AlertSeverity.MEDIUM,
                    category="Port Scan",
                    source_log_ids=[l["id"] for l in all_associated_logs[:10]],  # cap log links
                    ip_address=ip
                )
