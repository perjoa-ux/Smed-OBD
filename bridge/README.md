# SMED-OBD serverbro + MCP v0.16

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
  MCP er nå implementert på /mcp, men må registreres og godkjennes i en MCP-klient.

## Lokal sjekk

`cd bridge && node --check server.mjs`

## MCP (OAuth 2.1, Streamable HTTP)

Endepunkt: `https://smed-obd-i2kp.onrender.com/mcp`.

Verktøy: `smed_bridge_status`, `smed_ecu_command`, `smed_command_result`.
Kun lesekommandoer er tillatt; ingen P252F-sletting eller reset er aktivert via MCP.

Autentisering: OAuth med PKCE (S256), offentlig klientregistrering og refresh-token.
ChatGPT-klienten videresendes til serverens autorisasjonsside. **Kun der** fyller
eieren inn Render-miljøvariabelen `SMED_AGENT_TOKEN` for å godkjenne lesetilgang.
Denne nøkkelen skal aldri legges i Bluefy, ChatGPT-meldinger eller GitHub.

OAuth-servermetadata: `/.well-known/oauth-authorization-server`
Ressursmetadata: `/.well-known/oauth-protected-resource/mcp`
Registrering: `/oauth/register`
Tokenutstedelse: `/oauth/token`

Serverens tilgangstokener er signert, og koblingen tåler derfor serveromstart.
En pågående ECU-oppgave går likevel tapt ved serverrestart.
Nøkkelbytte i Render ugyldiggjør samtidig tidligere MCP-tokener.

### ChatGPT-registrering
I kontoer som støtter egne MCP-servere: Plugins → Add custom MCP server →
HTTPS-adressen over → OAuth → godkjenn på serverens innloggingsside.
Det er ikke nok å publisere URL-en: kontoen må også ha rettighet til å
opprette en egen MCP-tilkobling. Sjekk dette i ChatGPT-grensesnittet.

**Eksponert enhetsnøkkel:** Ved publisering ble `SMED_DEVICE_TOKEN` synlig i
skjermbilder. Roter den på Render og oppdater feltet i Bluefy før ordinær bruk.

## GitHub-bro for ChatGPT Plus (uten egen MCP-installasjon)

GitHub-pluginen kan skrive diagnosekommandoer til en **egen gren**:
`smed-command-queue`, fil `queue/command.json`. Grenen er adskilt fra
`main` slik at kommandoendringer ikke deployer Render på nytt.

Eksempel på **kun** en lesekommando, med en ny unik `id` og en
`expires_at` innen 15 minutter (UTC ISO8601):

```json
{
  "version": 1,
  "id": "test-010c-001",
  "command": "010C",
  "expires_at": "2026-11-09T09:00:00Z"
}
```

Serveren spør GitHub hvert 10. sekund. Når Bluefy har aktiv bro, godtar
serveren kun kommandoer fra sin eksisterende **lese-allowlist**, én om gangen.
Serveren skriver `SMED_GITHUB_QUEUED` og
`SMED_GITHUB_RESULT` til **private Render-logger**. ChatGPT kan lese
disse via den allerede tilkoblede Render-pluginen, uten en registrert
egen MCP-plugin. **Ingen ECU-svar legges i det offentlige GitHub-repositoriet.**

Et nytt oppdrag skal alltid ha ny ID. Det må ha kort gyldighet og må aldri
inneholde hemmeligheter. Når det er avsluttet, kan oppdraget erstattes
med `{"version":1,"id":"idle","command":"","expires_at":"2000-01-01T00:00:00Z"}`.

Dette er en testet kodebane for asynkron **lesediagnostikk**; end-to-end
kommunikasjon med ECU må bekreftes mens KDIAG er tilkoblet i Bluefy.
Sletting av P252F og nullstilling av oljeberegning er fortsatt ikke aktivert
via fjernbroen.
