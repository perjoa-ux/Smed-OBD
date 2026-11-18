#!/bin/sh
# SMED-01: upgrade the already-installed read-only Mac agent without new credentials.
# Downloads from an immutable, tested GitHub revision. Never changes agent.token,
# config.json, Google Nest settings or any device configuration.
set -eu
REV="9f75cf9640c894939155ee08b31565c312c7ea28"
BASE="https://raw.githubusercontent.com/perjoa-ux/Smed-OBD/$REV/nettvakt/agent"
DIR="$HOME/.config/smed-nettvakt"
PLIST="$HOME/Library/LaunchAgents/no.smed.nettvakt.plist"
LABEL="gui/$(id -u)/no.smed.nettvakt"

if [ ! -f "$PLIST" ] || [ ! -f "$DIR/agent.token" ] || [ ! -f "$DIR/config.json" ]; then
  echo "SMED-01 er ikke installert som forventet. Ingen filer ble endret." >&2
  exit 1
fi
if [ -x /Library/Frameworks/Python.framework/Versions/Current/bin/python3 ]; then
  PYTHON=/Library/Frameworks/Python.framework/Versions/Current/bin/python3
elif command -v python3 >/dev/null 2>&1; then
  PYTHON=$(command -v python3)
else
  echo "Python 3 mangler. Ingen filer ble endret." >&2
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "curl mangler. Ingen filer ble endret." >&2
  exit 1
fi

TMP=$(mktemp -d "${TMPDIR:-/tmp}/smed-update.XXXXXX")
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
echo "SMED-01: henter og kontrollerer ny agent ..."
curl --fail --location --silent --show-error --max-time 30 "$BASE/nettvakt_agent.py" -o "$TMP/nettvakt_agent.py"
curl --fail --location --silent --show-error --max-time 30 "$BASE/smed_health.py" -o "$TMP/smed_health.py"
curl --fail --location --silent --show-error --max-time 30 "$BASE/test_nettvakt_agent.py" -o "$TMP/test_nettvakt_agent.py"
"$PYTHON" - "$TMP" <<'PY'
import pathlib,sys
root=pathlib.Path(sys.argv[1])
for name in ("nettvakt_agent.py","smed_health.py"):
    file=root/name
    code=file.read_bytes()
    if len(code)<1000:
        raise SystemExit("Ufullstendig programfil: "+name)
    compile(code, name, "exec")
sys.path.insert(0,str(root))
import nettvakt_agent
if not callable(nettvakt_agent.collect):
    raise SystemExit("Ugyldig agentmodul")
print("Programkontroll OK")
PY
(cd "$TMP" && "$PYTHON" -m unittest -q test_nettvakt_agent.py)

for f in nettvakt_agent.py smed_health.py; do
  if [ -f "$DIR/$f" ]; then cp -p "$DIR/$f" "$TMP/backup-$f"; fi
done
rollback() {
  echo "Oppdateringen feilet. Tilbakestiller forrige agent." >&2
  for f in nettvakt_agent.py smed_health.py; do
    if [ -f "$TMP/backup-$f" ]; then
      cp "$TMP/backup-$f" "$DIR/$f"
      chmod 600 "$DIR/$f"
    fi
  done
  launchctl kickstart -k "$LABEL" >/dev/null 2>&1 || true
}
for f in nettvakt_agent.py smed_health.py; do
  cp "$TMP/$f" "$DIR/.$f.next"
  chmod 600 "$DIR/.$f.next"
done
mv -f "$DIR/.smed_health.py.next" "$DIR/smed_health.py"
mv -f "$DIR/.nettvakt_agent.py.next" "$DIR/nettvakt_agent.py"
chmod 700 "$DIR/nettvakt_agent.py"
if ! launchctl kickstart -k "$LABEL"; then
  rollback
  exit 1
fi
echo "SMED-01 oppdatert og agenten startet på nytt."
echo "Agentnøkkel, eksisterende konfigurasjon og ruteren er uendret."
echo "Logg: $DIR/stdout.log"
