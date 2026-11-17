# Installasjon og drift

1. La Google Nest og bredbåndshjemmesentralen stå som de er.
2. MacBook må være tilkoblet samme Nest-hjemmenett, helst med kabel.
3. Installer Python 3 gratis hvis nødvendig.
4. Åpne Terminal i mappen `agent/` og kjør `sh install-macos.sh`.
5. Ved forespørsel om nøkkel: finn `SMED_AGENT_TOKEN` under Render → `smed-obd-i2kp` → Environment. Lim inn i Terminal; verdien lagres ikke, bare en avledet nøkkel.
6. Kontroller loggen `~/.config/smed-nettvakt/stdout.log` og nettvaktstatus i ChatGPT etterpå.

Den lokale agenten endrer **ikke** innstillinger på Nest-ruterne og skanner ikke portene på enhetene. Den sender status over TLS til den eksisterende autentiserte Render-broen.

Valgfri SmartLife: Installer Home Assistant lokalt, legg til offisiell Tuya-integrasjon. Oppgi `ha_url`, `ha_token_file` og eksakt `ha_entities` i `~/.config/smed-nettvakt/config.json`. Plasser token i en fil med rettigheter 0600. Start agenten på nytt med `launchctl kickstart -k gui/$(id -u)/no.smed.nettvakt`.

Avinstaller: `sh uninstall-macos.sh`. For å fjerne lokale tokens etter avinstallasjon: `rm -rf ~/.config/smed-nettvakt` (sletter også logg og konfigurasjon).

Begrensninger: den passive ARP-listen er ikke en fullstendig liste over alle tilkoblede enheter. Google Home er fortsatt nødvendig for avansert Nest-administrasjon. Uten tilkoblet Mac-sensor er det ingen nettverksdata. Kode for serverdelen må være aktivert i den eksisterende Smed OBD-broen før pluginverktøyene er tilgjengelige.
