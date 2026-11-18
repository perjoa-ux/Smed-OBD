# SMED-01 · Smed Nettvakt – prosjektstatus 2026-11-18

Mål: Lokal, gratis og privat overvåking av SMED-01 og hjemmenettverket via MacBook Pro 2012 og eksisterende Smed OBD/Render-server.

## Status

- [FERDIG] macOS Catalina og energisparing konfigurert på SMED-01.
- [FERDIG] Python 3.11.9 og SSL-sertifikater installert.
- [FERDIG] Lokal agent installert som launchd LaunchAgent, starter ved innlogging av smed.
- [FERDIG] Agentens utgående HTTPS-forbindelse mot Render; Terminal viste report_sent, 5 observerte enheter.
- [FERDIG] Agentens automatiske rapportering bekreftet med /nettvakt/health => agent_online true i Firefox.
- [FERDIG] Sanitiserte ARP-, gateway-, DNS-, HTTPS- og Mac-helsedata; valgfri Home Assistant SmartLife-kilde.
- [FERDIG] Privat Smed Nettvakt-plugin v0.2 med MCP-konfigurasjon; direkte ChatGPT-lesing er ennå ikke bekreftet.
- [FERDIG] Responsivt, separat nettleser-kontrollpanel for iPhone og Firefox:
  - bridge/nettvakt-dashboard.mjs (sikker server-side innlogging, signert HttpOnly Secure SameSite-cookie, API)
  - bridge/nettvakt-dashboard.html (layout)
  - bridge/nettvakt-dashboard.js (lesevisning, 30 sekunders oppdatering)
  - bridge/nettvakt-dashboard.test.mjs (autentiserings- og regresjonstester)
  - .github/workflows/nettvakt-tests.yml (Node.js syntaks og testkjøring)
- [FERDIG] Dashboard integrert i bridge/server.mjs uten å endre eksisterende OBD-kommandoer.
- [FERDIG] Dashboard-koden publisert til Render gjennom deploy dep-dbujsi8m7kps73ckl6vg, status live.
- [GJENSTÅR] Bekrefte første innlogging og visning av ekte data i brukerens nettleser.
- [GJENSTÅR] Verifisere GitHub Actions-resultatet for dashboard-testene; testene er lagt inn, resultat ikke avlest.
- [GJENSTÅR] Eventuell separat sikker rotasjon av SMED_AGENT_TOKEN som tidligere ble eksponert i chat.
- [GJENSTÅR] SmartLife via Home Assistant/Tuya og eventuell kompatibel Mac-temperatursensor.

## Kontrollpanel

URL: https://smed-obd-i2kp.onrender.com/nettvakt/dashboard

Innlogging skjer med eksisterende SMED_AGENT_TOKEN fra Render. Nøkkelen skal bare tastes inn i skjemaet over HTTPS, ikke sendes i samtalen. Sesjonen varer 24 timer og kan avsluttes med Logg ut. Ingen nye programmer på MacBooken kreves.

## Sikkerhet og begrensninger

- MacBook-batteriet viste 1 %, lades ikke og må inspiseres for mulig hevelse/overoppheting før uovervåket drift.
- MacBook må være på, koblet til strøm og nettverk, brukeren smed innlogget og maskinen ikke i dvale. Firefox/ChatGPT kan lukkes.
- Catalina skal ikke eksponeres direkte mot internett; kun utgående HTTPS.
- ARP er ikke komplett enhetsoversikt, og manglende ARP-oppføring betyr ikke offline.
- Datasett i Render lagres i minnet og kan nullstilles ved restart; agenten sender normalt ny rapport innen omtrent ett minutt.
- Render gratisnivå kan spinne ned ved inaktivitet. Ingen garanti for uavbrutt varslingsdrift.
- Nettvakt har ikke direkte styring av Google Nest, SmartLife eller kameraopptak. Kontrollpanelet er skrivebeskyttet.
