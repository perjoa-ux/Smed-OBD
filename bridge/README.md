# SMED-OBD serverbro v0.1

Denne serveren kobler **eksisterende** Smed-OBD v0.15 i Bluefy via HTTPS til en ekstern agent.
Ingen KDIAG-kommandoer sendes av serveren direkte. iPhone leser oppgaver og sender
Bluetooth-kommandoer lokalt, mens serveren kun videresender forhåndsgodkjente lesekommandoer.

## Drift

Bruk Node.js 20+ og en HTTPS-tjeneste som kan kjøre en vedvarende Node-prosess.
Eksempel: Render Web Service med root directory `bridge`, build command `npm install`,
start command `npm start`. En gratis instans som sovner når den er inaktiv kan
forstyrre polling; velg en tjeneste med pålitelig oppetid.

Sett serverhemmeligheter **kun hos hostingleverandøren** (ikke i GitHub):
- `SMED_DEVICE_TOKEN`: tilfeldig hemmelighet, minst 24 tegn, som tastes i Bluefy
- `SMED_AGENT_TOKEN`: annen tilfeldig hemmelighet, minst 24 tegn, kun agent/MCP
- `SMED_ALLOWED_ORIGIN`: adressen som Smed-OBD åpnes fra, f.eks. `https://perjoa-ux.github.io`
  (kan angis som kommaseparert liste av eksakte origins). Standard `*` gir
  bredere browser-tilgang, men er fortsatt beskyttet av Bearer-token.
- `PORT`: normalt satt automatisk av hosting.

**Viktig:** De to tokenene må være forskjellige. Ikke legg dem i HTML, loggfiler
eller kildekode. Appen trenger bare enhets-token; aldri agent-token.

## Bruk i Bluefy

1. Åpne Smed-OBD over HTTPS, koble til KONNWEI, og initialiser CAN.
2. Lim inn broserverens HTTPS-adresse i feltet **Broserver**.
3. Legg inn `SMED_DEVICE_TOKEN` i feltet for privat iPhone-enhetskode.
4. Trykk **Start bro / gi lesetilgang**. Hold Bluefy-appen i forgrunnen.

## API for agent/MCP

Alle `/agent/*` krever `Authorization: Bearer <SMED_AGENT_TOKEN>`.
- `POST /agent/command` med JSON `{"command":"010C"}` ⇒ `{"id":"…","state":"queued"}`
- `GET /agent/result?id=<id>` ⇒ status og ECU-svar når utført.
- `GET /health` ⇒ brostatus (uten hemmeligheter).

iPhone bruker `POST /device/hello`, `GET /device/next`,
`POST /device/result` med eget Bearer-token.

### Sikkerhetsgrenser

- Bare faste lesekommandoer og 21XX-profilblokkene er tillatt.
- Ingen eksterne reset-, DPF-, injektor- eller minneskrivefunksjoner.
- Kommandoer køes én om gangen, med 60 sekunders tidsgrense.
- Oppgaver og svar ligger i minnet og går tapt ved serverrestart.
- Fungerer ikke uten en aktiv, tilkoblet iPhone.
- Dette er en HTTP-bro, **ikke enda en registrert ChatGPT MCP-plugin**.
  For ChatGPT-verktøytilgang må et MCP-endepunkt kobles til dette API-et.

## Lokal sjekk

`cd bridge && node --check server.mjs`
