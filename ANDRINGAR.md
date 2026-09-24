# Talarstöd – uppdaterad manusredigerare

Leverans: `Talarstod-Netlify.zip`. Zip-filen innehåller webbplatsens publiceringsfiler med `index.html` direkt i roten. Publicering hanteras genom GitHub och Netlify.

## Ändringar

- Formatverktygen har ett fast eget utrymme ovanför manusets scrollbar. Menyerna täcker inte manusytan. På mindre skärmar ligger manusinställningarna under redigeraren i stället för ovanpå verktygen.
- Tillgänglig höjd följer webbläsarens VisualViewport. Vid liten höjd döljs sidhuvud, dokumenttitel och fotrad tillfälligt för att lämna plats åt text och formatverktyg.
- Markeringen sparas före formatverktygens fokusbyte. Båda ändpunkterna valideras, och bakåtriktade markeringar återställs också. Sparad markering nollställs vid dokumentbyte eller när användaren flyttar fokus utanför redigeraren/formatraden.
- Touchtryck avbryts inte med preventDefault på pointerdown, eftersom WebKit annars kan utebli med klickhändelsen. Det gäller även färgknapparna.
- Styckeväljaren följer markör och textmarkering genom selectionchange. Olika styckeformat i samma markering visas som ”Blandade format”. Halvfet, kursiv, understruken och listknappar visar webbläsarens aktuella kommandostatus.
- Bibelställe får en ärvd radhöjd i marginal före och efter, både i redigeraren och telepromptern. Inga tomma stycken läggs till i manuset.
- Ändrade filer får nya filnamn för att undvika gammal cache. Offline-cachelistan har uppdaterats. Exportens gemena filnamn och referenser med blandade versaler/gemener har normaliserats för Netlify.

## Verifierat

Automatiska regressionstester godkända i:

- Google Chrome på macOS (separat headless-session).
- Playwright WebKit på macOS.
- Playwright WebKit med iPad i stående och liggande läge och touch.
- Google Chrome med smal touchskärm.

Testerna täcker markör, framåt-/bakåtmarkering, blandat styckeformat, simulerad tappad markering när formatmenyn öppnas, touchknappar, textfärg, ångra/gör om, fast formatrad under lång scrollning, bibelställets marginaler, krympt viewport, lokal sparning och växling mellan redigerare och teleprompter. Inga JavaScript-undantag registrerades.

Separat kontroll godkänd: service worker installeras och appen laddas om offline. Samtliga lokala filreferenser, cachehashar och zip-innehåll har validerats. JavaScript-syntax har kontrollerats.

Detta är inte ett test på en fysisk iPad eller i de faktiska Safari-/Chrome-apparna på iPad. Native formatmeny, markeringshandtag och skärmtangentbord behöver slutkontrolleras på enheten. Safari på macOS har testats genom WebKit-motorn, inte genom Safari-appen. Molninloggning och Firestore testades inte; testerna använde endast isolerade lokala testmanus.

## Underhåll

Underlaget var en färdigbyggd Netlify-export. Ursprunglig React/TypeScript-källkod, package.json och originalets byggsystem saknades. Därför har ingen ursprunglig npm/pnpm-build kunnat köras. Uppdateringen görs reproducerbart genom `maintenance/build.py`, med läsbara tillägg i `maintenance/editor-improvements.js` och `.css`. Beroendepaketen och appens datamodell är oförändrade.

Bygg om med Python 3:

```sh
python3 maintenance/build.py /sökväg/till/deploy-6a660c2ce94fdf3acd3acf00.zip
python3 tests/check_package.py
```

Webbläsartesterna i `tests/editor.cjs` och `tests/offline.cjs` kräver Node 20+, Playwright, Chrome och Playwright WebKit. Installera Playwright lokalt eller ange PLAYWRIGHT_MODULE till en befintlig installation. Testservern ska servera `teleprompter` på `http://127.0.0.1:8765`.

För publicering använder du den nya zip-filens innehåll som en manuell deploy för den befintliga Netlify-webbplatsen. Paketet kräver ingen serverbaserad byggning.
