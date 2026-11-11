# Smed Analyseverksted – 11. november 2026

Mål: Analyse fra iPhone via GitHub og Smed, uten betalt AI-API eller egen PC.

Valgt teknologi: REA CLI 6.7.0, Python 3, Node 24.22.1, standard GitHub Actions Linux-runner.

| Fil | Status |
| --- | --- |
| scripts/analyze.py | FERDIG – statisk analyse og rapportering |
| tests/test_validation.py | FERDIG – målgrenser, godkjenning og lenkevern |
| targets/demo/ | FERDIG – egen eksempelapp som ikke skal kjøres |
| request.json | FERDIG – mobil bestilling |
| README.md | FERDIG – bruk, kostnadsgrenser og lokal kjøring |
| .github/workflows/smed-analysis.yml (repository-rot) | FERDIG – automatisk jobb ved push |

Verifisert lokalt: REA installert med installasjonsskript deaktivert. Statisk analyse av eksempelet returnerte exit 0 og ok=true. Test av målgrenser bestått. Målprogrammet har en throw-setning som ville feilet dersom det ble kjørt; analysen fullførte uten å starte det.

GitHub-kjøring: skal kontrolleres etter publisering; lokal suksess er ikke bevis på Actions-kjøring.

Omfang: JavaScript/TypeScript. Ghidra/ReVa, APK og native binæranalyse er ikke installert. Ingen direkte MCP-tilkobling eller automatisk AI-rekonstruksjon inngår. Resultatene kan tolkes av Smed i samtalen og brukes som grunnlag for videre bygging.
