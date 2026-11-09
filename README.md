# Smed-OBD

iPhone Bluetooth diagnostics for Mitsubishi Outlander 4N14 using KONNWEI KDIAG and Bluefy.

- `index.html` — Bluetooth/diagnose-app (v0.15)
- `4n14-egr-dpf.html` — referanse for EGR og DPF
- `bridge/server.mjs` — HTTPS-backend for kontrollert lesetilgang til ECU
- `bridge/README.md` — drift, tilgangsnøkler, tilkobling og API

**Status:** Koden for serverbroen er inkludert, men en offentlig HTTPS-instans og tilkoblet MCP-verktøy må settes opp separat. Ingen ekstern nullstilling er tilgjengelig. Se [serverbroens oppsett](bridge/README.md).
