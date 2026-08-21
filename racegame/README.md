# Baanrace Challenge — prijsvraag-game

Statische, vanilla JS canvas game: drie banen, oprukkende obstakels, high
score. Na een game over kan de speler zijn e-mailadres achterlaten om met
die score mee te doen aan een prijsvraag.

## Openen

```bash
# vanuit de repo-root
python3 -m http.server -d racegame 8000
# open http://localhost:8000
```

Geen build-stap nodig. HTML + CSS + één vanilla JS-bestand, geen externe
dependencies of lettertypes.

## Wat je nog moet doen voordat dit live gaat

1. **Backend koppelen** — zonder backend worden inzendingen alleen lokaal
   in de browser van de speler bewaard (`localStorage`), puur om de flow te
   testen. Zet de `SUBMIT_ENDPOINT`-constante bovenaan `script.js` op een
   echt endpoint, bijvoorbeeld:
   - [Formspree](https://formspree.io/) of [Netlify Forms](https://docs.netlify.com/manage/forms/setup/) — geen server nodig.
   - Een eigen serverless functie die naam/e-mail/score/tijdstip opslaat.

   Zolang dit leeg is, verzamel je géén echte inzendingen — alleen een
   demo die in elke browser apart bijhoudt wat er is ingevuld.

2. **Actievoorwaarden invullen** — `index.html` bevat een sectie
   `#voorwaarden` met `[PLACEHOLDER]`-teksten voor de prijs, actieperiode,
   winnaarsbepaling en privacy-tekst. Laat deze definitieve tekst juridisch
   controleren (AVG/GDPR: wie is verwerkingsverantwoordelijke, hoe lang
   worden e-mailadressen bewaard, hoe kan iemand zich afmelden).

3. **Echte deduplicatie & winnaarsbepaling** — de huidige "één inzending
   per e-mailadres, hoogste score telt"-logica draait client-side en is dus
   makkelijk te omzeilen (bv. door meerdere keren in te vullen vanuit
   verschillende browsers). Zodra je een echte backend hebt, moet die
   server-side dedupliceren op e-mailadres en de winnaar bepalen — vertrouw
   hiervoor nooit alleen op de browser.

## Bescherming tegen valsspelen (client-side, "basis"-niveau)

Belangrijk om te weten: dit is en blijft een **client-side spel**. Volledig
waterdichte bescherming tegen een vastberaden valsspeler kan alleen met
server-side score-validatie. Wat er nu wél in zit:

- De spelstatus (score, positie, obstakels) leeft in een JS-closure, niet
  op `window` — dus geen `window.score = 999999` via de devtools-console.
- Elke frame wordt een theoretisch maximum bijgehouden voor de score die op
  dat moment haalbaar zou zijn geweest (op basis van de bekende
  snelheids-/spawn-curve). Bij het inzenden wordt de werkelijke score
  hiertegen afgezet (met een kleine marge) — een score die overduidelijk
  onmogelijk hoog is voor de gespeelde tijd wordt geweigerd.
- Er moet minstens een paar seconden gespeeld zijn voordat een score
  ingezonden kan worden.
- Een verborgen honeypot-veld in het formulier vangt eenvoudige bots op.
- Alle tekst die teruggetoond wordt (bevestiging) gaat via `textContent`,
  nooit via `innerHTML`, dus geen HTML/script-injectie via het naam- of
  e-mailveld.

Voor een prijsvraag met een waardevolle prijs en veel verkeer raad ik aan om
stap 1 (echte backend) serieus te nemen: laat de backend zelf nogmaals een
grove plausibiliteitscheck doen (tijd/score-verhouding) voordat een
inzending als geldig wordt geteld.

## Structuur

```
racegame/
├── index.html    # spelbord, HUD, start/gameover overlays, inzendformulier, voorwaarden
├── styles.css    # alle styling
└── script.js     # spellogica, scoring, plausibiliteitscheck, inzend-flow
```

## Spelregels

- Drie banen; wissel met de pijltjestoetsen / A-D (desktop) of tik links/
  rechts van de auto (mobiel, of gebruik de knoppen onder het speelveld).
- Obstakels komen sneller en talrijker naarmate je langer overleeft, maar er
  blijft altijd minstens één baan vrij.
- Score = afgelegde afstand + bonus per ontweken obstakel.
- Bij een botsing eindigt het spel en zie je je score, eventueel een nieuw
  persoonlijk record, en de mogelijkheid om mee te doen aan de prijsvraag.
