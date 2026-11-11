# Smed – gjenbrukbar byggeoppskrift for apper

Opprettet 11. november 2026. Eier: Per. Referanseprosjekt: Smed OBD v0.29.
Formål: utvikle flere komplette, mobilvennlige apper med minst mulig manuelt arbeid og 0 kr i nye verktøy- og driftskostnader.

## Referanse og bekreftet milepæl

Per bekreftet 11. november 2026 at Smed OBD er komplett, fungerer i bruk og at P252F er slettet og borte. Dette er brukerens bekreftelse; ingen ny ECU-kontroll ble utført under arkivering eller dokumentering. Det dokumenterer ikke automatisk alle øvrige diagnosefunksjoner eller varig fravær av feilkoden.

Arkivgren: [Smed OBD v0.29](https://github.com/perjoa-ux/Smed-OBD/tree/archive/smed-obd-v0.29-2026-11-11).
Eksakt kildeversjon: ac9faec9bb2281e6d85abe172125a839cc4445f6.
Appadresse oppgitt i prosjektet: https://smed-obd-i2kp.onrender.com
Arkivet inneholder kildekode og dokumentasjon. Enhetens lokale logger, serverens miljøhemmeligheter og flyktige serverdata er ikke del av Git-arkivet.

Eldre README-avsnitt har forskjellige historiske teststatuser. Bruk datert dokumentasjon og konkrete resultater ved videreføring; ikke kopier gamle «gjenstår»-punkter ukritisk.

## Arbeidsfordeling

Per beskriver problemet og ønsket praktisk resultat. Assistenten velger og implementerer teknologien, vedlikeholder prosjektstatus, retter feil og gjennomfører publisering innenfor tilgjengelige rettigheter.
Still høyst tre korte funksjonsspørsmål ved oppstart, bare når svarene er nødvendige. Ikke be Per velge rammeverk.
Manuelle steg begrenses til kontoautentisering, nødvendige enhetstillatelser og fysisk handling som verktøyene ikke kan utføre.
Ikke lov tilgang til enhet, bakgrunnskjøring, Canvas eller publisering som ikke faktisk er tilgjengelig.

## Fra idé til ferdig app

1. Beskriv bruker, problem, hovedhandling og et observerbart mål for når appen er ferdig.
2. Undersøk tilgjengelige integrasjoner og begrensninger tidlig. Bekreft tilgang med en ufarlig leseoperasjon.
3. Opprett Git-prosjekt, filstruktur og PROSJEKTSTATUS.md før større implementering.
4. Bygg én sammenhengende flyt fra knapp til ekte resultat og feilvisning. Bruk enkle moduler og få avhengigheter.
5. Legg til resten av funksjonene, mobiltilpasning, tilgjengelighet og nødvendig lagring.
6. Kontroller kritiske flyter, feiltilstander og koblingene mellom klient, server og datalagring.
7. Publiser og kontroller den publiserte versjonen. Merk tydelig hva som bare er kontrollert lokalt.
8. Dokumenter praktisk brukerbekreftelse, eksakt commit og gjenoppretting. Bevar en navngitt ferdigversjon.
9. Gjenbruk de generelle komponentene i et nytt prosjekt. Hold produktspesifikk kode utenfor den generelle malen.

## Valg av teknologi

| Behov | Standardvalg | Når løsningen utvides |
| --- | --- | --- |
| Enkel mobilvennlig app | HTML, CSS og JavaScript over HTTPS | Bruk rammeverk når kompleksitet gir en konkret gevinst |
| Små data på én enhet | Lokal lagring med eksport/import | Database ved synkronisering eller flere brukere |
| Hemmeligheter eller eksterne API-er | Liten server med miljøvariabler | Kun når klienten ikke kan løse behovet forsvarlig |
| Agenttilgang | Eksisterende autorisert integrasjon | Egen bro/MCP når det er nødvendig og støttet |
| Enhetsfunksjoner | Bekreftet nettleser-API | Enhetsapp hvis nettleseren ikke støtter funksjonen |
| Kilde og versjoner | GitHub | Separate dokumentasjons-, utviklings- og arkivgrener ved behov |

Bluefy, Bluetooth, Mitsubishi-kommandoer og diagnosebroen er valg for Smed OBD, ikke standardkrav for nye apper.
Kontroller leverandørens gjeldende prisvilkår, kortkrav, kvoter, hvilemodus og eksportmuligheter før en tjeneste velges. Et gratisnivå er ikke en garanti om uendrede vilkår.
Ikke opprett betalte ressurser, aktiver betalt overforbruk eller legg inn betalingskort. Velg en enklere løsning innenfor nullbudsjettet dersom kravene kan oppfylles slik; opplys konkret dersom de ikke kan det.

## Mappe- og filstruktur for neste app

| Fil eller mappe | Innhold |
| --- | --- |
| README.md | Formål, oppstart og bruk |
| PROSJEKTSTATUS.md | Mål, teknologi, filstatus, verifikasjon og neste steg |
| index.html | Appens inngang |
| src/app.js | Oppstart og kobling av brukerhandlinger |
| src/ui.js | Visning og tilgjengelige tilbakemeldinger |
| src/storage.js | Lagring, dataversjon, eksport og import |
| src/api.js | Nettverk, tidsgrenser og håndtering av feil |
| styles/app.css | Mobilvennlig layout, fokus og lesbarhet |
| assets/ | Ikoner og andre nødvendige ressurser |
| server/ | Opprettes bare hvis appen trenger en server |
| tests/ | Målrettede kontroller av viktig logikk og flyter |
| docs/DRIFT.md | Publisering, konfigurasjonsnavn, backup og gjenoppretting |

Tabellen er plan for fremtidige prosjekter, ikke en påstand om at disse filene allerede er opprettet.
Små apper kan ha færre filer. Store apper deles i fullstendige moduler; ingen uferdige plassholdere i leveransen.

## Prosjektstatus som skal vedlikeholdes

Hvert prosjekt skal angi:
- Mål og konkrete ferdigkriterier.
- Valgt teknologi og hvorfor den løser behovet.
- Budsjett og kontrollerte tjenestevilkår med dato.
- Filoversikt med [FERDIG], [UNDER ARBEID] eller [GJENSTÅR].
- Gjeldende commit, publisert versjon og appadresse.
- Hva som er implementert, kontrollert lokalt, kontrollert etter publisering og bekreftet i praktisk bruk.
- Kjente begrensninger og ett konkret neste steg.

«FERDIG» skal bety ferdig for avtalte krav, ikke at alle tenkelige funksjoner er bygget.

## Kvalitet som bygges inn

- Store nok trykkflater, lesbar tekst, tydelige feltnavn og synlig tastaturfokus.
- Synlig lastestatus, tomtilstand, frakobling og forståelig feil med en konkret vei videre.
- Validering av inn- og utdata, tidsgrenser og kontrollert kø for handlinger som må skje i rekkefølge.
- Unike operasjons-ID-er og vern mot dobbeltkjøring ved kritiske endringer.
- Ingen hemmeligheter i klientkode, Git, offentlige logger eller eksportfiler.
- Minst nødvendige tilganger; autentisering og tillatte operasjoner på serveren.
- Logger med tidspunkt, appversjon og resultat uten unødvendige personopplysninger.
- Eksport og gjenoppretting for brukerdata som ikke må gå tapt.
- Målrettede tester for databehandling og kritiske handlinger; praktisk kontroll på brukerens relevante enhet.

## Det vi tar med fra Smed OBD

Prosjektets dokumenterte løsning kombinerer mobil webklient, lokal enhetstilgang, liten Node-server og versjonert kildekode. En separat kommandogren unngår at driftsoppgaver utløser vanlig apppublisering. Enhets- og agenttilgang har separate rettigheter. Lokal rapporteksport gir innsyn når fjernforbindelsen mangler.

Generelle lærdommer:
- Avklar plattformgrenser før store løfter om integrasjoner.
- Vis faktiske forbindelses- og resultatstatuser.
- Hold ulike bevis adskilt: kode skrevet, versjon publisert, handling utført og resultat bekreftet.
- Gjenopprett forbindelser uten å gjenta kritiske handlinger automatisk.
- Skill vedvarende brukerdata fra flyktig minne.
- Bruk datert, samlet prosjektstatus; unngå motstridende historiske statusavsnitt.
- Bevar en fungerende kildeversjon før neste store endring.

## Gjenoppretting og ferdigstilling

For hver leveranse bevares eksakt commit og en navngitt arkivgren eller tag. Dokumenter installasjons-/startkommando, konfigurasjonsnavn og nødvendige kontotilganger uten hemmelige verdier.
Databaser og lokal brukerlagring må sikkerhetskopieres separat når de finnes. En kildekode-ZIP er ikke en full sikkerhetskopi av driftstilstand.
Ved gjenoppretting hentes den bevarte versjonen, nødvendige hemmeligheter settes privat og oppstart samt hovedflyt kontrolleres før normal bruk.

## Status for denne byggeoppskriften

[FERDIG] Gjenbrukbar arbeidsmåte og standardstruktur.
[FERDIG] Dokumentert referanse til Smed OBD-arkivet og Pers praktiske bekreftelse.
[FERDIG] Krav til nullbudsjett, kvalitet, publisering og gjenoppretting.
Neste steg: Bruk oppskriften på Pers neste app-idé.
