# Talarstöd

Webbapp för att skriva, organisera och framföra manus.

Detta repository återskapar appen från en befintlig Netlify-export. Ursprungliga React/TypeScript-källfiler ingick inte. Den byggda appen finns i `teleprompter/`; de läsbara editorförbättringarna finns i `maintenance/`.

## Bygg och publicera

```sh
python3 maintenance/build.py baseline/original-netlify-export.zip
python3 tests/check_package.py
```

Netlify använder konfigurationen i `netlify.toml`, bygger från `main` och publicerar katalogen `teleprompter`. Bygget använder endast Python 3:s standardbibliotek. Varje ändring i `main` ska utlösa en ny publicering när repositoryt kopplats till Netlify-projektet `talarstod`.

Ändra de läsbara tilläggen i `maintenance/editor-improvements.js` och `.css` och kör bygget. Ändringar direkt i de genererade filerna skrivs över vid nästa bygge. Vid större vidareutveckling bör den ursprungliga källkoden återställas eller appen migreras till ett vanligt källkodsprojekt.

## Lokal kontroll

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory teleprompter
```

I en annan terminal, med Node 20+, Playwright 1.62.1, Chrome och Playwright WebKit installerade:

```sh
node tests/editor.cjs
node tests/offline.cjs
```

Testerna skapar isolerade webbläsarsessioner och lokala testmanus. De använder inte riktiga molnkonton. `PLAYWRIGHT_MODULE` kan ange sökvägen till en befintlig Playwright-installation.

Se `ANDRINGAR.md` för detaljer och testbegränsningar. Firebase-klientkonfigurationen kommer från den redan publicerade webbappen. Inga användarmanus eller privata inloggningsuppgifter finns i detta repository.
