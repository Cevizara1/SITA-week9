# Support Reliability Lab

Sintetički asistent za podršku za Nedelju 9. Koristi lokalne izvore, jedan read-only lookup i deterministički zamenski model. Ne zahteva API ključ niti plaćeni model.

## Pokretanje

Potreban je Node.js 24 ili noviji i npm. Iz direktorijuma aplikacije:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
npm start -- shipping
npm run evaluate
npm run regression
```

`npm ci` prvi put preuzima zaključani TypeScript paket; kada je paket već u npm kešu, dodajte `--offline`. Izvođenje aplikacije ne koristi mrežu. Ako instalacija nije dostupna, obratite se kursnoj zajednici za pripremljeni paket/zavisnost; ne preskačite typecheck niti izmišljajte rezultate.

Početni `evaluate` namerno završava kodom 1 sa 2/4 prolaza; `regression` ima 5/7. `npm test` ima tri osnovne provere i nije zamena za evaluaciju. Pokrenite sve provere i kada jedna otkrije problem.

## Dokazi bez prepisivanja

Svaka evaluacija ispisuje novi direktorijum `runs/` sa `report.json`, `summary.md` i referencama na tragove. Sačuvajte putanju početnog i završnog izvršavanja. Uporedite dva izveštaja istog skupa:

```sh
npm run compare -- runs/IME-POCETNOG/report.json runs/IME-ZAVRSNOG/report.json
```

U komandi zamenite oba naziva stvarnim putanjama iz konzole. Konfiguracija, podaci i harness moraju ostati isti; izmena poređenja nije dokaz poboljšanja. Ne prepisujte tabele, metapodatke ili hash-eve u izveštaj.

Menja se TypeScript u `src/`; `dist/` je generisan. `data/lab.json` i kriterijumi su polazni ugovor, ne način da se rezultat ulepša. Kopija kursnog arhiva je rezervno početno stanje; sačuvajte svoj rad pre ponovnog raspakivanja u drugi direktorijum.

Codex može pomoći u istrazi, izmeni i testovima, ali njegovo slaganje nije nezavisna potvrda. Ne unosite tajne ili privatne podatke. Nedeljni zadatak radi se u paru između petka i srede, ne tokom predavanja u petak.
