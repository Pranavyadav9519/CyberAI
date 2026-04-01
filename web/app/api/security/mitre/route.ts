import { NextRequest, NextResponse } from "next/server";
import { withSecurity } from "@/lib/middleware/security";
import { auditLog } from "@/lib/middleware/audit";

/**
 * MITRE ATT&CK technique lookup (offline dataset — top 30 common techniques).
 * GET /api/security/mitre?id=T1059
 * GET /api/security/mitre?tactic=execution&limit=10
 */

interface AttackTechnique {
  id: string;
  name: string;
  tactic: string[];
  description: string;
  url: string;
  platforms: string[];
  detection: string;
}

const TECHNIQUES: AttackTechnique[] = [
  { id: "T1059", name: "Command and Scripting Interpreter", tactic: ["execution"], description: "Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries.", url: "https://attack.mitre.org/techniques/T1059/", platforms: ["Windows","Linux","macOS"], detection: "Monitor for suspicious process spawning, script execution, and encoded commands." },
  { id: "T1059.001", name: "PowerShell", tactic: ["execution"], description: "Adversaries may abuse PowerShell commands and scripts for execution.", url: "https://attack.mitre.org/techniques/T1059/001/", platforms: ["Windows"], detection: "Monitor PowerShell logs (4103/4104), block unsigned scripts, enable AMSI." },
  { id: "T1059.003", name: "Windows Command Shell", tactic: ["execution"], description: "Adversaries may abuse the Windows command shell for execution.", url: "https://attack.mitre.org/techniques/T1059/003/", platforms: ["Windows"], detection: "Monitor cmd.exe execution, watch for suspicious child processes." },
  { id: "T1078", name: "Valid Accounts", tactic: ["defense-evasion","persistence","privilege-escalation","initial-access"], description: "Adversaries may obtain and abuse credentials of existing accounts as a means of gaining initial access.", url: "https://attack.mitre.org/techniques/T1078/", platforms: ["Windows","Linux","macOS","Cloud"], detection: "Monitor for unusual login times, locations, and privilege use." },
  { id: "T1190", name: "Exploit Public-Facing Application", tactic: ["initial-access"], description: "Adversaries may attempt to take advantage of a weakness in an internet-facing host or system.", url: "https://attack.mitre.org/techniques/T1190/", platforms: ["Windows","Linux","macOS","Network"], detection: "Monitor for web application attacks, review WAF logs, patch promptly." },
  { id: "T1566", name: "Phishing", tactic: ["initial-access"], description: "Adversaries may send phishing messages to gain access to victim systems.", url: "https://attack.mitre.org/techniques/T1566/", platforms: ["Windows","Linux","macOS","SaaS","Office 365"], detection: "Email gateway scanning, user training, link/attachment sandboxing." },
  { id: "T1027", name: "Obfuscated Files or Information", tactic: ["defense-evasion"], description: "Adversaries may attempt to make an executable or file difficult to discover or analyze.", url: "https://attack.mitre.org/techniques/T1027/", platforms: ["Windows","Linux","macOS"], detection: "Detect encoded commands, packed executables, and deobfuscation activity." },
  { id: "T1055", name: "Process Injection", tactic: ["defense-evasion","privilege-escalation"], description: "Adversaries may inject code into processes in order to evade process-based defenses.", url: "https://attack.mitre.org/techniques/T1055/", platforms: ["Windows","Linux","macOS"], detection: "Monitor for suspicious process memory writes, API calls (VirtualAllocEx, WriteProcessMemory)." },
  { id: "T1105", name: "Ingress Tool Transfer", tactic: ["command-and-control"], description: "Adversaries may transfer tools or other files from an external system into a compromised environment.", url: "https://attack.mitre.org/techniques/T1105/", platforms: ["Windows","Linux","macOS"], detection: "Monitor for unexpected file downloads, unusual network connections to external IPs." },
  { id: "T1486", name: "Data Encrypted for Impact", tactic: ["impact"], description: "Adversaries may encrypt data on target systems or on large numbers of systems in a network to interrupt availability.", url: "https://attack.mitre.org/techniques/T1486/", platforms: ["Windows","Linux","macOS","IaaS"], detection: "Monitor for rapid file modification/encryption, volume shadow copy deletion, ransom note creation." },
  { id: "T1003", name: "OS Credential Dumping", tactic: ["credential-access"], description: "Adversaries may attempt to dump credentials to obtain account login and credential material.", url: "https://attack.mitre.org/techniques/T1003/", platforms: ["Windows","Linux","macOS"], detection: "Monitor LSASS access, Mimikatz signatures, SAM/NTDS.dit access." },
  { id: "T1021", name: "Remote Services", tactic: ["lateral-movement"], description: "Adversaries may use valid accounts to log into a service specifically designed to accept remote connections.", url: "https://attack.mitre.org/techniques/T1021/", platforms: ["Windows","Linux","macOS"], detection: "Monitor for unusual remote logins, RDP/SSH from unexpected sources." },
  { id: "T1083", name: "File and Directory Discovery", tactic: ["discovery"], description: "Adversaries may enumerate files and directories or may search in specific locations of a host or network share.", url: "https://attack.mitre.org/techniques/T1083/", platforms: ["Windows","Linux","macOS"], detection: "Baseline normal directory listing behavior, alert on mass enumeration." },
  { id: "T1110", name: "Brute Force", tactic: ["credential-access"], description: "Adversaries may use brute force techniques to gain access to accounts.", url: "https://attack.mitre.org/techniques/T1110/", platforms: ["Windows","Linux","macOS","Cloud","SaaS"], detection: "Monitor for repeated failed authentications, implement account lockout policies." },
  { id: "T1133", name: "External Remote Services", tactic: ["initial-access","persistence"], description: "Adversaries may leverage external-facing remote services to initially access and/or persist within a network.", url: "https://attack.mitre.org/techniques/T1133/", platforms: ["Windows","Linux","macOS"], detection: "Monitor VPN/RDP/Citrix access logs, enforce MFA." },
];

async function handler(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.toUpperCase();
  const tactic = searchParams.get("tactic")?.toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") ?? 15), 50);

  auditLog({ type: "mitre-lookup", isAdmin: false, id: id ?? undefined, tactic: tactic ?? undefined, timestamp: new Date().toISOString() });

  if (id) {
    const technique = TECHNIQUES.find((t) => t.id === id || t.id === id.replace(".", "/"));
    if (!technique) {
      return NextResponse.json({ error: `Technique ${id} not found in local dataset. Visit https://attack.mitre.org/techniques/${id}/` }, { status: 404 });
    }
    return NextResponse.json({ technique });
  }

  if (tactic) {
    const filtered = TECHNIQUES.filter((t) => t.tactic.includes(tactic)).slice(0, limit);
    return NextResponse.json({ tactic, techniques: filtered, total: filtered.length });
  }

  return NextResponse.json({ techniques: TECHNIQUES.slice(0, limit), total: TECHNIQUES.length });
}

export const GET = withSecurity(handler);
