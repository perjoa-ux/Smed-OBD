# SMED-OBD — samlet prosjektstatus 9. november 2026

Denne filen samler dagens samtaletråder og de tekniske resultatene for **Smed-OBD**, slik at fremtidig arbeid viderefører bekreftede fremskritt. Oppdatert etter GitHub/Render-integrasjonen samme dag.

## 1. Mål og rammer

- Egen diagnoseapp for Pers **Mitsubishi Outlander 2011 CW1W, 2.2 DI-D, motor 4N14**.
- iPhone 15 Pro Max, **Bluefy** (Web Bluetooth) og **KONNWEI KDIAG** kobler appen fysisk til motor-ECU.
- ChatGPT («Smed») skal etter at Per har koblet til og godkjent Bluetooth, styre diagnostikk via ekstern bro, motta reelle ECU-svar og arbeide med **P252F**.
- Ikke simulere Bluetooth/ECU eller gjenta tidligere avklarte grunnpremisser.
- Per gir uttrykkelig tillatelse til tilgjengelige appfunksjoner; faktisk teknisk tilgjengelighet og verifisering av skrivekommandoer er egne forutsetninger.

## 2. GitHub-konto, tilgang og kildekode

- GitHub-bruker: `perjoa-ux`.
- Repo: **https://github.com/perjoa-ux/Smed-OBD**.
- GitHub-plugin og Codex Connector ble autorisert; installasjonen fikk tilgang til «All repositories».
- **Reell skrivetilgang bekreftet** gjennom opprettelse av testgren og deretter commits/oppdateringer.
- Standardgren: `main`. Publiseringsserveren henter `main`.
- Appen ligger i `index.html`; tilleggsside `4n14-egr-dpf.html`; backend `bridge/server.mjs`; `bridge/package.json`; dokumentasjon `bridge/README.md`; Render-konfigurasjon `render.yaml`.
- Den opprinnelige broen ble integrert via pull request og senere utvidet med MCP og GitHub-kommandobro.

## 3. Bluefy-app og Bluetooth-status

- Appversjon **Smed-OBD v0.15** (logget 9. november: «v0.15 startet – fysisk ECU-tilkobling kreves»).
- Appen er åpnet fra GitHub Pages i Bluefy; nettadressen kan være `https://perjoa-ux.github.io/...`.
- Feltet **Broserver (HTTPS-adresse)** skal inneholde **https://smed-obd-i2kp.onrender.com**, IKKE GitHub Pages-adressen. En avsluttende skråstrek er greit.
- Feltet **Privat iPhone-enhetskode (SMED_DEVICE_TOKEN)** er separat fra nettadressefeltet.
- **Start bro / gi lesetilgang** krever først aktiv Bluetooth-tilkobling til KONNWEI i appen.
- Dagens lokale logg (UTC):
  - 07:02:44: `v0.15 startet – fysisk ECU-tilkobling kreves`
  - 07:03:53: `[BRO] Error: Koble til KDIAG først`
  - 07:07:52: `[BRO] Error: Koble til KDIAG først`
- Disse to brofeilene er **forventet lokal sperre** når KDIAG ikke er tilkoblet, og er **ikke bevis for feil** i Render/ECU.
- Historisk: 2. november ble virkelig KONNWEI/ECU-kommunikasjon dokumentert i tidligere tråd. Rapporterte svar: `ATI` → `KDIAG v1.5`; `ATE0` og `ATSP6` → `OK`; `010C` → `41 0C 00 00`; `ATSH7E0` → `OK`; `2115` → `61 15 01 DE DA 00 6E`. Dette er **tidligere test**, ikke en ny ende-til-ende-test gjennom Render.
- Per kan godkjenne tilkobling ved å trykke **Koble til KONNWEI** i Bluefy; det gjenstår å teste broen aktivt mens bilen er tilkoblet.

## 4. Render-server — faktisk publisert

- Tjeneste: `smed-obd-i2kp`.
- **HTTPS:** https://smed-obd-i2kp.onrender.com
- Render service ID: `srv-dbomo1ijnfac73fd7ei0`.
- Workspace ID: `tea-dbomjm3m8hqs73ed6asg`.
- Node.js-prosess `node bridge/server.mjs`, intern port **10000**.
- Serveren er verifisert **Live** gjentatte ganger.
- Siste verifiserte deploy 9. november: `dep-dbonjm7f3r2c73boq2lg`, commit `6e880b2ad39d272f47ca70ba5bf4077200961993`, status **live**.
- `SMED_DEVICE_TOKEN` er for iPhone/Bluefy, `SMED_AGENT_TOKEN` for agent/MCP. Nøklene må være forskjellige og minst 24 tegn.
- **Sikkerhet:** enhetsnøkkelen ble synlig i skjermbilder 9. november. **Roter `SMED_DEVICE_TOKEN` i Render og oppdater Bluefy før ordinær live-diagnose.** Aldri legg inn nøkler i chat, repo, kommando-JSON eller dokumentasjon.

## 5. Eksisterende HTTP-bro

- iPhone-side: `POST /device/hello`, `GET /device/next`, `POST /device/result`.
- Agent-side: `POST /agent/command`, `GET /agent/result?id=...`.
- `GET /health` gir serverstatus og om iPhone-broen nylig har vært aktiv.
- Agentkommandoer krever aktiv iPhone-bro, blir køet én av gangen og utløper etter omtrent 60 sekunder.
- Kun allowlistede diagnostiske **lesekommandoer** er aktivert (for eksempel `ATI`, `010C`, `03`, `2115`, andre `21xx`-oppføringer og nødvendige ELM-initkommandoer).
- **Ingen fjernstyrt sletting av DTC, oljenivå-reset, DPF-regenerering eller skrivefunksjoner er ferdigstilt eller testet.**

## 6. MCP

- MCP-endepunkt implementert: **https://smed-obd-i2kp.onrender.com/mcp**.
- Serveren har OAuth/PKCE-kode og lesebaserte verktøy: `smed_bridge_status`, `smed_ecu_command`, `smed_command_result`.
- MCP-kode publisert på Render og serveren startet. **Ingen faktisk MCP-pålogging fra denne ChatGPT-kontoen er gjennomført.**
- Kontoens mulighet for å registrere privat MCP-plugin ble omtalt som begrenset på Plus; derfor valgte vi GitHub-pluginen som konkret alternativ.
- VIKTIG: at et MCP-endepunkt finnes, betyr ikke at ChatGPT automatisk kan sende kommandoer via det.

## 7. GitHub-kommandobro — dagens alternative løsning

**Bekreftet server- og GitHub-transport uten KDIAG:**

1. Egen gren: `smed-command-queue` (adskilt fra `main` for å unngå redeploy ved hver kommando).
2. Fil: `queue/command.json` i den grenen.
3. GitHub-pluginen kan oppdatere filen med `version`, unik `id`, allowlistet `command` og `expires_at`.
4. Render-serveren leser kommandofilen via GitHubs råfiladresse med polling.
5. Når KDIAG/Bluefy-broen er aktiv, oppretter Render en oppgave til iPhone.
6. iPhone returnerer svar via `/device/result`; serveren skriver `SMED_GITHUB_RESULT` til **Render-loggene** som ChatGPT kan lese gjennom tilkoblet Render-plugin.
7. Ingen ECU-svar eller hemmeligheter skal legges i offentlig GitHub.

**Faktiske tester:**
- Render: `SMED_GITHUB_QUEUE_CONFIGURED` = brokode startet.
- Render: `SMED_GITHUB_QUEUE_FETCHED` = kommandofilen ble hentet.
- Testfil med ID `github-transport-smoke-20261109` og en **utløpt** `ATI`-kommando ble oppdaget.
- Render: `SMED_GITHUB_SKIPPED` med `expired_or_invalid_expiration` = korrekt avvisning, **ingen ECU-kommando sendt**.
- En alternativ GitHub Contents-API-variant gav HTTP 404 fra Render og ble **reversert** til råfilvarianten som faktisk fungerte.
- **Siste publiserte og verifiserte kode** bruker råfilvarianten.
- GitHub råfil-cache kan gi forsinkelse; bruk kort gyldighet og ny unik kommando-ID. En live-test med KDIAG gjenstår.

## 8. Bilens konkrete P252F-spor

- Motor: Mitsubishi **4N14**, ECU software/CID `1860B61405`, HW `1860B614`.
- Feilkode **P252F** med varsel om oljenivå/vedlikehold.
- Tidligere observert `Engine Oil Level Calculated = 1550 cc`, fysisk olje ved MAX.
- Mitsubishi-dokumentasjon: **MUT-III Data List Item 198/199/200**, servicebulletin **MSB-14EXL13-001**; tidligere funnet terskel 2000 cc.
- Vanlig **Oil Lamp Reset** og feilkodesletting er tidligere prøvd; nullstilling av selve beregnede oljefortynnings-/oljenivåverdien er **ikke bekreftet**.
- Tidligere `ATSH7E0` og `2115`-testing er relevant når vi skal hente reelle ECU-data.
- Ønsket rekkefølge: les P252F + relevant ECU-data → identifiser korrekt nullstilling → utfør kontrollert reset når korrekt prosedyre er verifisert → slett feilkode → les tilbake og kontroller.
- **Ikke send uverifiserte ECU-skrivekommandoer.** De er ikke implementert i nåværende fjernbro.

## 9. Praktisk neste handling

1. **Roter eksponert `SMED_DEVICE_TOKEN`** i Render og lim ny verdi inn i riktig felt i Bluefy uten å dele nøkkelen i chat.
2. Når Per er ved bilen: sett inn KDIAG, slå på tenningen, åpne Bluefy, trykk **Koble til KONNWEI**, initialiser CAN og trykk **Start bro / gi lesetilgang**.
3. Sjekk lokal brostatus og Render `/health`/logger. Bekreft **reell iPhone → Render**.
4. Send via GitHub-grenen en fersk, allowlistet lesekommando, for eksempel `ATI` / `2115`, med kort utløp.
5. Hent `SMED_GITHUB_QUEUED` og `SMED_GITHUB_RESULT` fra Render, kontroller at svaret faktisk er fra ECU.
6. Fortsett direkte på **P252F**. Bygg eventuell skrive-/resetfunksjonalitet separat, basert på verifisert MUT-III-prosedyre.

### Fast prosjektskille

- **Bekreftet:** GitHub skriveadgang; GitHub→Render-kode; server LIVE; kommandofil hentet og endring oppdaget; utløpt test korrekt avvist; tidligere ECU-kontakt i Bluefy.
- **Ikke ende-til-ende bekreftet:** fersk kommando via GitHub → Render → Bluefy → KDIAG → ECU og svar tilbake, siden bilen ikke var koblet til under dagens GitHub-test.
- **Ikke implementert:** fjernstyrt ECU-feilkodesletting, reset av ECU-beregnet oljenivå og tilsvarende skrivefunksjoner.

Denne statusfilen inneholder **ingen hemmelige tokens**.
