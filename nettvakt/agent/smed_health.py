"""Read-only Mac health metrics for Smed Nettvakt. No third-party packages.

Provides measured fields only; absent data is None, never an inferred success.
Never uploads serial numbers, user process lists or filenames.
"""
import os
import platform
import plistlib
import re
import shutil
import subprocess
import time


def _run(*args, timeout=8, as_bytes=False):
    try:
        p = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                           timeout=timeout, check=False)
        if p.returncode == 0:
            return p.stdout if as_bytes else p.stdout.decode('utf-8', 'replace')
    except (OSError, subprocess.TimeoutExpired):
        pass
    return b'' if as_bytes else ''


def _number(value, low=0, high=1_000_000):
    try:
        n = float(value)
        return n if low <= n <= high else None
    except (ValueError, TypeError):
        return None


def _load_health():
    try:
        cores = os.cpu_count() or None
        load = round(os.getloadavg()[0], 2)
    except (OSError, AttributeError):
        cores, load = None, None
    return cores, load


def _memory_health():
    total = _number(_run('sysctl', '-n', 'hw.memsize').strip(), 1, 1e13)
    text = _run('memory_pressure', '-Q', timeout=4)
    match = re.search(r'System-wide free memory percentage:\s*(\d+)%', text)
    available = _number(match.group(1), 0, 100) if match else None
    return round(total / 1024 ** 2) if total is not None else None, int(available) if available is not None else None


def _battery_health():
    health = { 'battery_percent': None, 'battery_is_charging': None,
               'battery_ac_power': None, 'battery_health_status': 'unknown',
               'battery_voltage_mv': None }
    raw = _run('ioreg', '-r', '-c', 'AppleSmartBattery', '-a', as_bytes=True)
    if raw:
        try:
            rows = plistlib.loads(raw)
            if isinstance(rows, list) and rows and isinstance(rows[0], dict):
                cell = rows[0]
                cap = _number(cell.get('CurrentCapacity'), 0, 1000000)
                max_cap = _number(cell.get('MaxCapacity'), 0.1, 1000000)
                if cap is not None and max_cap is not None:
                    health['battery_percent'] = min(100, round(cap * 100 / max_cap))
                charging = cell.get('IsCharging')
                health['battery_is_charging'] = charging if isinstance(charging, bool) else None
                supply = cell.get('ExternalConnected')
                health['battery_ac_power'] = supply if isinstance(supply, bool) else None
                mv = _number(cell.get('Voltage'), 0, 30000)
                health['battery_voltage_mv'] = round(mv) if mv is not None else None
                condition = cell.get('BatteryHealth')
                if isinstance(condition, str) and condition:
                    health['battery_health_status'] = condition[:60]
        except (ValueError, TypeError, plistlib.InvalidFileException):
            pass
    raw_text = _run('pmset', '-g', 'batt', timeout=4)
    if 'AC Power' in raw_text:
        health['battery_ac_power'] = True
    elif 'Battery Power' in raw_text:
        health['battery_ac_power'] = False
    found = re.search(r'\b(\d{1,3})%;', raw_text)
    if found:
        health['battery_percent'] = min(100, int(found.group(1)))
    if 'not charging' in raw_text.lower():
        health['battery_is_charging'] = False
    elif re.search(r'(?<!not )\bcharging\b', raw_text.lower()):
        health['battery_is_charging'] = True
    return health


def _disk_health():
    try:
        usage = shutil.disk_usage('/')
        percent = round(usage.free / usage.total * 100, 1) if usage.total else None
        total = round(usage.total / 1e9, 1)
        free = round(usage.free / 1e9, 1)
    except OSError:
        total, free, percent = None, None, None
    smart = 'unknown'
    data = _run('diskutil', 'info', '-plist', 'disk0', timeout=10, as_bytes=True)
    if data:
        try:
            info = plistlib.loads(data)
            status = info.get('SMARTStatus')
            if isinstance(status, str):
                smart = status[:40]
        except (ValueError, TypeError, plistlib.InvalidFileException):
            pass
    return total, free, percent, smart


def collect_mac_health():
    cores, load = _load_health()
    memory_mb, memory_free = _memory_health()
    disk_gb, free_gb, free_pct, smart = _disk_health()
    battery = _battery_health()
    boot = _run('sysctl', '-n', 'kern.boottime', timeout=4)
    match = re.search(r'\bsec\s*=\s*(\d+)', boot)
    uptime = max(0, int(time.time()) - int(match.group(1))) if match else None
    return {
        'os_name': platform.system(),
        'os_version': platform.mac_ver()[0] if platform.system() == 'Darwin' else '',
        'cpu_logical_cores': cores,
        'cpu_load_1m': load,
        'memory_total_mb': memory_mb,
        'memory_free_percent': memory_free,
        'disk_total_gb': disk_gb,
        'disk_free_gb': free_gb,
        'disk_free_percent': free_pct,
        'disk_smart_status': smart,
        'uptime_seconds': uptime,
        'temperature_c': None,  # macOS has no unprivileged standard temperature API.
        **battery,
    }


def mac_alerts(health):
    alerts = []
    if health['battery_percent'] is not None and health['battery_percent'] <= 5 and health['battery_is_charging'] is False:
        alerts.append({'severity':'warning', 'code':'BATTERY_NOT_CHARGING',
                       'message':'Batteri lavt og ikke under lading. Sjekk tilstand og strømforsyning.'})
    if health['disk_free_percent'] is not None and health['disk_free_percent'] < 10:
        alerts.append({'severity':'warning', 'code':'DISK_SPACE_LOW',
                       'message':'Mindre enn 10 % ledig plass på systemdisken.'})
    if health['disk_smart_status'].lower() in ('failing', 'failed'):
        alerts.append({'severity':'critical', 'code':'DISK_SMART_FAIL',
                       'message':'Intern harddisk melder SMART-feil.'})
    return alerts
