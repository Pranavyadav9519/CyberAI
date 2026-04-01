/**
 * Lightweight audit logger.
 * Writes structured JSON lines to stdout (or a file if AUDIT_LOG_FILE is set).
 * PII redaction: when AUDIT_REDACT_PII=true, message content is replaced with [REDACTED].
 */

import { appendFileSync } from "fs";

export interface AuditEntry {
  type: string;
  isAdmin: boolean;
  messageCount?: number;
  endpoint?: string;
  ip?: string;
  timestamp: string;
  [key: string]: unknown;
}

const REDACT_PII = process.env.AUDIT_REDACT_PII === "true";
const LOG_FILE = process.env.AUDIT_LOG_FILE;

export function auditLog(entry: AuditEntry): void {
  try {
    const sanitized: AuditEntry = { ...entry };

    if (REDACT_PII) {
      // Remove any message content fields
      delete sanitized.content;
      delete sanitized.messages;
      delete sanitized.prompt;
    }

    const line = JSON.stringify(sanitized) + "\n";

    if (LOG_FILE) {
      appendFileSync(LOG_FILE, line);
    } else {
      process.stdout.write(`[AUDIT] ${line}`);
    }
  } catch {
    // Never let audit logging crash the request
  }
}
