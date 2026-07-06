# STAALFORM — editorial B2B site voor metaalbewerking

Alternatieve website naast `/site`. Zelfde doelgroep (B2B bedrijven die
plaatwerk/metaalbewerking nodig hebben), zelfde conversiedoel
(afspraak boeken) — andere look: editorial/magazine, hoog contrast,
zwart + warme papier-kleur + electric orange.

## Bekijken

```bash
python3 -m http.server -d staalform 8000
# open http://localhost:8000
```

## Waarom deze naast `/site`?

`site/` is de Vemefa Constructa variant — vertrouwd, staalblauw, klassiek.
`staalform/` is de tegenpool: editorial, boldere typografie, meer visuele
verrassingen (tekening in hero, marquee band, dark capacity sectie).

Kies er één, of pak elementen van beide voor de definitieve site.

## Vervangbaar

1. **Merknaam** — zoek en vervang `STAALFORM` (en `staalform.nl`, `hallo@`)
   in `index.html`.
2. **Kleuren** — bovenaan `styles.css`:
   ```css
   --ink:    #0F0F10;   /* primaire kleur */
   --paper:  #F5F3EE;   /* achtergrond    */
   --accent: #FF4B1F;   /* CTA / accent   */
   ```
3. **Logo** — inline SVG in `index.html` (twee plekken: topbar + footer).
4. **Telefoon / adres / KVK** — placeholder waardes in de topbar,
   afspraak-sectie, contact en footer.
5. **Slots** — statische kennismakingstijden in de afspraak-sectie;
   in productie koppel je aan een agenda (Cal.com, Calendly, SavvyCal).
6. **Form** — nu alleen front-end demo; koppel aan Formspree / Netlify /
   eigen endpoint in `script.js`.

## Structuur

```
staalform/
├── index.html    # één pagina, alle secties
├── styles.css    # CSS-vars bovenaan, editorial systeem
└── script.js     # nav, reveal, slot-picker, form-demo
```

## Secties

1. **Hero** — display serif titel + blueprint-tekening (exploded dakventilator) + micro-badges
2. **Marquee** — donker strookje met productcategorieën
3. **Oplossingen** — 6-tile grid met SVG-line-art
4. **Capaciteit** — dark section, lijst + specs-blok
5. **Sectoren** — 6 tiles voor de sector-context
6. **Proces** — 4 stappen met tijdlijn-rail
7. **Quote** — één sterke klanttestimonial
8. **FAQ** — 5 open-vraag antwoorden
9. **Afspraak** — pitch links, formulier rechts, tijd-slots als chips
10. **Contact** — adres + hand-drawn kaart placeholder
11. **Footer** — 4-koloms

## Design keuzes

- **Type**: Instrument Serif (display) + Space Grotesk (UI). Gratis via Google Fonts.
- **Kleur**: warm off-white ipv wit, near-black ipv puur zwart. Orange als één centrale accent.
- **Micro-interactie**: sol-cards draaien iets bij hover, cap-items schuiven in, faq gebruikt `+/×`.
- **Toegankelijkheid**: skip-link, focus-outline, `prefers-reduced-motion`,
  semantische landmarks.
