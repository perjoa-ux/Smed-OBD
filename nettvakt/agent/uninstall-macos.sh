#!/bin/sh
set -eu
PLIST="$HOME/Library/LaunchAgents/no.smed.nettvakt.plist"
if [ -f "$PLIST" ]; then
  launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
  rm -f "$PLIST"
fi
echo 'Agenten er stoppet. Data og nøkkel beholdes i ~/.config/smed-nettvakt.'
