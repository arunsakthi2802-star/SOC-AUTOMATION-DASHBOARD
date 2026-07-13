from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from typing import Dict, Any
from app.auth import get_current_user
from app.database import db

router = APIRouter(prefix="/dashboard", tags=["Dashboard Analytics"])

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """
    Retrieve security scores, active alert metrics, trends, heatmaps, and rankings
    for visualization in the frontend.
    """
    # 1. Total & severity counts of alerts
    total_alerts = await db.alerts.count_documents({})
    critical_alerts = await db.alerts.count_documents({"severity": "Critical"})
    high_alerts = await db.alerts.count_documents({"severity": "High"})
    medium_alerts = await db.alerts.count_documents({"severity": "Medium"})
    low_alerts = await db.alerts.count_documents({"severity": "Low"})
    
    unresolved_alerts = await db.alerts.count_documents({"status": "New"})
    
    # 2. Total & status counts of incidents
    total_incidents = await db.incidents.count_documents({})
    open_incidents = await db.incidents.count_documents({"status": "Open"})
    investigating_incidents = await db.incidents.count_documents({"status": "Investigating"})
    resolved_incidents = await db.incidents.count_documents({"status": "Resolved"})
    
    # 3. Dynamic Security Score calculation
    # Base is 100. Unresolved incidents cost: Critical = 10, High = 5, Medium = 2, Low = 1
    unresolved_critical = await db.incidents.count_documents({"status": {"$ne": "Closed"}, "severity": "Critical"})
    unresolved_high = await db.incidents.count_documents({"status": {"$ne": "Closed"}, "severity": "High"})
    unresolved_medium = await db.incidents.count_documents({"status": {"$ne": "Closed"}, "severity": "Medium"})
    unresolved_low = await db.incidents.count_documents({"status": {"$ne": "Closed"}, "severity": "Low"})
    
    deductions = (unresolved_critical * 10) + (unresolved_high * 5) + (unresolved_medium * 2) + unresolved_low
    security_score = max(10, 100 - deductions)
    
    # 4. Target Devices distribution (querying logs)
    all_logs = await db.logs.find({}, limit=200)
    devices_dict = {}
    for log in all_logs:
        src = log.get("source", "Unknown")
        devices_dict[src] = devices_dict.get(src, 0) + 1
        
    devices_data = [{"name": k, "value": v} for k, v in devices_dict.items()]
    
    # 5. Top Attacker IPs (querying alerts)
    all_alerts = await db.alerts.find({}, limit=500)
    attackers_dict = {}
    countries_dict = {"United States": 10, "Germany": 4, "Russia": 15, "China": 18, "India": 7}  # default background mock
    
    for alert in all_alerts:
        ip = alert.get("ip_address")
        if ip:
            attackers_dict[ip] = attackers_dict.get(ip, 0) + 1
            # Mock some geo mappings based on IP octets for UI richness
            last_digit = int(ip.split(".")[-1]) if "." in ip else 0
            if last_digit % 5 == 0:
                countries_dict["Russia"] += 1
            elif last_digit % 4 == 0:
                countries_dict["China"] += 1
            elif last_digit % 3 == 0:
                countries_dict["Germany"] += 1
            elif last_digit % 2 == 0:
                countries_dict["United States"] += 1
            else:
                countries_dict["India"] += 1
                
    top_attackers = sorted(
        [{"ip": k, "count": v} for k, v in attackers_dict.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:5]
    
    top_countries = sorted(
        [{"country": k, "count": v} for k, v in countries_dict.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:5]

    # 6. Trend mapping (daily incidents counts for Recharts)
    # Generate mock timeline for last 7 days
    trends = []
    now = datetime.utcnow()
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_str = day.strftime("%b %d")
        
        # Count incidents for this specific day
        # In a fully populated db, we check timestamps. For fallback/demo, we can count in Python.
        incidents_on_day = 0
        all_incidents_list = await db.incidents.find({})
        for inc in all_incidents_list:
            created_at = inc.get("created_at")
            if created_at and created_at.date() == day.date():
                incidents_on_day += 1
                
        # Seed some default trend curve if data is low
        if len(all_incidents_list) == 0:
            mock_vals = [5, 8, 3, 12, 6, 9, 4]
            incidents_on_day = mock_vals[6 - i]
            
        trends.append({
            "day": day_str,
            "incidents": incidents_on_day,
            "alerts": incidents_on_day * 4 + 2  # mock alert correlation trend
        })
        
    # 7. Category Distribution
    categories_dict = {}
    for alert in all_alerts:
        cat = alert.get("category", "Other")
        categories_dict[cat] = categories_dict.get(cat, 0) + 1
    categories_data = [{"category": k, "count": v} for k, v in categories_dict.items()]

    return {
        "securityScore": security_score,
        "metrics": {
            "totalAlerts": total_alerts,
            "unresolvedAlerts": unresolved_alerts,
            "criticalAlerts": critical_alerts,
            "highAlerts": high_alerts,
            "mediumAlerts": medium_alerts,
            "lowAlerts": low_alerts,
            "totalIncidents": total_incidents,
            "openIncidents": open_incidents,
            "investigatingIncidents": investigating_incidents,
            "resolvedIncidents": resolved_incidents
        },
        "trends": trends,
        "devices": devices_data if devices_data else [{"name": "Firewall", "value": 1}],
        "topAttackers": top_attackers if top_attackers else [{"ip": "192.168.1.100", "count": 1}],
        "topCountries": top_countries,
        "categories": categories_data if categories_data else [{"category": "Brute Force", "count": 1}]
    }
