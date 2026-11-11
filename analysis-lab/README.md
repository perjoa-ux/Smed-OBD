# Smed Analyseverksted – fra iPhone

Et separat verksted på grenen `smed-analysis` i Smed-OBD. Appens main-gren og arkiv endres ikke.

## Start fra iPhone

1. Åpne [analysebestillingen](https://github.com/perjoa-ux/Smed-OBD/edit/smed-analysis/analysis-lab/request.json) i Safari mens du er innlogget på GitHub.
2. Endre `run_id` fra `demo-001` til en ny verdi, for eksempel `demo-002`.
3. Trykk **Commit changes** og lagre på **smed-analysis**.
4. Åpne [kjøringene](https://github.com/perjoa-ux/Smed-OBD/actions?query=branch%3Asmed-analysis). Velg nyeste **Smed Analyseverksted**.
5. Les sammendraget. Last ned `smed-analysis-…` under **Artifacts**, eller send kjøringslenken til Smed for tolkning.

Alternativt: Be Smed starte en ny analyse ved å oppdatere bestillingen. Dette krever tilgjengelig GitHub-skrivetilgang.
Workflow ligger på en egen gren; ikke forvent at **Run workflow** vises før en workflow også finnes på standardgrenen. Commit-flyten over starter den via push.

## Hva den gjør

REA 6.7.0 leser JavaScript/TypeScript-applikasjoner statisk og produserer JSON med analysefunn. Verktøyets rårapport, feillogg, SHA-256-filoversikt, kjøringsstatus og mobilvennlig HTML-rapport lagres samlet. Spørsmålet følger rapporten slik at Smed kan tolke funnene senere. Ingen AI-API-nøkkel eller ekstra AI-abonnement kreves av jobben.

Dette er en rapportbasert arbeidsflyt, ikke en permanent MCP-server. Det er ikke en automatisk appkloner. Native binærfiler, Ghidra/ReVa, APK-dekompilering og kjøring av målprogrammer inngår ikke i denne første versjonen.

## Egne mål

Legg offentlig delbare, autoriserte programfiler i en ny mappe under `analysis-lab/targets/`. Sett `target` i request.json til for eksempel `targets/min-app`. Målet må inneholde JavaScript/TypeScript-filer. Ikke ta med node_modules, .git, hemmeligheter eller private data. Grenen og Actions-loggene er offentlige. `authorized` og `public_ok` må være sanne; det er ikke en automatisk tillatelse for andre mål enn det du faktisk har rett til å undersøke.

Analysejobben kjører ikke npm install i målprogrammet og starter aldri målprogrammet. Den kopierer kun valgte filer til en midlertidig mappe før analyse. Maksimum: 20 MiB, 1000 filer, 240 sekunder analyse og 10 minutter per GitHub-jobb. Symbolske lenker og mapper utenfor targets avvises. Filparserne behandler fortsatt målinnhold, så bruk dedikert midlertidig runner for ukjente filer.

## Kostnad og lagring

Bruker standard GitHub-hostet Ubuntu-runner på offentlig repository. Ingen betalte API-er, større runners, server eller database opprettes. Rapportene beholdes i én dag for å begrense lagring. GitHubs lagringskvoter gjelder fortsatt; unngå store mengder kjøringer og hold betalt overforbruk deaktivert på kontoen. Lagre rapporten du vil beholde før den utløper.

## Lokal kjøring / Codespaces

Node 24.22.1, npm, Python 3 og Linux med `ps` kreves for dette oppsettet. Fra repository-roten:

```sh
npm install --prefix /tmp/smed-rea --no-audit --no-fund --ignore-scripts --save-exact rea-agents@6.7.0
python3 -m unittest discover -s analysis-lab/tests -v
python3 analysis-lab/scripts/analyze.py --rea /tmp/smed-rea/node_modules/.bin/rea --output /tmp/smed-reports
```

## Rapportfiler

| Fil | Innhold |
| --- | --- |
| REPORT.md | Lesbar status og begrensninger |
| report.html | Mobilvennlig visning |
| analysis.json | REAs faktiske råresultat |
| analysis.stderr | Diagnostikk og feil |
| manifest.json | Filnavn, størrelser og SHA-256 |
| result.json | Tidspunkt, commit, mål og exit-status |

Kilde for analysekommando og Actions-oppsett: https://github.com/morluto/rea/blob/main/examples/github-actions/rea-analysis.yml
