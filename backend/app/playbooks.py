import logging
import asyncio
from datetime import datetime
from app.database import db

logger = logging.getLogger("soc_playbooks")

# Simulated Playbook actions
async def simulate_block_ip(ip: str, alert_id: str):
    logger.warning(f"[PLAYBOOK ACTION] BLOCK IP: Initiating firewall rule to block {ip}...")
    await asyncio.sleep(1.5)  # Simulate API call latency
    action_log = {
        "timestamp": datetime.utcnow(),
        "playbook": "Auto IP Block",
        "action": f"Configured block rule for IP {ip} on main Firewall.",
        "status": "Success",
        "details": f"Target blocked globally. Incident mitigation completed for Alert ID {alert_id}."
    }
    logger.info(f"[PLAYBOOK ACTION] BLOCK IP: IP {ip} blocked successfully.")
    
    # Audit log
    await db.audit_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "user": "SOAR Engine",
        "action": "Block IP Action",
        "details": f"Automated block executed against IP {ip} based on alert {alert_id}"
    })
    return action_log

async def simulate_isolate_host(host_source: str, alert_id: str):
    logger.warning(f"[PLAYBOOK ACTION] ISOLATE HOST: Isolating system '{host_source}' from network...")
    await asyncio.sleep(2.0)
    action_log = {
        "timestamp": datetime.utcnow(),
        "playbook": "Host Isolation",
        "action": f"Isolated host {host_source} via EDR integration.",
        "status": "Success",
        "details": f"Disabled host network adapters except to SOC tools. Alert ID: {alert_id}."
    }
    logger.info(f"[PLAYBOOK ACTION] ISOLATE HOST: Host {host_source} isolated successfully.")
    
    # Audit log
    await db.audit_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "user": "SOAR Engine",
        "action": "Isolate Host Action",
        "details": f"Automated host isolation executed against {host_source} based on alert {alert_id}"
    })
    return action_log

async def simulate_send_slack(message: str):
    logger.info(f"[PLAYBOOK ACTION] SLACK ALERT: Sending Slack notification: '{message}'")
    # In real production, this would do requests.post(settings.slack_webhook, json={"text": message})
    await asyncio.sleep(0.5)
    return {"status": "Success", "details": "Notification delivered to Slack channel #security-alerts."}

async def simulate_send_email(recipient: str, subject: str, message: str):
    logger.info(f"[PLAYBOOK ACTION] EMAIL NOTIFICATION: Sending email to {recipient} with subject '{subject}'")
    await asyncio.sleep(0.5)
    return {"status": "Success", "details": f"Notification email sent to {recipient}."}

async def run_playbooks_for_alert(alert: dict):
    """
    Evaluates playbooks to execute based on alert type/severity.
    """
    alert_id = alert["id"]
    category = alert["category"]
    severity = alert["severity"]
    ip = alert.get("ip_address")
    source = alert.get("source_log_ids", ["unknown"])[0]
    
    # Load all settings
    app_settings = await db.settings.find_one({}) or {}
    
    # Load playbooks (by default we seed active ones)
    playbooks_list = await db.playbooks.find({"is_active": True})
    
    # If playbooks database is empty, seed standard playbooks
    if not playbooks_list:
        default_playbooks = [
            {
                "id": "pb_brute_force",
                "_id": "pb_brute_force",
                "name": "Auto IP Block - Brute Force",
                "description": "Block IP when Brute Force attack is detected",
                "trigger_category": "Brute Force",
                "action_type": "block_ip",
                "is_active": True
            },
            {
                "id": "pb_cred_dump",
                "_id": "pb_cred_dump",
                "name": "Isolate Host - Credential Dump",
                "description": "Isolate server immediately if Mimikatz/SAM dumping detected",
                "trigger_category": "Credential Dumping",
                "action_type": "isolate_host",
                "is_active": True
            },
            {
                "id": "pb_critical_alert",
                "_id": "pb_critical_alert",
                "name": "Slack Alert for Criticals",
                "description": "Send a Slack alert for any Critical severity alerts",
                "trigger_category": "Any",
                "action_type": "send_slack",
                "is_active": True
            }
        ]
        for pb in default_playbooks:
            await db.playbooks.insert_one(pb)
        playbooks_list = default_playbooks

    for playbook in playbooks_list:
        if not playbook.get("is_active"):
            continue
            
        trigger = playbook.get("trigger_category")
        action = playbook.get("action_type")
        
        should_run = False
        if trigger == "Any" and severity == "Critical":
            should_run = True
        elif trigger == category:
            should_run = True
            
        if should_run:
            logger.info(f"Triggering Playbook: {playbook['name']} for Alert ID {alert_id}")
            
            # Execute matching action
            action_result = None
            if action == "block_ip" and ip:
                action_result = await simulate_block_ip(ip, alert_id)
            elif action == "isolate_host":
                # Isolate target host
                action_result = await simulate_isolate_host(source, alert_id)
            elif action == "send_slack":
                slack_msg = f"⚠️ *CRITICAL ALERT*: {alert['title']} | Severity: {alert['severity']} | MITRE: {alert['mitre_technique']}"
                action_result = await simulate_send_slack(slack_msg)
            elif action == "send_email":
                action_result = await simulate_send_email(
                    "soc-escalations@soc.local",
                    f"SOC Alert: {alert['title']}",
                    f"Alert Details:\nSeverity: {alert['severity']}\nCategory: {alert['category']}\nIP: {ip}"
                )
                
            # Log action under the related Incident
            # Find incident related to this alert (if any)
            related_incidents = await db.incidents.find({"mitre_technique": alert["mitre_technique"]})
            if related_incidents and action_result:
                # Add action to incident timeline
                incident = related_incidents[0]
                timeline_entry = {
                    "timestamp": datetime.utcnow(),
                    "analyst_name": "SOAR Playbook Engine",
                    "message": f"Playbook '{playbook['name']}' action completed: {action_result['action'] if 'action' in action_result else action_result['details']}"
                }
                # Update incident timeline
                await db.incidents.update_one(
                    {"id": incident["id"]},
                    {"$set": {"timeline": incident["timeline"] + [timeline_entry]}}
                )
