from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "Admin"
    ANALYST = "Analyst"

class AlertSeverity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    INFORMATIONAL = "Informational"

class AlertStatus(str, Enum):
    NEW = "New"
    ACKNOWLEDGED = "Acknowledged"
    SUPPRESSED = "Suppressed"
    RESOLVED = "Resolved"

class IncidentStatus(str, Enum):
    OPEN = "Open"
    INVESTIGATING = "Investigating"
    RESOLVED = "Resolved"
    CLOSED = "Closed"

# User models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.ANALYST

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Security Log models
class LogEntry(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: str  # e.g., Windows, Linux, Firewall, Nginx, AWS
    event_id: int
    message: str
    severity: str
    ip_address: Optional[str] = None
    username: Optional[str] = None

class LogUploadRequest(BaseModel):
    logs: List[LogEntry]

# Alert models
class AlertEntry(BaseModel):
    id: str
    timestamp: datetime
    title: str
    description: str
    severity: AlertSeverity
    source_log_ids: List[str]
    status: AlertStatus = AlertStatus.NEW
    mitre_technique: Optional[str] = None
    category: str
    ip_address: Optional[str] = None
    username: Optional[str] = None

class AlertUpdate(BaseModel):
    status: AlertStatus

# Incident models
class TimelineEvent(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    analyst_name: str
    message: str

class IncidentEvidence(BaseModel):
    type: str  # IP, Domain, Hash, File, Registry
    value: str
    description: Optional[str] = None

class IncidentEntry(BaseModel):
    id: str
    title: str
    description: str
    status: IncidentStatus = IncidentStatus.OPEN
    severity: AlertSeverity
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    timeline: List[TimelineEvent] = []
    evidence: List[IncidentEvidence] = []
    mitre_technique: Optional[str] = None
    root_cause: Optional[str] = None
    lessons_learned: Optional[str] = None

class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: AlertSeverity
    assigned_to: Optional[str] = None
    evidence: List[IncidentEvidence] = []

class IncidentUpdate(BaseModel):
    status: Optional[IncidentStatus] = None
    severity: Optional[AlertSeverity] = None
    assigned_to: Optional[str] = None
    timeline_event: Optional[str] = None  # Message to add to timeline
    root_cause: Optional[str] = None
    lessons_learned: Optional[str] = None

# Threat Intel models
class ThreatIntelLookup(BaseModel):
    query: str  # IP, domain, or hash
    vt_positives: int
    vt_total: int
    abuse_score: int
    reputation: str  # Clean, Suspicious, Malicious
    details: Dict[str, Any]

# Settings model
class SettingsSchema(BaseModel):
    smtp_host: str = "smtp.mailtrap.io"
    smtp_port: int = 2525
    smtp_user: str = ""
    smtp_pass: str = ""
    slack_webhook: str = ""
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    auto_isolate_critical: bool = False
    auto_escalate_severity: str = "Critical"

# Playbook models
class PlaybookSchema(BaseModel):
    id: str
    name: str
    description: str
    trigger_category: str
    action_type: str  # block_ip, isolate_host, send_slack, send_email
    is_active: bool = True
