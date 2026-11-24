# Smed OBD Native – bakgrunnstest

Separat utviklingsgren. Eksisterende webapp 0.31 og Render-bro er uendret.
Dette er en første lokal, skrivebeskyttet Bluetooth-prototype, ikke en ferdig erstatning for webappen.
Ingen hemmeligheter skal legges i repoet.

## Bygg på Mac
Installer Xcode og XcodeGen (gratis, åpen kildekode; med Homebrew: brew install xcodegen).
Kjør fra repoet: cd ios && xcodegen generate && open SmedOBDNative.xcodeproj.
Velg eget Apple-ID Personal Team under Signing & Capabilities og en tilkoblet iPhone som mål.
Gratis signering utløper normalt etter 7 dager. Installer på nytt fra Xcode ved utløp.
Bygg og fysisk test er ikke utført ennå.

## Transport
CoreBluetooth central, restoration identifier, FFF0/FFF1/FFF2 fra den eksisterende webappen.
Kun adapteroppsett ATE0, ATL0, ATSP6, ATSH7E0 og standard OBD modus 01.
En kommando om gangen; svar avsluttes ved ELM-prompt. Ingen sletting, regenerering eller innlæring.
Logg på enheten, atomisk lagring, maks 5000 prøver. Background mode bluetooth-central.
Bakgrunnsutførelse kan begrenses av iOS; ingen garanti om kontinuerlig kjøring.
Ingen ekstern overføring i denne prototypen. Neste steg er å integrere autentisert Render-bro,
bevare eksisterende motorvakt/dekoding og synkronisere offline-logg.

## Akseptansetester (parkert)
1. Koble fra Bluefy og start native app; kontroller ekte turtall og kjølevæsketemperatur.
2. Åpne ChatGPT/Voice og la den native appen gå i bakgrunnen i minst 5 minutter.
3. Lås skjermen i 5 minutter; kontroller tidsstempler og eventuelle hull i lokal logg.
4. Bryt KDIAG-forbindelsen, gjenopprett den, og kontroller gjenopptatt lesing.
5. Kontroller at Stopp hindrer automatisk ny tilkobling.
6. Bygg serverintegrasjon og gjenta fysisk test, med avlesning via ChatGPT.
7. Sammenlign måledata og avvik med eksisterende motorvakt før eventuell sammenslåing.

Ikke slå sammen eller erstatte v0.31 før fysisk test og serverintegrasjon er verifisert.
