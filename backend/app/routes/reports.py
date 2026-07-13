from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
import io
import csv
from datetime import datetime
from app.auth import get_current_user
from app.database import db

router = APIRouter(prefix="/reports", tags=["Reporting Engine"])

@router.get("/export")
async def export_report(
    format_type: str = Query("csv", alias="format", regex="^(csv|excel|json)$"),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate and download reports of security alerts and incidents.
    Supports CSV, Excel (CSV format optimized for Excel), and JSON.
    """
    incidents = await db.incidents.find({})
    alerts = await db.alerts.find({})
    
    # Audit log report generation
    await db.audit_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "user": current_user["email"],
        "action": "Generate Report",
        "details": f"Exported security report in {format_type} format."
    })
    
    if format_type == "json":
        return {
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": current_user["email"],
            "summary": {
                "total_incidents": len(incidents),
                "total_alerts": len(alerts)
            },
            "incidents": incidents,
            "alerts": alerts
        }
        
    # Generate CSV stream
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";" if format_type == "excel" else ",")
    
    # Write Header
    writer.writerow([
        "Incident ID", "Title", "Description", "Status", "Severity", 
        "Assigned To", "Created At", "MITRE Technique", "Root Cause"
    ])
    
    # Write Rows
    for inc in incidents:
        writer.writerow([
            inc.get("id"),
            inc.get("title"),
            inc.get("description"),
            inc.get("status"),
            inc.get("severity"),
            inc.get("assigned_to") or "Unassigned",
            inc.get("created_at").isoformat() if isinstance(inc.get("created_at"), datetime) else str(inc.get("created_at")),
            inc.get("mitre_technique") or "N/A",
            inc.get("root_cause") or "N/A"
        ])
        
    output.seek(0)
    
    filename = f"soc_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")), 
        media_type="text/csv", 
        headers=headers
    )
