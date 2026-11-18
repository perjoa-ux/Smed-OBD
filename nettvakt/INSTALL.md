# SMED-01 · Smed Nettvakt 0.2 · installasjon på macOS Catalina

1. På MacBooken: Kontroller at den står tilkoblet strøm og Google Nest-WiFi.
2. Åpne Terminal og skriv `python3 --version`. Får du ikke et faktisk versjonsnummer, installer gratis, kompatibel Python 3 fra https://www.python.org/downloads/macos/ (macOS 10.15 eller nyere). Ingen andre programmer behøves.
3. Last ned `Smed-Nettvakt-v0.2.0.zip`, dobbeltklikk for å pakke ut.
4. Åpne Terminal, skriv `sh ` (inkludert mellomrom), dra filen `agent/install-macos.sh` fra den utpakkede mappen inn i Terminal, og trykk Enter.
5. Ved forespørsel om `SMED_AGENT_TOKEN`: Åpne https://dashboard.render.com/web/srv-dbomo1ijnfac73fd7ei0 → Environment. Kopier `SMED_AGENT_TOKEN` inn i Terminal. Nøkkelen er skjult når du skriver, og skal aldri sendes i ChatGPT.
6. Sensoren installeres som LaunchAgent og starter automatisk når brukeren `smed` er innlogget. Den trenger ikke skjermen på.
7. Se i Terminal: `tail -n 20 ~/.config/smed-nettvakt/stdout.log`. Ved behov: `tail -n 20 ~/.config/smed-nettvakt/stderr.log`.
8. Åpne privat ChatGPT-plugin: https://chatgpt.com/plugins/plugins_6afc50e7eff48191af7a5df24d603c10 og test `nettvakt_status`, deretter `nettvakt_mac_health`.

## Viktig
- MacBookens batteri viser 1 % og lader ikke. Inspiser batteriet fysisk for oppsvulming/varme før maskinen brukes uten tilsyn. Det er ingen avbruddsfri strømforsyning ved strømbrudd.
- macOS Catalina er gammelt; MacBooken skal ikke eksponeres direkte mot internett. Agenten kontakter eksisterende Render-bro med utgående HTTPS.
- Helseovervåkingen leser CPU-load, minnepress, diskplass, S.M.A.R.T., batteri og oppetid. Temperatur rapporteres som ukjent inntil en kompatibel sensor er installert. Ingen data eller enhetsidentifikatorer sendes utover tillatte felter.
- GitHub/Render-broen lagrer den nyeste rapporten i minnet. Dette er ingen komplett historikkdatabase.
- Første nettverksinventar basert på ARP er ikke en komplett oversikt over alle Nest-klienter.
- SmartLife-tilstand krever separat Home Assistant/Tuya. Ingen automatisk styring av Google Nest-ruterne.
- Avinstallering: `sh agent/uninstall-macos.sh` fra pakken. Brukeren skal være innlogget for LaunchAgent.
