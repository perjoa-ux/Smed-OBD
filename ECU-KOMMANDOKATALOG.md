# SMED-OBD – ECU command catalog

Vehicle: Outlander 2011 CW1W 4N14 low-power; ECU HW 1860B614, SW 1860B61405.

Live scan 2026-11-09: 81 of 81 requests reported. 75 manufacturer-specific 21xx commands; 6 standard OBD. Four 21xx requests returned 7F 21 12. Reference formulas are from the other ECU variant 1860C97201; validate before use. 273 candidate fields.

## Manufacturer-specific 21xx read catalog

| Command | MUT-III reference fields | Live status |
|---|---|---|
| `2101` | 1: Battery Voltage; 4: Vehicle speed; 2: Engine revolution; 3: Target idle speed; 510: Target Idle Speed2 | ECU response received |
| `2102` | 43: Air temperature sensor; 7: ECT sensor; 6: Boost pressure sensor; 8: Intake air temperature sensor; 5: Barometric pressure sensor | ECU response received |
| `2103` | 144: AT oil temperature sensor; 145: Odometer calculated by ECU | ECU response received |
| `2104` | 45: TP sensor; 9: APP sensor(main); 10: APP sensor(sub); 114: Airflow sensor | ECU response received |
| `2108` | 11: APP sensor(main); 12: APP sensor(sub); 47: TP sensor; 46: TPS learned closed position | ECU response received |
| `2109` | 13: APS(main) learned closed pos. | ECU response received |
| `2110` | 117: Exhaust temperature sensor; 118: Catalyst temperature sensor; 119: DPF temperature sensor; 120: DPF difference pressure sensor; 511: NTC Temperature Sensor | ECU response received |
| `2111` | 153: Soot loading by distance1; 155: Soot loading by summation; 156: Soot loading by Pressure Diff.; 154: Soot loading by distance2 | ECU response received |
| `2112` | 126: Catalyst temperature sensor Max; 127: DPF temperature sensor Max; 148: Count of regeneration; 116: Mode of regeneration request; 512: NTC Temperature Sensor Max | ECU response received |
| `2113` | 128: Odometer DPF temp. sensor Max; 151: Status of soot load by diff pres; 160: Last regeneration mode | ECU response received |
| `2114` | 129: Cruise switch; 130: Cruise cancel code | ECU response received |
| `2115` | 190: Odometer for DPF by ECU; 191: Nonuniform soot accumulation; 192: Max value of DPF temperature; 513: RE-Regeneration request flag | ECU response received |
| `2116` | 193: Regeneration start distance1; 194: Regeneration start summation; 195: Regeneration start press. diff.; 196: Regeneration start distance2; 197: DPF temperature; 514: Count of RE-Regeneration request | ECU response received |
| `2117` | 198: Engine oil level calculated; 199: Engine oil consumption calculate; 200: Fuel dilution calculated by ECU; 201: Pre-Regene.Remain Soot Value; 202: Pre-Regene.Soot Value | ECU response received |
| `2118` | 515: Engine Oil Level Calculated 2; 516: ENG Oil Consumption Calculated 2; 517: Fuel dilution calculated by ECU2; 204: Regeneration mode 2 times before; 205: Regeneration mode 3 times before | ECU response received |
| `2119` | 206: Regeneration mode 4 times before; 207: Regeneration mode 5 times before; 208: Short interval regeneration rate; 518: Soot loading by summation 2; 519: Soot loading by Pressure Diff. 2 | ECU response received |
| `211A` | 520: Correction at S purge (POST); 521: Amount of HC Storage(idle) | ECU response received |
| `211C` | 522: S purge time (Last); 523: S purge time (2 times before) | ECU response received |
| `211E` | 488: Brake Override Operated ODO; 489: Final torque target | ECU response received |
| `211F` | 524: Regeneration time Last; 525: Regeneration time 2 times before; 526: AVE. speed at Regene (Last); 527: AVE. speed at Regene (2nd last); 528: AVE. speed during Regene (Last); 529: AVE. speed during Regene (2nd) | Negative response 7F 21 12 |
| `2124` | 404: BATT.current SNSR(learned value); 409: EPS Current; 432: Starter Counter | ECU response received |
| `2126` | 434: Vehicle Consumption Current; 563: Odometer for injector cleaning | ECU response received |
| `2127` | 435: Last Battery Deteriorated ODO; 436: 2nd Last Batt. Deteriorated ODO; 437: 3rd Last Batt. Deteriorated ODO | ECU response received |
| `2128` | 391: Count of Regeneration Request; 530: MAX Value of DPF Temp (2nd last); 531: MAX Value of DPF Temp (3rd last); 532: MAX Value of DPF Temp (4th last); 533: MAX Value of DPF Temp (5th last) | ECU response received |
| `2129` | 397: Atmospheric PRS. Abnormal Learn.; 398: Count of HC Purge at Hot Idle; 399: Count of HC Purge at Cold Idle | ECU response received |
| `212A` | 540: Output Voltage of AFS; 541: Amount of PM loading; 542: Judg. of Stable for SOOT loading; 543: Average of DPF difference press.; 544: Exhaust Flow Volume; 545: Judgement of DPF clogging; 546: Soot loading (Last DPF regene.) | Negative response 7F 21 12 |
| `2142` | 53: Small qt. Injection number; 534: Count of Small qt. Learning | ECU response received |
| `2143` | 490: Fuel Injection Quantity Pilot1; 491: Fuel Injection Quantity Pilot2; 492: Fuel Injection Quantity Pilot3 | Negative response 7F 21 12 |
| `2144` | 15: Vehicle speed; 56: Engine revolution | ECU response received |
| `2146` | 400: ALT FR Duty(%); 401: ALT G Duty(%); 402: Battery Temp Sensor | ECU response received |
| `2147` | 17: EGR valve target position; 16: EGR valve position | ECU response received |
| `2149` | 21: Fuel temperature sensor | ECU response received |
| `214A` | 57: Fuel quantity final; 60: Fuel quantity start; 59: Fuel quantity smoke limit; 58: Fuel quantity pre | ECU response received |
| `214B` | 62: Fuel injection timing main; 61: Fuel injection interval pilot | ECU response received |
| `214C` | 64: Fuel pressure target; 63: Fuel pressure; 67: High press. pump target value; 66: High press. pump learned value; 65: High press. pump learned status | ECU response received |
| `214E` | 30: Control relay; 33: Engine check light; 38: Ignition switch; 40: Starter switch; 42: Neutral switch; 131: MT clutch switch; 75: P/S switch; 134: Normally closed brake switch; 135: Brake light switch; 35: Glow light; 36: Glow plug relay; 410: OCV (MIVEC); 411: EGR Cooler Bypass Solenoid; 25: A/C SW1; 27: A/C relay; 152: Fuel filter stuffed switch; 412: Intank Pump Relay; 136: Cruise main switch; 137: Cruise cancel switch; 138: Cruise set switch; 139: Cruise resume switch; 140: Cruise control under operating; 214: DPF light; 413: Starter relay; 215: DPF light(yellow) | ECU response received |
| `214F` | 142: VGT sol. duty before revision; 143: VGT sol. duty After revision; 217: VGT F/B target boost | ECU response received |
| `2151` | 219: Fuel injection quantity main; 220: Fuel injection quantity after; 221: Fuel injection quantity post1; 222: Fuel injection quantity post2; 223: Fuel injection quantity post3 | ECU response received |
| `2154` | 301: NOx storage; 302: S storage | ECU response received |
| `2155` | 303: Compensation value of A/F sensor; 304: A/F SNSR. heater duty cycle; 305: A/F SNSR. current(after COMP.); 306: A/F SNSR. current(before COMP.); 307: A/F heater mode | ECU response received |
| `2156` | 308: Target A/F COMP. value1; 309: Target A/F COMP. value2; 310: Target A/F COMP. value3; 311: Target A/F COMP. value4; 312: Target A/F COMP. value5 | ECU response received |
| `2157` | 313: Target A/F COMP. value6; 314: Target A/F COMP. value7; 315: Target A/F COMP. value8 | ECU response received |
| `2158` | 318: DPF regeneration remain time; 319: Count of S purge; 320: APS main(after COMP.) | ECU response received |
| `2159` | 321: DPF regeneration operating; 322: S purge operating; 323: NOx purge operating; 325: A/F sensor active; 327: S purge request; 328: DPF regeneration request; 450: Water Level SW; 451: Oil Pressure SW; 452: Battery current SNSR.calibration; 454: Battery degrade judgement flag; 455: Battery full-charge mode flag; 458: Amount of HC is over in D-HCT; 459: Active Warm Up Under Operating; 460: ASLF Main SW; 564: Engine system check display request | ECU response received |
| `215A` | 369: A/F sensor value; 370: Estimate A/F(cylinder); 371: Estimate A/F(final); 372: A/F heater (on); 373: A/F heater (off) | ECU response received |
| `215B` | 374: DPF TEMP SNSR 1 (Before UCC); 375: DPF TEMP SNSR 2 (ON UCC); 376: DPF TEMP SNSR 3 (After DPF); 377: Max value of DPF temperature; 378: NOx purge interval | ECU response received |
| `215C` | 379: A/F sensor impedance; 380: A/F sensor voltage; 381: A/F sensor voltage(+); 382: A/F sensor voltage(-); 383: Minimum A/F under NOx purge | ECU response received |
| `215D` | 384: ODO. at DPF temperature MAX.; 385: HC Purge Remain Time | ECU response received |
| `215E` | 535: Odometer NTC temp. Sensor Max; 536: Exhaust temp. sens.MAX(S purge); 537: Catalyst temp. sens.MAX(S purge); 538: DPF temp. sens.MAX(S purge) | ECU response received |
| `215F` | 390: Fuel Consumption(in all time) | ECU response received |
| `21A0` | 225: Diff. press. learning zero (M0); 227: Diff. press. learning zero (M1) | ECU response received |
| `21A1` | 230: Diff. press. learning zero (M2); 232: Diff. press. learning zero (M3) | ECU response received |
| `21A2` | 235: Diff. press. learning zero (M4); 237: Diff. press. learning zero (M5) | ECU response received |
| `21A3` | 240: Diff. press. learning zero (M6); 242: Diff. press. learning zero (M7) | ECU response received |
| `21A4` | 245: Diff. press. learning zero (M8); 247: Diff. press. learning zero (M9) | ECU response received |
| `21A5` | 250: Diff. press. learning zero (M10); 252: Diff. press. learning zero (M11) | ECU response received |
| `21A6` | 255: Diff. press. learning zero (M12); 257: Diff. press. learning zero (M13) | ECU response received |
| `21A7` | 260: Diff. press. learning zero (M14); 262: Diff. press. learning zero (M15) | ECU response received |
| `21A8` | 500: GLOW Real Duty(%); 501: Radiator Fan Duty(%) | ECU response received |
| `21A9` | 270: Target A/F COMP. value1 (detail); 271: Target A/F COMP. value2 (detail) | ECU response received |
| `21AA` | 272: Target A/F COMP. value3 (detail); 273: Target A/F COMP. value4 (detail) | ECU response received |
| `21AB` | 274: Target A/F COMP. value5 (detail); 275: Target A/F COMP. value6 (detail) | ECU response received |
| `21AC` | 276: Target A/F COMP. value7 (detail); 277: Target A/F COMP. value8 (detail) | ECU response received |
| `21B0` | 78: Small qt. pressure 1 #1; 79: Small qt. pressure 1 #2 | ECU response received |
| `21B1` | 80: Small qt. pressure 1 #3; 81: Small qt. pressure 1 #4 | ECU response received |
| `21B2` | 82: Small qt. pressure 2 #1; 83: Small qt. pressure 2 #2 | ECU response received |
| `21B3` | 84: Small qt. pressure 2 #3; 85: Small qt. pressure 2 #4 | ECU response received |
| `21B4` | 86: Small qt. pressure 3 #1; 87: Small qt. pressure 3 #2 | ECU response received |
| `21B5` | 88: Small qt. pressure 3 #3; 89: Small qt. pressure 3 #4 | ECU response received |
| `21B6` | 90: Small qt. pressure 4 #1; 91: Small qt. pressure 4 #2 | ECU response received |
| `21B7` | 92: Small qt. pressure 4 #3; 93: Small qt. pressure 4 #4 | ECU response received |
| `21B8` | 94: Small qt. pressure 5 #1; 95: Small qt. pressure 5 #2 | ECU response received |
| `21B9` | 96: Small qt. pressure 5 #3; 97: Small qt. pressure 5 #4 | ECU response received |
| `21BE` | 106: ISC torque; 107: Small qt. map counter; 108: Small qt. pressure counter; 108: Small qt. pressure Not Complete | ECU response received |
| `21C0` | 547: Odometer from Last SQL; 548: ODO from Last SQL or change INJ; 549: ODO from last 2nd to last SQL; 550: ODO (3rd - 2nd last SQL); 551: ODO (4th - 3rd last SQL); 552: Count of SQL (auto); 553: Count of SQL (manual); 554: Condition of SQL; 555: Water temp. condition of SQL; 556: Fuel temp. condition of SQL; 557: AT Oil temp. condition of SQL | Negative response 7F 21 12 |

## Confirmed standard OBD responses

- `03`: `43 00` (no stored emission codes)
- `07`: `47 00` (no pending emission codes)
- `0A`: `NO DATA`
- `0101`: `41 01 00 4C 80 80`
- `0105`: `41 05 61`
- `010C`: `41 0C 0A 38`

## Standard read candidates from project (not individually verified on this ECU)

Adapter: `ATI`, `ATE0`, `ATL0`, `ATSP6`, `ATSH7E0`.

`0100`, `0120`, `0140`, `0160`, `0180`, `01A0`, `0104`, `0106`, `010B`, `010D`, `010E`, `010F`, `0110`, `0111`, `011C`, `011F`, `012F`, `0131`, `0133`, `013C`, `013E`, `0142`, `0143`, `0146`, `0149`, `014D`, `014E`, `0151`, `015C`, `015E`, `016B`, `016C`, `017C`, `017E`, `020200`, `020500`, `020C00`, `0900`, `0902`, `0904`, `0906`, `090A`.

## References only – NOT active ECU commands

| Hex | Provenance | Status |
|---|---|---|
| `1092` | MUT-III/KWP2000 CAN session start | Not in automatic read/remote raw-send allowlist |
| `1081` | MUT-III session return | Not in automatic read/remote raw-send allowlist |
| `3E02` | OpenPort tester-present | Not in automatic read/remote raw-send allowlist |
| `2380878C02` | OpenPort example read of another ECU | Not in automatic read/remote raw-send allowlist |
| `30540700` | DIESEL4N1 XML qid 528/90528, Engine oil exchange service candidate | Not in automatic read/remote raw-send allowlist |
| `31B8/31B9/31BA/31BB` | DPF.md 4N13 routine guesses | Not in automatic read/remote raw-send allowlist |
| `27xx` | SecurityAccess, unknown level/flow | Not in automatic read/remote raw-send allowlist |
| `04` | OBD DTC clear already implemented separately with local double confirmation | Not in automatic read/remote raw-send allowlist |

Sources: project Library files Outlander-log.md, Smed-OBD-prosjekt.md, DPF.md and openport2-serial-backend.md; code profile in index.html; Render logs SMED_SCAN_BLOCK for scan-mw93f0zf-63a4fo3sv. These do not verify special write sequences. This public file must contain no tokens or private diagnostic session payloads.
