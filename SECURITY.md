# Security Policy — CyberAI

## Overview

CyberAI is an AI-powered cybersecurity assistant. This document describes the threat model, security guardrails, admin bypass implications, and how to report vulnerabilities.

---

## Threat Model

### Assets
- Anthropic API key (accesses paid LLM service)
- Admin secret (bypasses content restrictions)
- Optional VirusTotal / NVD API keys
- User conversation content (may contain sensitive security data)
- Audit logs

### Threat Actors
| Actor | Risk |
|---|---|
| **Unauthenticated external user** | Rate limit abuse, prompt injection, resource exhaustion |
| **Authenticated user (bad actor)** | Prompt injection, data exfiltration via LLM, API key theft |
| **Compromised admin secret** | Full bypass of content restrictions, unrestricted offensive queries |
| **Supply chain** | Malicious npm packages, upstream claude-code changes |

### Out of scope
- Server-side LLM jailbreaks (mitigated by Anthropic guardrails)
- Physical access to server
- Anthropic infrastructure

---

## Guardrails Implemented

### 1. Rate Limiting
- Per-IP rate limiting (default: 60 req/min, configurable via `RATE_LIMIT_RPM`)
- Implemented in `web/lib/middleware/security.ts`
- Returns HTTP 429 with `Too many requests`

### 2. API Key Gate (Optional)
- Set `CYBERAI_API_KEY` to require authentication for all API calls
- Clients must provide the key via `X-Api-Key` header or `Authorization: Bearer <key>`
- Returns HTTP 401 if key missing or wrong

### 3. Admin Bypass
- Controlled via `ADMIN_SECRET` env variable
- Client passes `X-CyberAI-Admin: <secret>` header
- When matched: injects unrestricted system prompt, raises message size limit to 500,000 chars
- **Risk**: Anyone with the admin secret gets unrestricted LLM access. Rotate the secret if compromised.
- Default: admin mode disabled (safe mode for all users)

### 4. Input Size Limits
- Standard users: 100,000 character message cap
- Admin users: 500,000 character cap
- Requests exceeding 2× the limit are rejected with HTTP 413

### 5. CORS Configuration
- Default: `Access-Control-Allow-Origin: *`
- Set `CORS_ORIGIN` env to restrict to specific origin(s)
- Security headers added to all `/api/*` routes:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`

### 6. Audit Logging
- All API calls produce structured JSON audit logs
- Includes: request type, admin status, message count, timestamp
- Optional PII redaction: set `AUDIT_REDACT_PII=true` to omit message content
- Log destination: stdout (default) or file (`AUDIT_LOG_FILE`)
- Logs are non-blocking and never crash the request handler

### 7. Secrets Management
- All secrets loaded from environment variables (`.env.local`)
- `.env.local` and all `.env.*.local` files are git-ignored
- `.env.example` provided with documentation but no real values

---

## Admin Bypass — Implications and Risks

### What admin mode does
- Replaces the standard cybersecurity system prompt with an **unrestricted variant** that explicitly instructs the LLM to answer all questions without content restrictions
- This includes: detailed exploit techniques, offensive tool usage, malware behavior analysis, red-team tradecraft

### Why it exists
The owner/admin is a security professional using this tool for legitimate security research, red-team operations, penetration testing, and malware analysis. Safe-mode restrictions would impede this work.

### Risks
1. **Secret theft**: If `ADMIN_SECRET` is leaked, attackers can use your LLM budget for unrestricted queries
2. **Log exposure**: Admin sessions are flagged in audit logs; ensure logs are protected
3. **Anthropic policy**: Even in admin mode, queries are subject to Anthropic's usage policies at the API level
4. **No UI toggle**: Admin mode requires direct API header manipulation, reducing accidental activation

### Mitigations
- Use a strong, randomly-generated `ADMIN_SECRET` (32+ chars)
- Rotate the secret regularly
- Enable `AUDIT_LOG_FILE` to monitor admin usage
- Restrict `CORS_ORIGIN` if serving from a known domain
- Never expose the `ADMIN_SECRET` in client-side code

---

## Reporting a Vulnerability

If you discover a security vulnerability in CyberAI:

1. **Do not** open a public GitHub issue
2. Email the repository owner or open a GitHub Security Advisory
3. Include: description, reproduction steps, potential impact
4. We aim to acknowledge within 48 hours and patch within 7 days for critical issues

---

## Dependency Security

- Dependencies sourced from npm registry
- Check for known vulnerabilities: `npm audit`
- Upstream dependency: [codeaashu/claude-code](https://github.com/codeaashu/claude-code) (MIT)

### Known upstream issues
- **Next.js 14.x DoS (GHSA)**: Next.js 14 is affected by an HTTP request deserialization DoS via insecure React Server Components (patched in 15.0.8). Our app uses standard API routes (not RSC-based fetching), which reduces exposure. Upgrade to Next.js 15 when ready to fully resolve.

---

## Changelog

| Version | Change |
|---|---|
| 0.2.0 | Initial CyberAI release with security middleware, admin bypass, audit logging |
