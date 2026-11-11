# Smed-OBD – Bluefy (gratis)
 
**App:** https://smed-obd-i2kp.onrender.com

Mål: ekte diagnostikk for Mitsubishi Outlander 2011 CW1W 2.2 DI-D 4N14 med KONNWEI KDIAG, Bluetooth fra iPhone i Bluefy, og godkjente lesekommandoer via Render-bro. Vibecode kreves ikke.

## Versjon v0.29

- `index.html`: Bluefy-app. Web Bluetooth mot KONNWEI (FFF0 / FFF1 / FFF2), ELM-CAN init, totalskann hver ny manuell BLE-tilkobling, 123 lesekommandoer og lokal logg.
- `ECU-KOMMANDOKATALOG.md`: 4N14-katalog, datadefinisjoner og kildehenvisninger.
- `bridge/server.mjs`: HTTPS/Render-bro med separat enhetstoken og agenttoken, lesekø, skanneventlogg og begrensede tilganger.
- `4n14-egr-dpf.html`: Illustrert referanse for service-/DPF-relaterte komponenter.
- `README.md`: Denne prosjektstatusen.

## v0.29 – Mitsubishi MUT-III No.43 oljeinitialisering

- **Ny funksjon:** Engangsprosedyre **Utfør MUT-III No.43 oljeinitialisering** (Mitsubishi 4N1 Special Function → Initialization → No.43 Engine oil exchange service).
- Brukeren bekrefter at olje og filter er skiftet og faktisk nivå er kontrollert. ECU-kontroller `010C` (0 rpm), `010D` (0 km/t) og `2117` (oljeindikator) utføres før skriving.
- Appen starter Mitsubishi utvidet diagnoseøkt med `1092`, krever positiv `5092`, sender `30540700` **nøyaktig én gang**, og krever positiv `7054` før den kontrollerer `2117` på nytt.
- En lokal engangslås lagres **før** skriveforsøket. Feiler lagring, sendes ingen skrivekommando. Automatisk gjentakelse ved reconnect er sperret.
- Fjernkommandobroen pauses under oljeinitialisering og startes ved fullføring. Ingen automatisk DPF-regenerering eller DTC-sletting inngår.
- Kilder: Mitsubishi fabrikkmanual (No.43) https://mmc-manuals.ru/manuals/outlander_iii/online/Service_Manual_2013/2014/00/html/M100101780011100ENG.HTM og åpen kildekode/MPS-Android https://github.com/edgarsenrarocha/MPS-Android .
- Programmering og JavaScript-syntaks er kontrollert. **Ingen fysisk ECU-verifikasjon er utført i v0.29.** Positivt svar alene er ikke dokumentasjon på at P252F er slettet.

## v0.29 – rask tilkobling uten ny totalskann

- Ved Bluetooth-tilkobling initialiseres CAN og Render-broen starter direkte dersom enhetstokenet er registrert. Tidligere 123/123-avlesning beholdes; ingen ny totalskann kjøres automatisk.
- Ny knapp **Kjør full totalskann (123)** gir eksplisitt oppstart ved behov. Appen pauser aktiv Render-kommandobro under skanningen og forsøker å starte den igjen etter fullføring.
- **P252F – rask kontroll** er fortsatt tilgjengelig som separat, målrettet leseoperasjon.
- Endringen er kontrollert med JavaScript-parsing og statisk kontroll av oppstartsflyt. Fysisk KDIAG-test gjenstår.

## v0.29 – automatisk tilkoblingsstatus til Smed

- Bluefy sender signerte statusforespørsler over HTTPS med **SMED_DEVICE_TOKEN** når KONNWEI kobles til/fra, totalskann/P252F-hurtigkontroll starter, leseprogresjon oppdateres og skann fullføres.
- Render lagrer de siste 25 hendelsene i minnet; agent-kontakten kan lese dem gjennom **GET /agent/device-status** med agent-token. Hendelsene logges også som **SMED_DEVICE_EVENT**.
- Appen viser om statusmelding ble levert.
- **Viktig begrensning:** Bluefy kan sende status til Render automatisk, men nettsiden kan ikke starte en ChatGPT-samtale eller varsle assistenten direkte i sanntid. Jeg kan kontrollere disse registreringene via Render-verktøy når samtalen er aktiv. Ingen urealistiske løfter om push-varsel.

## v0.29 – ny P252F-hurtigdiagnose

- Knappen **Les P252F / oljedata nå** henter åtte kjente lesekommandoer: `2117`, `2118`, `2110`, `2111`, `2112`, `03`, `07`, `0A`.
- Oljeindikator (#198) vises fra rått 2117-svar med dokumentert referanseformel.
- Lagrer separat P252F-rapport på iPhone, med lokal TXT-eksport.
- Sender også skanneblokker til eksisterende autentisert Render-bro hvis device-token er konfigurert.
- Pauser fjernbroen under lokal diagnose og starter den på nytt etterpå. Krever aktiv Bluefy for BLE.
- **Ingen tilbakestilling / ECU-skriving** utføres. P252F-rutinen er fortsatt ikke verifisert.

## v0.29 – ny funksjonalitet

Appen lagrer siste totalskann lokalt og tilbyr:
- **Last ned siste totalskann (JSON)** med alle råsvar.
- **Last ned diagnoseoppsummering (TXT)** med olje (2117), DPF (2110/2111/2112), generelle DTC-koder, NO DATA og tidsavbrudd.
- **Tidligere skanninger** med tidspunkt, fullføringsgrad og antall opplastinger.

Dataene overføres fortsatt til Render under totalskann. Rådata lagres på telefonen. Gjeldende spesialreset for P252F er ikke bekreftet eller aktivert.

## Hovedbegrensning i Bluefy / iOS

En nettside i Bluefy kan bli suspendert når en annen iOS-app blir aktiv. JavaScript har ikke rett til å kreve kontinuerlig Bluetooth- og HTTPS-aktivitet i bakgrunnen. Appen forsøker å beholde eller gjenoppta BLE-tilkoblingen når Bluefy kommer i forgrunnen, men dette er **ikke garantert**. For langvarig live-diagnose må Bluefy normalt forbli åpen og aktiv. Dette er ikke en betalingsmur og kan ikke låses opp med en omvei i HTML.

## Teststatus

- Verifisert tidligere på fysisk bil med v0.22: automatisk 123/123 gjennomgått og overført til Render (10. november 2026). «123/123» betyr gjennomgåtte kommandoer, ikke 123 støttede målepunkter.
- v0.29: JavaScript parsingskontroll **bestått**; rapportens regulæruttrykk og linjeskift korrigert. Syntetisk test: rått `2117`-svar `61 17 FF 64 64 00 00` dekodes til 1550 cc. Fysisk test gjenstår. Nye eksportknapper og rapportlogikk er **ikke testet fysisk på Bluefy ennå**.
- Produsentspesifikk Mitsubishi Engine Oil Exchange Service/P252F reset er fortsatt **ikke bekreftet**. Standard OBD Mode 04 (sletting) krever dobbel lokal godkjenning og er ikke lik oljeinitialisering.

## Videre utvikling

Neste prioritet: verifisere rapporteksport og brostatus på fysisk iPhone; deretter undersøke eksakt og sikker MUT-III oljeinitialisering på ECU HW 1860B614 / SW 1860B61405. Ingen ukjente skriverutiner sendes automatisk.
