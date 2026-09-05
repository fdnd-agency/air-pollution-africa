# Testen en Test-Driven Development

Deze handleiding helpt je stap voor stap bij het uitbreiden van de testdekking van Air Pollution Africa. Je hebt geen voorkennis van Test-Driven Development (TDD) nodig.

De voorbeelden en volgorde zijn afgestemd op de huidige stack:

- SvelteKit en JavaScript
- Vitest voor unit- en servicetests
- Playwright voor end-to-endtests
- Directus als externe datastore
- Resend als externe mailservice

## 1. Wat is TDD?

Bij Test-Driven Development schrijf je eerst een test voor gedrag dat nog niet bestaat. Daarna schrijf je de kleinste hoeveelheid code om die test te laten slagen. Vervolgens verbeter je de code zonder het gedrag te veranderen.

De cyclus heet meestal **red, green, refactor**:

1. **Red** — schrijf een test die faalt.
2. **Green** — schrijf de minimale implementatie waardoor de test slaagt.
3. **Refactor** — verbeter de code en houd de test groen.

TDD betekent niet dat elke regel code eerst een test moet hebben. Het betekent dat je begint bij gewenst gedrag en dat je dit gedrag automatisch controleerbaar maakt.

## 2. Waarom beginnen met tests?

Dit project bevat belangrijke serverlogica voor:

- passwordless login
- login-codes en sessies
- city-scoped autorisatie
- filtering van Directus-data
- exports
- API-key verificatie

Een fout in deze onderdelen kan leiden tot een kapotte login of toegang tot de data van een andere city. Tests geven hier een snelle, herhaalbare controle bij elke wijziging.

De testconfiguratie is al aanwezig in `vitest.config.js` en `playwright.config.js`. Er zijn momenteel weinig of geen echte tests, dus `passWithNoTests: true` kan ervoor zorgen dat een testopdracht groen eindigt zonder dat er tests zijn uitgevoerd.

## 3. De belangrijkste begrippen

### Unit test

Test één kleine functie of service in isolatie. Voorbeeld: controleer of `canAccessCity()` een superadmin toegang geeft tot iedere city.

### Integratietest

Test meerdere onderdelen samen, maar meestal nog met gecontroleerde of gemockte externe afhankelijkheden. Voorbeeld: test of `AuthService` een login-code opslaat en een mail laat versturen, zonder echt naar Directus of Resend te gaan.

### End-to-endtest

Test de applicatie zoals een gebruiker die gebruikt in een browser. Voorbeeld: een gebruiker opent de loginpagina, vult een emailadres in en ziet de verificatiestap.

### Mock

Een gecontroleerde vervanging van een externe afhankelijkheid. In deze repository mock je bijvoorbeeld Directus of Resend, zodat tests geen productiegegevens wijzigen en geen echte emails versturen.

### Test double

Een verzamelnaam voor een fake, stub, spy of mock. Het doel is steeds hetzelfde: een afhankelijkheid gecontroleerd maken.

## 4. Welke test schrijf je wanneer?

Gebruik deze vuistregel:

- Pure helper of autorisatiefunctie: **unit test**
- Service die Directus of Resend aanroept: **unit test met mocks**
- Meerdere serverlagen samen: **integratietest met gecontroleerde testdata**
- Belangrijk gebruikerspad: **Playwright end-to-endtest**

Begin niet met Playwright voor alle details. Browser-tests zijn trager en moeilijker te debuggen. Test de meeste regels op serviceniveau en gebruik Playwright voor een klein aantal cruciale gebruikersflows.

## 5. Voorbereiding

### Stap 1: controleer je branch

Werk op de feature branch voor dit werk:

```bash
git branch --show-current
git status --short
```

Maak eerst een nieuwe branch als dat nodig is:

```bash
git switch -c feature/server-tests
```

### Stap 2: installeer dependencies

```bash
npm install
```

### Stap 3: voer de bestaande controles uit

```bash
npm run check
npm run test:unit -- --run
```

Verwacht aanvankelijk mogelijk een succesvolle run met nul tests. Dat is geen bewijs dat de applicatie goed getest is; het bevestigt alleen dat de testinfrastructuur kan starten.

### Stap 4: leer de code kennen

Lees eerst deze onderdelen:

- `src/lib/server/services/loginCodeManager.js`
- `src/lib/server/services/authService.js`
- `src/lib/server/services/sessionManager.js`
- `src/lib/server/services/cityService.js`
- `src/lib/server/services/authorizationService.js`
- `src/lib/server/helpers/exportData.js`
- `vitest.config.js`

Bepaal per bestand welke invoer het accepteert, welke waarde het teruggeeft en welke externe services het aanroept.

## 6. De TDD-cyclus stap voor stap

### Stap 1: kies één gedrag

Kies een kleine, concrete regel. Bijvoorbeeld:

> Een superadmin heeft toegang tot iedere city.

Vermijd een te brede opdracht zoals:

> Ik ga de autorisatie testen.

Een brede opdracht is moeilijk te testen en leidt snel tot onduidelijke tests.

### Stap 2: schrijf de testnaam

Schrijf de verwachte uitkomst in de testnaam. Goede voorbeelden:

- `allows a superadmin to access another city`
- `denies an admin assigned to a different city`
- `rejects an expired login code`
- `escapes quotes in CSV values`

Een goede testnaam beschrijft gedrag, niet de interne implementatie.

### Stap 3: schrijf de kleinste falende test

Schrijf alleen genoeg Arrange, Act en Assert:

```js
import { describe, expect, it } from 'vitest'
import { canAccessCity } from './authorizationService.js'

describe('canAccessCity', () => {
	it('allows a superadmin to access another city', () => {
		const user = { role: 'superadmin', city: null }
		const city = { id: 'city-b' }

		expect(canAccessCity(user, city)).toBe(true)
	})
})
```

De drie delen zijn:

- **Arrange** — maak de testgegevens klaar.
- **Act** — roep de functie aan.
- **Assert** — controleer het resultaat.

### Stap 4: voer alleen deze test uit

Gebruik tijdens het schrijven een gerichte testopdracht:

```bash
npx vitest run src/lib/server/services/authorizationService.test.js
```

De test hoort eerst te falen als de functionaliteit nog niet bestaat of als de verwachting niet klopt. Dat is de **red**-fase.

### Stap 5: maak de implementatie groen

Pas de kleinste hoeveelheid productiecode aan waardoor de test slaagt. Voeg nog geen extra abstraheringen of ongerelateerde verbeteringen toe.

Voer dezelfde test opnieuw uit:

```bash
npx vitest run src/lib/server/services/authorizationService.test.js
```

Dit is de **green**-fase.

### Stap 6: refactor voorzichtig

Wanneer de test groen is, mag je de code verbeteren. Voer daarna opnieuw dezelfde test uit. Daarna pas je de volledige testsuite toe.

Dit is de **refactor**-fase.

### Stap 7: commit een kleine eenheid

Een commit kan bijvoorbeeld één gedrag bevatten:

```bash
git add src/lib/server/services/authorizationService.test.js
 git commit -m "test: cover city authorization"
```

Gebruik geen commit als je dat niet wilt of niet mag; het belangrijkste is dat iedere wijziging klein en begrijpelijk blijft.

## 7. Aanbevolen testvolgorde voor dit project

### Fase 1: pure autorisatie

Begin met `authorizationService`. Deze tests hebben geen Directus, environment variables of netwerk nodig.

Test minimaal:

- superadmin heeft toegang tot iedere city
- admin met city A heeft toegang tot city A
- admin met city A heeft geen toegang tot city B
- researcher met city A heeft toegang tot city A
- researcher met city A heeft geen toegang tot city B
- gebruiker zonder city heeft geen toegang
- researcher is geen admin
- admin en superadmin zijn wel admin
- een admin kan geen gebruiker uit een andere city beheren

Deze tests zijn goedkoop en beschermen direct de belangrijkste beveiligingsregels.

### Fase 2: login-codes

Test daarna `LoginCodeManager`.

Test minimaal:

- code wordt gegenereerd
- alleen de hash wordt opgeslagen
- code is geldig vóór de vervaldatum
- verlopen code wordt geweigerd
- correcte code is eenmalig bruikbaar
- foute code verhoogt het aantal pogingen
- de vijfde foute poging maakt de code ongeldig
- een ontbrekende user-id wordt geweigerd

Mock de Directus-methodes. Gebruik geen echte `apa_login_codes`-records.

### Fase 3: sessies

Test `SessionManager`:

- sessie bevat een willekeurig token
- sessie verwijst naar de juiste user
- verlopen sessie geeft `null`
- gedeactiveerde gebruiker kan een bestaande sessie niet meer gebruiken
- een geldige sessie wordt vernieuwd wanneer `touch` actief is
- de user-relatie bevat ook de city

### Fase 4: city-service en filtering

Test `cityService` en de functies die data aan Directus doorgeven:

- city slug wordt naar de juiste city vertaald
- onbekende slug geeft `null`
- `getCityData` voegt de city-filter toe aan sampling points
- measurements worden beperkt tot de gevonden sampling points
- `getCityTubes` voegt de city-filter toe
- een point, tube of measurement uit een andere city wordt niet geaccepteerd

Controleer hier niet alleen de return value, maar ook de query waarmee Directus wordt aangeroepen. De filter is onderdeel van de beveiliging.

### Fase 5: AuthService

Test daarna de volledige passwordless service met mocks:

- bestaand en actief account krijgt een code
- onbekend emailadres wordt geweigerd
- gedeactiveerd account wordt geweigerd
- Resend ontvangt de correcte ontvanger, afzender en code
- ontbrekende `RESEND_API_KEY` veroorzaakt een fout
- ontbrekende `FROM_EMAIL` veroorzaakt een fout
- een correcte code maakt een sessie aan
- een ongeldige code maakt geen sessie aan

Gebruik in tests geen echte API-key. Zet environment variables gecontroleerd in de testomgeving of mock de mailservice.

### Fase 6: exports

Test de exporthelpers los van HTTP:

- komma’s worden correct escaped
- dubbele quotes worden verdubbeld
- regeleinden blijven geldig binnen CSV-velden
- `null`-waarden worden voorspelbaar weergegeven
- een lege lijst levert een geldige lege export op
- data bevat alleen de geselecteerde city

### Fase 7: route- en API-integratie

Wanneer de services goed gedekt zijn, test je enkele server endpoints. Focus op statuscodes en autorisatie:

- niet-ingelogd: `401` of redirect naar login
- ingelogd in de verkeerde city: `403`
- onbekende city: `404`
- ontbrekende of ongeldige input: `400`
- succesvolle create/update/delete: de verwachte statuscode

### Fase 8: Playwright

Gebruik Playwright voor de belangrijkste gebruikerspaden:

- city kiezen en publieke pagina openen
- loginpagina openen
- verificatiestap tonen na een login-aanvraag
- researcher ziet geen user management
- admin ziet user management
- verkeerde city wordt geblokkeerd
- superadmin kan meerdere cities openen

Maak Playwright-tests onafhankelijk van Resend. Gebruik bijvoorbeeld een testmodus, een gecontroleerde login-code of een test-only server fixture. Verstuur nooit echte loginmails vanuit CI.

## 8. Directus en Resend mocken

Tests mogen niet afhankelijk zijn van:

- de beschikbaarheid van de productie-Directus-instance
- productiegegevens
- een echte Resend API-key
- echte inboxen
- DNS of Netlify

Mock externe services op de grens van je eigen code. Voor Directus betekent dit meestal dat je `DirectusService`-methodes vervangt door spies of gecontroleerde functies. Voor Resend betekent dit dat je controleert welke parameters naar `emails.send()` gaan, zonder echt een bericht te versturen.

Een goede mock is klein en expliciet. Een mock die de hele applicatie nabouwt, verbergt fouten in plaats van ze te vinden.

## 9. Hoe schrijf je goede tests?

### Test gedrag, niet implementatiedetails

Goed:

> een researcher uit Kumasi krijgt geen toegang tot Accra

Minder goed:

> functie `checkCity()` roept helper `getRelatedId()` aan

De interne helper mag later veranderen zolang het gedrag hetzelfde blijft.

### Eén reden om te falen

Een test die tegelijk login, city-filtering en CSV-export controleert, is moeilijk te begrijpen. Splits zulke tests op.

### Gebruik realistische data

Gebruik IDs en waarden die lijken op echte records, maar geen productiegegevens bevatten:

```js
const kumasi = { id: 'city-kumasi', slug: 'kumasi' }
const accra = { id: 'city-accra', slug: 'accra' }
```

### Test grensgevallen

Denk aan:

- `null`
- lege strings
- onbekende IDs
- verlopen datums
- ontbrekende relaties
- gedeactiveerde gebruikers
- city IDs als string én als nummer
- vreemde tekens in CSV-data

### Vermijd willekeur

Gebruik geen echte klok, netwerkverbinding of random productie-ID in een unit test als je dit kunt controleren. Tests moeten dezelfde uitkomst geven wanneer je ze opnieuw uitvoert.

## 10. Een dagelijkse werkwijze

Een praktische cyclus voor elke wijziging:

1. Lees de relevante service en zoek de kleinste regel die je wilt beschermen.
2. Schrijf één falende test.
3. Voer alleen die test uit.
4. Pas de productiecode minimaal aan.
5. Voer dezelfde test opnieuw uit.
6. Refactor als dat nodig is.
7. Voer de volledige unit-tests uit.
8. Voer `npm run check` uit.
9. Voer lint en build uit wanneer de wijziging klaar is.
10. Noteer wat nog niet getest is.

Handige opdrachten:

```bash
# Alle unit- en servicetests één keer uitvoeren
npm run test:unit -- --run

# Eén testbestand gericht uitvoeren
npx vitest run src/lib/server/services/authorizationService.test.js

# Tests in watch-modus tijdens ontwikkeling
npm run test:watch

# SvelteKit- en JavaScript-controle
npm run check

# Formatting en linting
npm run lint

# Productiebuild
npm run build

# End-to-endtests
npm run test:e2e
```

## 11. Wanneer is een test klaar?

Een testonderdeel is klaar wanneer:

- de test een duidelijk gedrag beschrijft
- de test eerst aantoonbaar kon falen
- de test nu groen is
- de test geen productie-Directus of echte Resend-call nodig heeft
- belangrijke grensgevallen zijn toegevoegd
- de test samen met de andere tests kan draaien
- `npm run check` en de relevante lint/build-controles slagen

## 12. Veelgemaakte fouten

### Alleen het happy path testen

Een succesvolle login is niet genoeg. Test ook verlopen codes, foute codes, gedeactiveerde accounts en ontbrekende environment variables.

### Alleen de UI testen

Een verborgen knop is geen beveiliging. De server endpoints moeten zelfstandig controleren of een gebruiker toegang heeft.

### Productie-Directus gebruiken in unit tests

Dat maakt tests traag, kwetsbaar en gevaarlijk. Mock Directus voor unit tests en gebruik alleen gecontroleerde testdata voor integratietests.

### Te veel tegelijk veranderen

Wanneer een test faalt na vijf niet-gerelateerde wijzigingen, weet je niet wat het probleem veroorzaakt. Houd iedere TDD-cyclus klein.

### `passWithNoTests` verwarren met kwaliteit

Een groene testopdracht met nul tests betekent alleen dat Vitest geen test heeft gevonden die de run blokkeert. Controleer altijd hoeveel tests werkelijk zijn uitgevoerd.

## 13. Eerste concrete werkpakket

Een goede eerste pull request kan bestaan uit:

1. tests voor `authorizationService`
2. tests voor de city-filterhelpers in `cityService`
3. tests voor de belangrijkste grenzen in `LoginCodeManager`
4. een korte testsectie in de pull request-beschrijving
5. de uitvoer van `npm run test:unit -- --run` en `npm run check`

Daarna kun je `AuthService`, exports en enkele Playwright-flows toevoegen. Zo bouw je de dekking op in kleine, begrijpelijke stappen en bescherm je eerst de code met het grootste beveiligingsrisico.
