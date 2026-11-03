**Kratka beleška para: Nedelja 9**

# Tumačenje dokaza i preporuka izdanja

Priloženi su automatski `report.json`, `summary.md` i direktorijumi tragova (u `runs/`). Ova beleška ih tumači, ne prepisuje.

## Promena i hipoteza

- **Članovi para i ko ove nedelje vodi prikaz:** Anja Hubač (vodi prikaz), Aleksa Čevizović.
- **Polazni/završni commit i putanje izveštaja:** polazni `a81ad25` (neizmenjen starter), završni `3c765a6` (izmena + test). Oba POSLE izveštaja beleže `git.dirty: false`. Kasniji commit-ovi dodaju samo belešku i dokaze; `src/` i `tests/` ostaju isti kao u `3c765a6`.
  - PRE: `runs/evaluate-9b9e8e10-…`, `runs/regression-e3e614f7-…`
  - POSLE: `runs/evaluate-63f69849-…`, `runs/regression-4f1fdae6-…`
- **Opažanje → hipoteza:** Za temu `refund` izabran je izvor `refund-old` (revizija 1); u `data/lab.json` taj ID i revizija imaju `state: "archived"`. Odgovor kaže „30 days”, a kriterijum zahteva aktivan izvor `refund-current` (revizija 2, „14 days”) i njegov citat. Trag (`traces/refund.json`) pokazuje *koji* izvor je upotrebljen, ali ne i *zašto*. Uzrok smo potražili u kodu: policy grana u `src/app.ts` radi `documents.find(d => d.topic === topic)` — uzima **prvi** dokument teme i nikad ne gleda `state`. Isti uzrok objašnjava i `legacy`: jedini dokument je arhiviran, pa se umesto `refused` vraća odgovor, a arhivirani izvor se šalje modelu (`modelCalls: 1`). Problem nije u „modelu” ni u promptu — kontrolisana modelska funkcija samo prepisuje tekst izvora koji joj aplikacija preda.
- **Granica izmene i dodatna regresiona provera:** menja se samo uslov izbora izvora u policy grani: `topic === zahtevana tema && state === "active"`. Koristimo allowlist (`=== "active"`), ne `!== "archived"`, pa se i nepoznato stanje odbija (fail-closed). Bez rezerve na arhivirani izvor. Ne diramo `data/`, `scripts/`, postojeće testove, account putanju ni redosled dokumenata; nema specijalnog slučaja za refund.
- **Dodatni test:** `tests/source-eligibility.test.mjs` sa sopstvenim sintetičkim podacima (tema `warranty`, ne refund), tri provere:
  1. arhiviran izvor ispred aktivnog → aktivan tekst, aktivan citat (proveravaju se odvojeno), model prima samo aktivni izvor, trag navodi aktivni ID i reviziju;
  2. samo arhivirani izvori → `refused`, bez citata i bez poziva modelu;
  3. aktivan izvor *druge* teme + arhiviran tražene → `refused` (štiti od pogrešne popravke koja bi izgubila poklapanje teme).
  Na starom kodu sve tri padaju sa `AssertionError` iz poslovnih razloga (`'Policy: Warranty lasts 6 months.'` umesto 24; `'ok' !== 'refused'`) — vidi `test-before.txt` (0/3, kod 1). Posle izmene 3/3 — `test-after.txt`. Ceo `npm test`: 6/6 (3 postojeća + 3 nova). Rast 3→6 nije sam po sebi poboljšanje; smisao daje to što isti kriterijum pre pada, a posle prolazi.

## Tumačenje, ne prepisivanje

- **Koji slučaj se promenio i dokaz:** `refund` FAIL→PASS (završni trag: `refund-current`, revizija 2; citat `refund-current`; tekst 14 dana). `legacy` FAIL→PASS — i bitno, ne samo zbog statusa: `modelCalls` je 0 i trag nema `retrieval` događaj, dakle arhivirani izvor više ne stiže do modela. `shipping` i `unsupported` ostali PASS. Dokaz: `npm run compare` nad parovima PRE/POSLE istog skupa.
- **Ceo regresioni skup:** 5/7 → 7/7, nijedan prelaz PASS→FAIL, nema neizvršenih provera. `compare` je prihvatio poređenje: podaci, konfiguracija, skripte, toolchain i Node su identični; razlikuju se samo `source`, `built`, `tests` i commit — tačno ono što smo namerno promenili. Zato promenu rezultata pripisujemo izmeni koda. Ograda: 7/7 važi za tih 7 slučajeva, ne za „sve zahteve”.
- **Slaba/modelska ocena:** Ne slažemo se ni sa jednom kao dokazom prihvatljivosti.
  - `weakCheck` („tekst nije prazan”) je `true` u **svih 7** slučajeva PRE, uključujući dva pogrešna — ispravno meri pogrešnu osobinu i nema moć razlikovanja.
  - `recordedJudge` daje pogrešnom odgovoru (30 dana, arhivirani citat) **0.95** („Fluent and specific”), a ispravnom (14 dana, aktivni citat) **0.92**. Ocena meri tečnost, ne podržanost aktivnim izvorom. Da smo optimizovali tu ocenu, ispravka bi izgledala kao pogoršanje. Kriterijum proveravamo konkretnim dokazom: ID i revizija iz traga → `state` tog dokumenta u `lab.json` → poređenje teksta i citata sa aktivnim dokumentom. Napomena: ocene su autorski sintetički primer (`authored-synthetic-example-not-a-real-model-run`), ne merenje stvarnog LLM-a.
- **Šta AI nije mogao nezavisno da potvrdi i kako smo proverili:** AI je napisao i izmenu i test, pa oni mogu deliti istu pogrešnu pretpostavku. Provere: (1) očekivanja u testu su ručno napisani literali izvedeni iz ugovora, a ne izračunati kopijom algoritma iz aplikacije; (2) test je prvo pokrenut na **nepromenjenom** `src/` (`git diff` prazan) i pao iz pravog razloga, ne zbog uvoza; (3) javni skup, koji nismo menjali, nezavisno potvrđuje refund/legacy; (4) ručno smo pročitali `lab.json` i trag da proverimo poreklo izvora.

## Preporuka i ograničenja

- **Simulirana upotreba i preporuka — OGRANIČITI:**
  - *Policy putanja u simulaciji preko CLI `npm start -- <tema>`*: **izdati u simulaciji.** Granica je sprovediva u kodu, ne samo u ovoj belešci: `scripts/run.mjs ask` uvek gradi `{ kind: "policy", topic }`, pa kroz taj ulaz account putanja nije dostupna.
  - *Ceo servis, uključujući naloge*: **ne izdati.** Nepoznat nalog (`Z-999`, lookup `missing`) i dalje vraća `ok` i „Status naloga: active.” — izmišljen status, tačno primer iz prethodnog čitanja (D1). Javni regresioni skup nema slučaj nepoznatog naloga, pa 7/7 ovaj propust ne vidi.
- **Najvažniji preostali rizik / šta ne možemo zaključiti:**
  - D1 iznad (za ceo servis).
  - Više aktivnih izvora iste teme: biramo prvi u listi, bez poređenja revizija. Ugovor to ne definiše; nismo izmišljali pravilo, ali je to neproverena granica.
  - Tema se poredi tačnim stringom (`Refund` ≠ `refund`).
  - Modelska funkcija je deterministička zamena koja prepisuje izvor: ne znamo da li bi pravi LLM verno preneo sadržaj aktivnog izvora, ništa o latenciji, ceni ni stopi grešaka. Javni skup ima 4, a regresioni 7 slučajeva — nema osnova za tvrdnju o stvarnoj stopi greške ili SLO-u.
  - Otkaz modela nije u javnom ni u regresionom skupu. Po čitanju `src/app.ts` očekujemo `unavailable` bez citata, ali to izvršavanjem nismo proverili, pa je ovo neproverena granica.
  - `state` se proverava u trenutku izbora iz liste koju dobijemo; ne znamo koliko je ta lista sveža.
- **Signal za praćenje, uslov i reakcija:**
  - *Signal:* za svaki `ok` policy odgovor, uzeti `sourceId` + `revision` iz `retrieval` događaja i u **istom skladištu dokumenata, u trenutku odgovora**, proveriti da je taj dokument `active` i da je to tekuća aktivna revizija za temu. Brojati odgovore koji citiraju neaktivan izvor.
  - *Uslov:* ≥ 1 takav odgovor u simulaciji (ciljna vrednost je 0, ne procenat).
  - *Reakcija:* odgovorna osoba za simulaciju gasi policy putanju (svi odgovori `refused`) ili vraća prethodnu proverenu verziju; zatim reprodukuje slučaj kao novi test.
  - *Uslov za nastavak:* uzrok pronađen, novi slučaj dodat i pada na starom kodu, regresija + dodatni test prolaze pod istim uslovima.
  - Predlog za sledeći korak (nije implementirano): upisati `state` u `retrieval` događaj traga, da poreklo ne mora da se rekonstruiše iz `lab.json`.

## AI pomoć i pojedinačni doprinos

- **Za šta smo koristili AI:** Umesto Codex-a korišćen je Claude Code (Anthropic). Pročitao je kod i dokaze, predložio hipotezu i povezao je sa konkretnom linijom u `src/app.ts` i tragom, napisao test i jednolinijsku izmenu i pokrenuo merenja. Prihvaćeno: allowlist uslov bez rezerve. Odbačeno/izbegnuto: specijalni slučaj za refund, menjanje redosleda u `lab.json`, uvođenje pravila za više aktivnih revizija (nije u ugovoru). Proverili smo kako je opisano u odeljku „Šta AI nije mogao nezavisno da potvrdi”.
- **Aleksa Čevizović:** Koraci 5–8, izvršeni uz Claude Code. Opis promene sa hipotezom da policy grana uzima prvi dokument teme i ne gleda `state`, uz granicu izmene bez specijalnog slučaja za refund. Dodatni test `tests/source-eligibility.test.mjs` sa sopstvenom temom `warranty`, koji pada 0/3 na starom kodu (`test-before.txt`) i prolazi 3/3 posle izmene (`test-after.txt`). Ograničena izmena uslova izbora u `src/app.ts`, tako da se prihvata samo aktivan izvor tražene teme. Završna merenja i poređenje: evaluacija 2/4 → 4/4, regresija 5/7 → 7/7, `refund` koristi `refund-current`, reviziju 2, a `legacy` je `refused` sa `modelCalls: 0`. Preporuka za izdanje u simulaciji samo za policy putanju, signal za praćenje i slanje svih commit-ova sa svog naloga. Dokazi su nastali na njegovom računaru (Windows, Node 24.12.0), uz Claude Code: `test-before.txt`, `test-after.txt` i izveštaji u `runs/`. Lično provereno: pregledan diff `src/app.ts`, očekivanja u novom testu upoređena sa ugovorom, potvrđeno da test pada pre izmene i prolazi posle nje, pregledan završni trag `refund` i `legacy` sa `modelCalls: 0`.
- **Anja Hubač:** Koraci 1–4: vođenje i diktiranje rada preko Discord-a, bez sopstvenih commit-ova. Pregled predaje uz Claude Code u odnosu na zahteve zadatka, ispravke beleške (završni commit, opis skupova, otkaz modela kao neproverena granica) i vođenje prikaza para. Lično provereno: trag `refund` (`refund-old`, revizija 1) povezan sa arhiviranim dokumentom u `data/lab.json`; na svežem klonu (macOS, Node 26.8.1), na završnom `src/app.ts`: `npm ci` uspešno, `npm run evaluate` → 4/4, `npm run regression` → 7/7.

## Dopuna u sredu

- Referenca na tutorov nezavisni rezultat i eventualno obrazloženo neslaganje:
- Šta incident pokazuje o dostupnosti i kontrolama; koja operativna reakcija je opravdana:
- Da li menjamo preporuku i zašto; bez obaveze novog kodiranja:
