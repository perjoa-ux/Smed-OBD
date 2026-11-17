# Smed Nettvakt – status (17.11.2026)

## Mål
Drifte ett samlet, sikkerhetsbegrenset overblikk over Googles Nest WiFi, lokalnettet og valgte SmartLife/Tuya-enheter med ChatGPT som grensesnitt. Ingen abonnementer eller nye maskinkjøp.

## Teknologi
- Eksisterende Render/Node-bro og eksisterende MCP-OAuth (ingen ekstra tjeneste eller kostnad)
- Lokal macOS-agent i Python 3 uten eksterne Python-avhengigheter
- TLS/HTTPS og egen avledet agentnøkkel (HMAC-SHA256 fra SMED_AGENT_TOKEN)
- Valgfri Home Assistant Tuya-integrasjon for SmartLife-tilstander

## Filstatus
- [FERDIG] bridge/nettvakt.mjs – sensor-API, tilgangskontroll, status, MCP-verktøy, ufarlige prober
- [FERDIG] bridge/server.mjs – isolert registrering av nye ruter og MCP-verktøy; OBD-logikk uendret
- [FERDIG] nettvakt/agent/nettvakt_agent.py – ARP-inventar, ping, DNS/HTTPS, valgt Home Assistant-data
- [FERDIG] nettvakt/agent/install-macos.sh – launchd-autostart og sikker nøkkellagring
- [FERDIG] nettvakt/agent/uninstall-macos.sh – stopp agent
- [FERDIG] nettvakt/INSTALL.md – installasjon og begrensninger
- [FERDIG] Privat ChatGPT-plugin Smed Nettvakt v0.1.0 (opprettet separat)
- [TESTET] Node-modul: 3 tester bestått, V8 syntaks for integrert server bestått
- [GJENSTÅR] MacBook-installasjon på samme Nest-nettverk
- [GJENSTÅR] Første ekte sensorrapport og validering av faktiske enheter
- [GJENSTÅR] Koble Home Assistant/Tuya slik at SmartLife-tilstander kan leses
- [GJENSTÅR] Verifisere ChatGPT-pluginens OAuth-oppsett etter installasjon

## Viktig avgrensning
Dette gir ikke direkte administrasjon av Google Nest (WiFi-kanal, SSID, meshstyring, klientblokkering). Dette krever fortsatt Google Home og eventuelle offisielle API-er som måtte bli tilgjengelige. Ingen automatiske skriveroperasjoner mot rutere eller SmartLife-enheter.
