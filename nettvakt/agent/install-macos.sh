#!/bin/sh
set -eu
if [ -x /Library/Frameworks/Python.framework/Versions/Current/bin/python3 ]; then
  PYTHON=/Library/Frameworks/Python.framework/Versions/Current/bin/python3
elif command -v python3 >/dev/null 2>&1 && python3 -c "import ssl,plistlib" >/dev/null 2>&1; then
  PYTHON=$(command -v python3)
else
  echo 'Python 3 mangler. Installer gratis Python 3 fra python.org først.' >&2
  exit 1
fi
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DIR="$HOME/.config/smed-nettvakt"
BIN="$DIR/nettvakt_agent.py"
PLIST="$HOME/Library/LaunchAgents/no.smed.nettvakt.plist"
mkdir -p "$DIR" "$HOME/Library/LaunchAgents"
cp "$HERE/nettvakt_agent.py" "$BIN"
cp "$HERE/smed_health.py" "$DIR/smed_health.py"
chmod 600 "$DIR/smed_health.py"
chmod 700 "$DIR"; chmod 700 "$BIN"
if [ ! -e "$DIR/config.json" ]; then
  cat > "$DIR/config.json" <<'JSON'
{
  "bridge_url": "https://smed-obd-i2kp.onrender.com",
  "interval_seconds": 60,
  "target_ips": [],
  "ha_url": "",
  "ha_token_file": "",
  "ha_entities": []
}
JSON
  chmod 600 "$DIR/config.json"
fi
if [ ! -e "$DIR/agent.token" ]; then
  echo 'Lim inn SMED_AGENT_TOKEN fra Render (vises ikke på skjermen):'
  "$PYTHON" - "$DIR/agent.token" <<'PY'
import getpass,hmac,hashlib,pathlib,os,sys
raw=getpass.getpass('Agentnøkkel: ')
if len(raw)<24: raise SystemExit('Nøkkelen er for kort')
secret=hmac.new(raw.encode('utf8'), b'smed-nettvakt-agent-v1',hashlib.sha256).hexdigest()
p=pathlib.Path(sys.argv[1]);p.write_text(secret+'\n');os.chmod(p,0o600)
print('Avledet Nettvakt-nøkkel lagret. OBD-originalen ble ikke lagret.')
PY
fi
cat > "$PLIST" <<XML
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>no.smed.nettvakt</string>
<key>ProgramArguments</key><array><string>$PYTHON</string><string>$BIN</string></array>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
<key>StandardOutPath</key><string>$DIR/stdout.log</string>
<key>StandardErrorPath</key><string>$DIR/stderr.log</string>
</dict></plist>
XML
launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart -k "gui/$(id -u)/no.smed.nettvakt"
echo 'Smed Nettvakt installert. Logg: ~/.config/smed-nettvakt/stdout.log'
