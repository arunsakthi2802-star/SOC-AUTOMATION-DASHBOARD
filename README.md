# SOC Automation Dashboard

An Enterprise-grade Cybersecurity Automation and Incident Response platform designed to automate Security Operations Center (SOC) tasks, consolidate security logging, correlate events, trigger automated alert mitigation (SOAR), and visual threat analytics in real-time.

**Designed for**: SOC Analysts, Threat Hunters, Blue Teamers, Security Engineers, and Academic Cybersecurity Labs.
**Developer**: Aakash V M

---

## 🚀 Key Modules & Features

### 1. User Access & RBAC (Role-Based Access Control)
* JWT token authentication with robust cryptography hashing.
* Preseeded test user accounts representing administrative and L2 analyst roles.
* RBAC guards separating regular triage from global integrations and system settings.

### 2. Log Collection & Parsing
* API endpoint `/api/logs/upload` accepting standard log formats from Windows Active Directory, Linux, Firewalls, Web proxies (Nginx/Apache), and Cloud sources (AWS CloudTrail).
* Live streaming of ingested log feeds to client dashboards via asynchronous WebSockets.

### 3. Correlation & Threat Detection
* Rules engine checking for injection vectors (SQLi, XSS), local privilege exploits, samdumping/Mimikatz credentials extraction, and PowerShell scripting abuse.
* Dynamic sliding-window checks correlating historical entries to detect **Brute Force** and **Port Scanning** occurrences.
* Mapping of security detections to the standard **MITRE ATT&CK Framework**.

### 4. Alerting & Incident Escalation
* Auto-alert generation with severity classifications (Critical, High, Medium, Low).
* High and Critical alerts are promoted immediately into the **Incident Case Board**.
* Webhook trigger routing to notify teams (Slack, Telegram, email integrations).

### 5. Case File & Investigation Timeline
* Detailed incident files holding security analyst comments, incident statuses, assignee logs, and target Evidence (Indicators of Compromise - IOCs).
* Chronological Vertical Timeline registering all analyst operations alongside automated playbook triggers.

### 6. SOAR Automation Playbooks
* Configurable active playbooks managing defensive mitigation.
* Simulated playbooks: **Auto IP Firewall Block** and **Host Isolation** (simulating EDR sandboxing).
* Webhook updates delivered directly to mock channels.

### 7. Interactive Threat Intelligence
* Sandbox query engine searching reputation levels of suspicious IPs, host domains, or file hashes.
* Integrates simulated checks for **VirusTotal** positive detection ratios and **AbuseIPDB** confidence ratings.

### 8. System Compliance Reporting & Audits
* Exporter compiling incidents and active correlations into standard CSV streams that open natively in Microsoft Excel.
* Administrator audit logs capturing every critical analyst operation (logins, reports generated, playbook toggles).

---

## 🛠️ Technology Stack

* **Frontend**: React (Vite), TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, Axios.
* **Backend**: FastAPI (Python), Motor (Async MongoDB Driver), Pymongo, PyJWT, Bcrypt, WebSockets.
* **Database**: MongoDB (Production) with an automatic failover to **SQLite** (out-of-the-box local testing).
* **Deployment**: Docker, Docker Compose, multi-stage Nginx containers.

---

## 🚀 Local Quickstart Guide

### Prerequisites
* Python 3.10+
* Node.js v18+ and npm v9+

### 1. Run Backend Server
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Set up a virtual environment and install packages:
   ```bash
   python -m venv venv
   .\venv\Scripts\Activate.ps1   # Windows PowerShell
   # Or: source venv/bin/activate  # Linux/Mac
   python -m pip install -r requirements.txt
   ```
3. Run the backend server:
   ```bash
   python run.py
   ```
   *The API will start on **http://localhost:8000**.*
   *Self-documenting Swagger UI is available at **http://localhost:8000/docs**.*

### 2. Run Log Ingestion Simulator
Start the simulator in a separate terminal from the root workspace directory. It will feed simulated traffic and cyber attacks to the API:
```bash
python simulator.py
```

### 3. Run Frontend Dashboard
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Boot the Vite local dev server:
   ```bash
   npm run dev
   ```
   *The dashboard will host on **http://localhost:5173**.*

---

## 🐳 Docker Compose Deployment

To deploy the entire stack (MongoDB + FastAPI + React + Nginx proxy) with single-command orchestration:

1. Ensure Docker Desktop is active.
2. In the workspace root folder, execute:
   ```bash
   docker-compose up --build
   ```
3. Access the dashboard web application on **http://localhost:80**.

---

## 🔐 Credentials for Local Testing

When loading the platform for the first time, click **"Seed Database Users"** on the login page or issue a POST to `/api/auth/seed` via Swagger. You can then log in using:

* **Administrator Account**:
  * **Email**: `admin@soc.local`
  * **Password**: `AdminPass123!`
* **SOC Analyst L2 Account**:
  * **Email**: `analyst@soc.local`
  * **Password**: `AnalystPass123!`
