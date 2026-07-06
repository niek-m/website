# Vemefa Constructa — nieuwe B2B site

Statische, moderne site voor B2B-metaalbewerking. Doel: bezoekers converteren
tot een afspraak (via het formulier of telefoon).

## Openen

```bash
# vanuit de repo-root
python3 -m http.server -d site 8000
# open http://localhost:8000
```

Geen build-stap nodig. HTML + CSS + kleine vanilla JS. Google Fonts wordt
extern geladen.

## Wat de site nodig heeft van jou

1. **Brand kleuren** — pas de drie waardes bovenaan `styles.css` aan:

   ```css
   --brand-primary:   #0E2F52;  /* placeholder */
   --brand-secondary: #1E7CE8;  /* placeholder */
   --brand-tertiary:  #F6A31B;  /* placeholder — wordt gebruikt voor de CTA-knop */
   ```

2. **Logo** — vervang `site/assets/logo.svg` door het echte Vemefa Constructa
   logo (svg of png). De navigatie en footer gebruiken hetzelfde bestand.

3. **Formulier-backend** — het contactformulier toont nu alleen een
   "verzonden"-status in de browser. Koppel het aan bijvoorbeeld Formspree,
   Netlify Forms of een eigen endpoint in `script.js`.

## Structuur

```
site/
├── index.html      # alle secties op één pagina
├── styles.css      # alle styling; brand vars staan bovenaan
├── script.js       # nav-toggle, scroll reveal, count-up, form
└── assets/
    └── logo.svg    # placeholder logo
```

## Secties (van boven naar beneden)

1. **Hero** — belofte + primaire CTA
2. **Trust bar** — sectoren die ze bedienen
3. **Wat we maken** — 6 kaarten met kern-producten en diensten
4. **Technieken** — alle technieken als chips, één-partner-verhaal
5. **Watersport spotlight** — sectorpagina voor de watersport-doelgroep
6. **Werkwijze** — 4 stappen van kennismaking tot levering
7. **Waarom Vemefa Constructa** — familiebedrijf, sinds 1946
8. **CTA / Afspraak** — contactformulier
9. **Contact** — adres, telefoon, e-mail, kaart-placeholder
10. **Footer**

Elke sectie heeft minstens één weg naar de afspraak-CTA — dat is het
conversiedoel.
