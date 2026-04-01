# 🛡️ CyberAI

**CyberAI** is a cybersecurity-focused AI assistant built on top of [codeaashu/claude-code](https://github.com/codeaashu/claude-code) and powered by Anthropic Claude. It provides an intelligent chat interface specialized for SOC operations, vulnerability research, malware triage, and secure code review.

> **Attribution**: Core web UI is derived from [codeaashu/claude-code](https://github.com/codeaashu/claude-code) (MIT License). See [ATTRIBUTION.md](ATTRIBUTION.md).

---

## Features

| Feature | Description |
|---|---|
| 🛡️ Cybersecurity System Prompt | Pre-loaded expertise in MITRE ATT&CK, CVEs, SOC ops, malware analysis |
| 🔍 CVE Lookup | Query NVD (NIST) by CVE ID or keyword via `/api/security/cve` |
| ⚔️ MITRE ATT&CK | Technique reference lookup via `/api/security/mitre` |
| 🦠 IOC Enrichment | Hash/IP/domain/URL reputation via `/api/security/ioc` (VirusTotal optional) |
| 📋 Prompt Presets | One-click presets: SOC Triage, Vuln Assessment, Malware Triage, Secure Code Review |
| 🔐 Admin Bypass | Unrestricted mode for owner via `ADMIN_SECRET` config |
| 🚦 Rate Limiting | Per-IP rate limiting (configurable RPM) |
| 🔑 API Key Gate | Optional `CYBERAI_API_KEY` to restrict access |
| 📝 Audit Logging | Structured JSON audit logs with optional PII redaction |
| 🌐 CORS Config | Configurable CORS origin headers |

---

## Quick Start

### Prerequisites
- Node.js 20+ (or Bun 1+)
- Anthropic API key ([get one](https://console.anthropic.com/))

### 1. Clone and install

```bash
git clone https://github.com/Pranavyadav9519/CyberAI.git
cd CyberAI/web
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...          # Required
ADMIN_SECRET=your-strong-secret-here  # Admin bypass (keep private!)
NVD_API_KEY=                          # Optional, for higher NVD rate limits
VIRUSTOTAL_API_KEY=                   # Optional, for IOC enrichment
```

### 3. Run

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Production server
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | — | Anthropic Claude API key |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | Backend API URL |
| `ADMIN_SECRET` | No | — | Secret for admin bypass header |
| `CYBERAI_API_KEY` | No | — | API key for client requests (leave empty = open) |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origin(s) |
| `RATE_LIMIT_RPM` | No | `60` | Requests per minute per IP |
| `AUDIT_LOG_FILE` | No | stdout | Path to audit log file |
| `AUDIT_REDACT_PII` | No | `false` | Redact message content from audit logs |
| `NVD_API_KEY` | No | — | NVD API key for CVE lookups |
| `VIRUSTOTAL_API_KEY` | No | — | VirusTotal API key for IOC enrichment |

---

## Security API Endpoints

### CVE Lookup
```
GET /api/security/cve?id=CVE-2024-44000
GET /api/security/cve?keyword=log4j&limit=10
```

### MITRE ATT&CK
```
GET /api/security/mitre?id=T1059
GET /api/security/mitre?tactic=execution&limit=10
GET /api/security/mitre
```

### IOC Enrichment
```
POST /api/security/ioc
Content-Type: application/json

{ "ioc": "1.2.3.4" }           # IP reputation
{ "ioc": "evil.com" }           # Domain reputation  
{ "ioc": "abc123...64hex" }     # File hash (SHA-256/SHA-1/MD5)
{ "ioc": "https://evil.com" }   # URL reputation
```

---

## Prompt Presets

Click a preset button in the chat UI to load a specialized prompt:

| Preset | Use Case |
|---|---|
| 🔍 SOC Triage | Analyze security alerts/events, get severity + MITRE stage + containment steps |
| 🛡️ Vuln Assessment | CVSS breakdown, affected systems, exploit availability, remediation |
| 🦠 Malware Triage | Identify malware family, capabilities, MITRE TTPs, YARA/Sigma snippets |
| 💻 Secure Code Review | CWE-mapped findings with severity and fix examples |

---

## Admin Bypass

CyberAI supports an **admin/owner bypass mode** that removes content restrictions for advanced security research.

> ⚠️ **Security Warning**: Admin mode disables safety filters and provides unrestricted answers about offensive techniques, exploits, and malware. Use responsibly and only for legitimate security research.

### Enabling admin mode

1. Set `ADMIN_SECRET` in `.env.local` to a strong random string
2. Pass the header `X-CyberAI-Admin: <your-secret>` in API requests

Example:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-CyberAI-Admin: your-admin-secret" \
  -d '{"messages": [{"role": "user", "content": "Explain CVE-2021-44228 exploitation"}]}'
```

The UI does not currently expose an admin toggle — use direct API calls or a browser extension to set the header.

---

## Docker

A `Dockerfile.web` is provided for containerized deployment:

```bash
docker build -f Dockerfile.web -t cyberai .
docker run -p 3000:3000 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e ADMIN_SECRET=strong-random-secret \
  cyberai
```

---

## Development

```bash
cd web
npm run dev          # Start dev server
npm run lint         # ESLint check
npm run type-check   # TypeScript check
npm test             # Run tests
```

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE).

Portions of the code are derived from [codeaashu/claude-code](https://github.com/codeaashu/claude-code) (MIT). See [ATTRIBUTION.md](ATTRIBUTION.md) for full attribution.
