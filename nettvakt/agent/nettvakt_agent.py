#!/usr/bin/env python3
"""Smed Nettvakt: passive LAN inventory, uptime checks and optional Home Assistant data.

Only calls the configured HTTPS bridge using a derived, local-only token.
No external dependencies, device writes, router changes or open ports.
"""
import argparse
import json
import os
import platform
import re
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from smed_health import collect_mac_health, mac_alerts

HOME = Path.home() / ".config" / "smed-nettvakt"
DEFAULT = {
    "bridge_url": "https://smed-obd-i2kp.onrender.com",
    "interval_seconds": 60,
    "target_ips": [],
    "ha_url": "",
    "ha_token_file": "",
    "ha_entities": [],
}


def run(*args, timeout=5):
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=False)
        return result.stdout if result.returncode == 0 else ""
    except (OSError, subprocess.TimeoutExpired):
        return ""


def ipv4(value):
    try:
        bits = [int(x) for x in value.split(".")]
        return len(bits) == 4 and all(0 <= n < 256 for n in bits)
    except (ValueError, AttributeError):
        return False


def route_info():
    output = run("route", "-n", "get", "default")
    gateway = re.search(r"^\s*gateway:\s*(\S+)", output, re.M)
    interface = re.search(r"^\s*interface:\s*(\S+)", output, re.M)
    return gateway.group(1) if gateway and ipv4(gateway.group(1)) else "", interface.group(1) if interface else ""


def arp_inventory():
    output = run("arp", "-an", timeout=8)
    devices = []
    seen = set()
    # macOS example: ? (192.168.86.21) at aa:bb:cc:dd:ee:ff on en0 ifscope [ethernet]
    for line in output.splitlines():
        match = re.search(r"\((\d{1,3}(?:\.\d{1,3}){3})\)\s+at\s+([0-9a-fA-F:]{11,17})", line)
        if not match or not ipv4(match.group(1)) or match.group(1) in seen:
            continue
        seen.add(match.group(1))
        devices.append({"ip": match.group(1), "mac": match.group(2).lower(), "name": "", "state": "observed", "source": "arp"})
    return devices[:256]


def ping(ip):
    if not ipv4(ip):
        return None
    if platform.system() == "Darwin":
        output = run("ping", "-n", "-c", "1", "-W", "1200", ip, timeout=4)
    else:
        output = run("ping", "-n", "-c", "1", "-W", "2", ip, timeout=4)
    value = re.search(r"time[=<]([0-9]+(?:\.[0-9]+)?)\s*ms", output)
    return round(float(value.group(1)), 2) if value else None


def request(url, token, method="GET", payload=None, timeout=8):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    headers = {"Authorization": "Bearer " + token, "Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.load(response)


def homeassistant(cfg):
    base = cfg.get("ha_url", "").rstrip("/")
    token_file = cfg.get("ha_token_file", "")
    selected = cfg.get("ha_entities") or []
    if not base or not token_file or not selected or not base.startswith(("http://", "https://")):
        return [], "not_connected"
    try:
        token = Path(token_file).expanduser().read_text(encoding="utf8").strip()
        data = request(base + "/api/states", token)
        include = set(selected)
        states = [{"entity_id": s["entity_id"], "state": str(s.get("state", "unknown")),
                   "friendly_name": str(s.get("attributes", {}).get("friendly_name", ""))}
                  for s in data if s.get("entity_id") in include]
        return states[:256], "home_assistant"
    except (OSError, ValueError, KeyError, urllib.error.URLError):
        return [], "home_assistant_unavailable"


def collect(cfg):
    gateway, interface = route_info()
    devices = arp_inventory()
    known = {d["ip"] for d in devices}
    targets = [ip for ip in cfg.get("target_ips", []) if ipv4(ip)][:32]
    for ip in targets:
        if ip not in known:
            devices.append({"ip": ip, "mac": "", "name": "Target", "state": "offline", "source": "target"})
    gateway_ms = ping(gateway) if gateway else None
    for d in devices:
        if d["ip"] in targets:
            latency = ping(d["ip"])
            d["latency_ms"] = latency
            d["state"] = "online" if latency is not None else "offline"
    dns_ok = False
    try:
        socket.getaddrinfo("example.com", 443, type=socket.SOCK_STREAM)
        dns_ok = True
    except OSError:
        pass
    internet_ok = False
    try:
        req = urllib.request.Request("https://www.gstatic.com/generate_204", headers={"User-Agent": "Smed-Nettvakt/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            internet_ok = response.status == 204
    except (OSError, urllib.error.URLError):
        pass
    alerts = []
    if not gateway:
        alerts.append({"severity": "critical", "code": "NO_GATEWAY", "message": "Ingen standard gateway funnet"})
    elif gateway_ms is None:
        alerts.append({"severity": "warning", "code": "GATEWAY_PING_FAIL", "message": "Gateway svarte ikke på ping (kan være ICMP-blokkering)"})
    if not dns_ok:
        alerts.append({"severity": "warning", "code": "DNS_FAIL", "message": "DNS-oppslag feilet"})
    if not internet_ok:
        alerts.append({"severity": "warning", "code": "INTERNET_CHECK_FAIL", "message": "HTTPS-forbindelsestest feilet"})
    for d in devices:
        if d["ip"] in targets and d["state"] == "offline":
            alerts.append({"severity": "warning", "code": "TARGET_UNREACHABLE", "message": d["ip"] + " svarte ikke på ping"})
    smartlife, smartlife_source = homeassistant(cfg)
    mac_health = collect_mac_health()
    alerts.extend(mac_alerts(mac_health))
    return {
        "host": socket.gethostname(), "gateway": gateway,
        "interface": interface, "devices": devices[:256],
        "checks": {"gateway_ms": gateway_ms, "dns_ok": dns_ok, "internet_ok": internet_ok},
        "alerts": alerts[:100], "smartlife": smartlife,
        "smartlife_source": smartlife_source,
        "mac_health": mac_health,
    }


def process_command(base, token, cmd, cfg):
    kind = cmd.get("kind")
    if kind == "ping" and ipv4(cmd.get("ip")):
        # Only probes addresses explicitly handed out by the authenticated server.
        ms = ping(cmd["ip"])
        result = {"id": cmd["id"], "ok": ms is not None,
                  "result": "latency_ms=" + str(ms) if ms is not None else "no_icmp_response"}
    elif kind == "refresh":
        report = collect(cfg)
        request(base + "/nettvakt/report", token, method="POST", payload=report)
        result = {"id": cmd["id"], "ok": True, "result": "report_refreshed"}
    else:
        return
    request(base + "/nettvakt/result", token, method="POST", payload=result)


def main():
    parser = argparse.ArgumentParser(description="Smed Nettvakt – lokal nettverksvakt")
    parser.add_argument("--once", action="store_true", help="Send én rapport og avslutt")
    parser.add_argument("--dry-run", action="store_true", help="Samle data uten opplasting")
    args = parser.parse_args()
    cfg_path = HOME / "config.json"
    cfg = dict(DEFAULT)
    if cfg_path.exists():
        cfg.update(json.loads(cfg_path.read_text(encoding="utf8")))
    base = str(cfg["bridge_url"]).rstrip("/")
    if not base.startswith("https://"):
        sys.exit("Bridge må bruke HTTPS")
    token_file = HOME / "agent.token"
    if not args.dry_run and not token_file.exists():
        sys.exit("Manglende token: kjør install-macos.sh først")
    token = token_file.read_text(encoding="utf8").strip() if token_file.exists() else ""
    interval = min(max(int(cfg.get("interval_seconds", 60)), 30), 600)
    while True:
        report = collect(cfg)
        if args.dry_run:
            print(json.dumps(report, indent=2, ensure_ascii=False))
        else:
            try:
                ack = request(base + "/nettvakt/report", token, method="POST", payload=report)
                print("report_sent", ack.get("received_at"), "devices", ack.get("devices"), flush=True)
                cmd = request(base + "/nettvakt/next", token)
                if cmd.get("command"):
                    process_command(base, token, cmd["command"], cfg)
            except (OSError, ValueError, urllib.error.URLError) as e:
                print("bridge_offline", str(e)[:200], file=sys.stderr, flush=True)
        if args.once or args.dry_run:
            break
        time.sleep(interval)


if __name__ == "__main__":
    main()
