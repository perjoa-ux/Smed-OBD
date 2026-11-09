# Smed-OBD

Diagnoseapp for Mitsubishi Outlander 2011 CW1W 4N14, via KONNWEI KDIAG / Bluefy og Render HTTPS.

**App:** https://smed-obd-i2kp.onrender.com

## Gjeldende versjon og innhold

- `index.html` – v0.21. BLE → CAN 7E0 → første automatisk ECU-skanning → Render-serverbro.
- `ECU-KOMMANDOKATALOG.md` – samlet katalog med dokumenterte kilder og status per kommando.
- `bridge/server.mjs` – HTTPS-server for autentisert diagnose, lagring av skannelogger og GitHub-kommandobro.
- `bridge/README.md` – teknisk oppsett / tilgang og rutiner.
- `4n14-egr-dpf.html` – EGR/DPF-referanseside.

Kommandokatalog: 75 produsentspesifikke 4N14-datablokker med 273 navngitte felt i kildeprofilen; 48 standard OBD-lesekommandoer; totalt 123 unike katalogoppføringer. Kommandoene er ikke alle bekreftet støttet på denne ECU-en.

### Dokumentert test

2026-11-09 kjørte Bluefy v0.20 en faktisk skanning av 81 kommandoer. Render logget `SMED_SCAN_FINISHED` med `completed`, 81/81 overført, samt råsvar for blant annet `2117` / beregnet oljeøkning 1550 cc. Fire `21xx`-blokker svarte `7F 21 12`; `0A` svarte `NO DATA`. Resultat finnes i Render-loggene, og lokal kopi i Bluefy.

### Diagnose og sikkerhet

- Lesekommandoer er allowlistet både i Bluefy og Render.
- Standard OBD-modus `04` er egen skriveoperasjon som krever dobbel godkjenning på telefonen. Den er **ikke** en oljereset.
- `30540700` (MUT-III «Engine oil exchange service»), `1092`, `1081`, `3E02`, `2380878C02` og uavklarte DPF-rutiner er kildebelagte **referanser, ikke aktive ECU-handlinger**.
- Ikke legg `SMED_DEVICE_TOKEN` eller `SMED_AGENT_TOKEN` i GitHub; nøklene hører hjemme i Render Environment og privat på telefonen.

Appen har ikke fullstendig MUT-III-funksjonsdekning, programmerings-/kodefunksjoner eller verifisert P252F-oljereset. Det er ikke nødvendig å koble til bilen for å endre og publisere appkoden.
