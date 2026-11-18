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
- [FERDIG] Dashboard-koden publisert til Render gjennom deploy dep-dbukdvojo6nc73ac6md0, status live. Responsivt kontrollpanel med navngiving per nettleser og midlertidig logg over nettverksfeil/gjenoppretting.
- [FERDIG] Første innlogging og visning på iPhone bekreftet av brukerskjermbilde 18.11.2026 (SMED-01 online, 4 ARP-enheter, DNS/internett OK).
- [GJENSTÅR] Verifisere GitHub Actions-resultatet for dashboard-testene; testene er lagt inn, resultat ikke avlest.
- [GJENSTÅR] Eventuell separat sikker rotasjon av SMED_AGENT_TOKEN som tidligere ble eksponert i chat.
- [FERDIG] Egen ChatGPT-automatisering «SMED-01 nettvaktalarm» kontrollere offentlig /nettvakt/health hver time og varsle ved vedvarende agentbortfall.
- [UNDER ARBEID] Catalina-RAM: Dashboard viser kjent installert RAM når ledig minne er ukjent. For mer presis andel er vm_stat-reserveberegning lagt i nettvakt/agent/smed_health.py; den lokale filen på MacBooken er ikke oppdatert ennå.
- [UNDER ARBEID] Fullere enhetsoversikt: bridge/nettvakt.mjs husker enheter i opptil sju dager, med første/siste observasjon og nye enhet-hendelser. Privat dashboard har egen oversikt over historikk. Koden er lagt i GitHub men ny Render-utrulling er ennå ikke bekreftet.
- [UNDER ARBEID] Lokal agent har skånsom ICMP/ARP-sveip av opptil 20 adresser per rapport innenfor sitt private /24 (4 parallelle pinger). Agent-koden er lagt i GitHub, men ikke installert på SMED-01. Ingen portskanning. Ingen falske offlinekonklusjoner ved manglende svar.
- [FERDIG] Testkode/CI for Python lokalnettoppdagelse er lagt til i GitHub, men testkjøring er ennå ikke verifisert.
- [GJENSTÅR] Google Home Wi-Fi → Enheter må sammenlignes manuelt for ruterdrevne klientlister; direktegrensesnitt fra Nest er ikke tilgjengelig.
- [GJENSTÅR] Direkte ChatGPT-verktøytilgang til private enhetsdata er ikke verifisert; kontrollpanelet er tilgjengelig med innlogging.
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
- Render gratisnivå kan spinne ned ved inaktivitet. Ingen garanti for uavbrutt varslingsdrift. ChatGPT-automatisering er en timelig kontroll av agentens tilkobling, ikke kontinuerlig varsling om alle netthendelser.
- Nettvakt har ikke direkte styring av Google Nest, SmartLife eller kameraopptak. Kontrollpanelet er skrivebeskyttet.
