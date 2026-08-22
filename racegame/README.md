# SchaalX Baanrace — prijsvraag-game

Statische, vanilla JS canvas game voor SchaalX: drie banen, oprukkende
obstakels, high score. Spelers geven eerst hun (zakelijke) e-mailadres op
en "ontvangen" een inloglink voordat ze mogen spelen; na een botsing wordt
de score automatisch toegevoegd aan een ranglijst.

**Belangrijk:** de inloglink-verificatie en het scorebord zijn op dit
moment een **simulatie** — er is nog geen echte backend gekoppeld. Zie
"Wat je nog moet doen" hieronder.

## Openen

```bash
# vanuit de repo-root
python3 -m http.server -d racegame 8000
# open http://localhost:8000
```

Geen build-stap nodig. HTML + CSS + één vanilla JS-bestand, geen externe
dependencies of lettertypes.

## De flow zoals hij nu werkt (gesimuleerd)

1. Speler vult zijn zakelijke e-mailadres in en gaat akkoord met de
   actievoorwaarden.
2. In plaats van een echte e-mail te versturen, toont de app een "Check je
   inbox"-scherm met een expliciet gelabelde simulatieknop ("Simuleer: link
   geopend"). Er wordt dus **geen** echte e-mail verstuurd en er is geen
   echte verificatie dat het e-mailadres bestaat of van de invuller is.
3. Na het spelen wordt de score automatisch toegevoegd aan een ranglijst
   die in `localStorage` van die ene browser wordt bijgehouden — dus **niet**
   zichtbaar of gedeeld met andere deelnemers.

Dit is bewust zo gebouwd: je kunt de hele flow en de game nu al beoordelen
en testen, zonder dat er al accounts/infrastructuur voor nodig zijn.

## Wat je nog moet doen voordat dit live gaat

1. **Een echte backend + e-mailservice koppelen.** Aanbevolen: een enkele
   dienst die zowel de magic-link-verificatie als de database regelt, zoals
   [Supabase](https://supabase.com/) (Auth met magic links + Postgres voor
   de ranglijst). Jij maakt daar een (gratis) project voor aan; ik kan de
   integratie bouwen zodra ik de project-URL en API-key heb.
2. **Hosting kiezen.** De huidige statische bestanden kunnen overal
   gehost worden, maar zodra er echte serverless functies nodig zijn (voor
   het versturen/valideren van de inloglink), moet dat op een platform dat
   dat ondersteunt — bijvoorbeeld [Vercel](https://vercel.com/) of
   [Netlify](https://www.netlify.com/). GitHub Pages host alleen statische
   bestanden en kan dat niet.
3. **Server-side dedupe & winnaarsbepaling.** De huidige "één inzending per
   e-mailadres, hoogste score telt"-logica draait client-side en is dus
   makkelijk te omzeilen. Zodra er een echte backend is, moet die
   server-side dedupliceren op e-mailadres en de winnaar bepalen.
4. **Actievoorwaarden afronden.** `index.html` bevat een sectie
   `#voorwaarden`. De prijs staat al vast (het boek "Van SEO naar GEO" van
   Martin van Kranenburg); actieperiode, winnaarsbepaling bij gelijke
   stand, bekendmakingstermijn, organisatiegegevens en het
   privacy-contactadres staan nog als `[PLACEHOLDER]` en moeten juridisch
   gecontroleerd worden (AVG/GDPR).

## Bescherming tegen valsspelen (client-side, "basis"-niveau)

Dit blijft een **client-side spel** — volledig waterdichte bescherming kan
alleen met server-side score-validatie. Wat er nu wél in zit:

- De spelstatus (score, positie, obstakels) leeft in een JS-closure, niet
  op `window` — dus geen `window.score = 999999` via de devtools-console.
- Elke frame wordt een theoretisch maximum bijgehouden voor de score die op
  dat moment haalbaar zou zijn geweest. Bij game over wordt de werkelijke
  score hiertegen afgezet (met een kleine marge); een score die
  overduidelijk onmogelijk hoog is voor de gespeelde tijd wordt niet aan de
  ranglijst toegevoegd.
- Er moet minstens een paar seconden gespeeld zijn voordat een score meetelt.
- Een verborgen honeypot-veld in het e-mailformulier vangt eenvoudige bots op.
- E-mailadressen worden in de ranglijst gemaskeerd getoond (bv.
  `n***@bedrijf.nl`) in plaats van volledig, en alle tekst gaat via
  `textContent`, nooit via `innerHTML`.

Voor een prijsvraag met een echte, waardevolle prijs en veel verkeer: neem
stap 1 hierboven (echte backend) serieus voordat dit live gaat.

## Structuur

```
racegame/
├── index.html    # landing + e-mail-gate, "check je inbox"-scherm, het spel, voorwaarden
├── styles.css    # alle styling (SchaalX-huisstijl: donkere navy + oranje accent)
└── script.js     # gate-/verificatieflow, spellogica, scoring, plausibiliteitscheck, ranglijst
```

## Spelregels

- Drie banen; wissel met de pijltjestoetsen / A-D (desktop) of tik links/
  rechts van de auto (mobiel, of gebruik de knoppen onder het speelveld).
- Obstakels komen sneller en talrijker naarmate je langer overleeft, maar er
  blijft altijd minstens één baan vrij.
- Score = afgelegde afstand + bonus per ontweken obstakel.
- Bij een botsing eindigt het spel, zie je je score en (als de score
  plausibel is) wordt hij toegevoegd aan de ranglijst.
