# Smed-OBD – Bluefy (gratis)
 
**App:** https://smed-obd-i2kp.onrender.com

Mål: ekte diagnostikk for Mitsubishi Outlander 2011 CW1W 2.2 DI-D 4N14 med KONNWEI KDIAG, Bluetooth fra iPhone i Bluefy, og godkjente lesekommandoer via Render-bro. Vibecode kreves ikke.

## Versjon v0.27

- `index.html`: Bluefy-app. Web Bluetooth mot KONNWEI (FFF0 / FFF1 / FFF2), ELM-CAN init, totalskann hver ny manuell BLE-tilkobling, 123 lesekommandoer og lokal logg.
- `ECU-KOMMANDOKATALOG.md`: 4N14-katalog, datadefinisjoner og kildehenvisninger.
- `bridge/server.mjs`: HTTPS/Render-bro med separat enhetstoken og agenttoken, lesekø, skanneventlogg og begrensede tilganger.
- `4n14-egr-dpf.html`: Illustrert referanse for service-/DPF-relaterte komponenter.
- `README.md`: Denne prosjektstatusen.

## v0.27 – automatisk tilkoblingsstatus til Smed

- Bluefy sender signerte statusforespørsler over HTTPS med **SMED_DEVICE_TOKEN** når KONNWEI kobles til/fra, totalskann/P252F-hurtigkontroll starter, leseprogresjon oppdateres og skann fullføres.
- Render lagrer de siste 25 hendelsene i minnet; agent-kontakten kan lese dem gjennom **GET /agent/device-status** med agent-token. Hendelsene logges også som **SMED_DEVICE_EVENT**.
- Appen viser om statusmelding ble levert.
- **Viktig begrensning:** Bluefy kan sende status til Render automatisk, men nettsiden kan ikke starte en ChatGPT-samtale eller varsle assistenten direkte i sanntid. Jeg kan kontrollere disse registreringene via Render-verktøy når samtalen er aktiv. Ingen urealistiske løfter om push-varsel.

## v0.27 – ny P252F-hurtigdiagnose

- Knappen **Les P252F / oljedata nå** henter åtte kjente lesekommandoer: `2117`, `2118`, `2110`, `2111`, `2112`, `03`, `07`, `0A`.
- Oljeindikator (#198) vises fra rått 2117-svar med dokumentert referanseformel.
- Lagrer separat P252F-rapport på iPhone, med lokal TXT-eksport.
- Sender også skanneblokker til eksisterende autentisert Render-bro hvis device-token er konfigurert.
- Pauser fjernbroen under lokal diagnose og starter den på nytt etterpå. Krever aktiv Bluefy for BLE.
- **Ingen tilbakestilling / ECU-skriving** utføres. P252F-rutinen er fortsatt ikke verifisert.

## v0.27 – ny funksjonalitet

Appen lagrer siste totalskann lokalt og tilbyr:
- **Last ned siste totalskann (JSON)** med alle råsvar.
- **Last ned diagnoseoppsummering (TXT)** med olje (2117), DPF (2110/2111/2112), generelle DTC-koder, NO DATA og tidsavbrudd.
- **Tidligere skanninger** med tidspunkt, fullføringsgrad og antall opplastinger.

Dataene overføres fortsatt til Render under totalskann. Rådata lagres på telefonen. Gjeldende spesialreset for P252F er ikke bekreftet eller aktivert.

## Hovedbegrensning i Bluefy / iOS

En nettside i Bluefy kan bli suspendert når en annen iOS-app blir aktiv. JavaScript har ikke rett til å kreve kontinuerlig Bluetooth- og HTTPS-aktivitet i bakgrunnen. Appen forsøker å beholde eller gjenoppta BLE-tilkoblingen når Bluefy kommer i forgrunnen, men dette er **ikke garantert**. For langvarig live-diagnose må Bluefy normalt forbli åpen og aktiv. Dette er ikke en betalingsmur og kan ikke låses opp med en omvei i HTML.

## Teststatus

- Verifisert tidligere på fysisk bil med v0.22: automatisk 123/123 gjennomgått og overført til Render (10. november 2026). «123/123» betyr gjennomgåtte kommandoer, ikke 123 støttede målepunkter.
- v0.27: JavaScript parsingskontroll **bestått**; rapportens regulæruttrykk og linjeskift korrigert. Syntetisk test: rått `2117`-svar `61 17 FF 64 64 00 00` dekodes til 1550 cc. Fysisk test gjenstår. Nye eksportknapper og rapportlogikk er **ikke testet fysisk på Bluefy ennå**.
- Produsentspesifikk Mitsubishi Engine Oil Exchange Service/P252F reset er fortsatt **ikke bekreftet**. Standard OBD Mode 04 (sletting) krever dobbel lokal godkjenning og er ikke lik oljeinitialisering.

## Videre utvikling

Neste prioritet: verifisere rapporteksport og brostatus på fysisk iPhone; deretter undersøke eksakt og sikker MUT-III oljeinitialisering på ECU HW 1860B614 / SW 1860B61405. Ingen ukjente skriverutiner sendes automatisk.
