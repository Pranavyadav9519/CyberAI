export const MODELS = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", description: "Most capable" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", description: "Balanced" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", description: "Fastest" },
] as const;

export const DEFAULT_MODEL = "claude-sonnet-4-6";

export const API_ROUTES = {
  chat: "/api/chat",
  stream: "/api/stream",
  cve: "/api/security/cve",
  mitre: "/api/security/mitre",
  ioc: "/api/security/ioc",
} as const;

export const MAX_MESSAGE_LENGTH = 100_000;
export const ADMIN_MAX_MESSAGE_LENGTH = 500_000;

export const STREAMING_CHUNK_SIZE = 64;

/** Cybersecurity prompt presets shown in the UI */
export const CYBER_PRESETS = [
  {
    id: "soc-triage",
    label: "SOC Triage",
    icon: "🔍",
    prompt:
      "You are a Tier-2 SOC analyst. Analyze the following alert/event data and provide: 1) Severity assessment, 2) Likely attack stage (MITRE ATT&CK), 3) Recommended immediate containment steps, 4) Evidence to collect.\n\nAlert data:\n",
  },
  {
    id: "vuln-assessment",
    label: "Vuln Assessment",
    icon: "🛡️",
    prompt:
      "You are a vulnerability management specialist. For the following CVE or finding, provide: 1) CVSS breakdown, 2) Affected systems/versions, 3) Exploit availability, 4) Recommended remediation and compensating controls.\n\nVulnerability:\n",
  },
  {
    id: "malware-triage",
    label: "Malware Triage",
    icon: "🦠",
    prompt:
      "You are a malware analyst. Analyze the following IOCs/sample data and provide: 1) Malware family/campaign guess, 2) Capabilities observed, 3) MITRE ATT&CK techniques, 4) YARA/Sigma rule snippets if applicable, 5) Recommended detection and remediation.\n\nIOC / sample data:\n",
  },
  {
    id: "secure-code",
    label: "Secure Code Review",
    icon: "💻",
    prompt:
      "You are a secure code reviewer. Analyze the following code for security vulnerabilities. For each finding provide: 1) Vulnerability type (CWE), 2) Severity (Critical/High/Medium/Low), 3) Affected lines, 4) Recommended fix with example.\n\nCode:\n```\n",
  },
] as const;

export type CyberPresetId = (typeof CYBER_PRESETS)[number]["id"];
