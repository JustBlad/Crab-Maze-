/* =========================================================
   Madeira Quest – Daten
   ---------------------------------------------------------
   Koordinaten sind ungefähre Positionen in Funchal.
   Zum Korrigieren: Ort in Google Maps öffnen → lange drücken
   → die angezeigten Zahlen (lat, lng) hier eintragen.
   ========================================================= */

const CONFIG = {
  center: [32.6485, -16.9065],   // Funchal Zentrum
  zoom: 15,
  checkinRadius: 200,            // Meter: so nah musst du sein für "verifiziert"
  level2Unlock: 4,               // so viele Level-1-Orte für Level 2
  points: { visit: 50, verified: 25, rating: 10, firstOfDay: 15 },
  // Demo-Daten für andere Studis (Prototyp ohne Server).
  // Auf false setzen, sobald ein echtes Backend angebunden ist.
  demoCommunity: true,
};

const CATEGORIES = {
  cafe:  { label: "Cafés",   emoji: "☕", color: "#FF7A1A" },
  beach: { label: "Strände", emoji: "🏖️", color: "#1FA2D6" },
  bar:   { label: "Bars",    emoji: "🍹", color: "#9B5DE5" },
  food:  { label: "Essen",   emoji: "🥪", color: "#2BB673" },
  sweet: { label: "Eis",     emoji: "🍦", color: "#F15BB5" },
};

const PLACES = [
  // ---------------- LEVEL 1 ----------------
  {
    id: "gaudeamus", level: 1, cat: "cafe",
    name: "Gaudeamus Café",
    area: "Zentrum",
    lat: 32.6496, lng: -16.9089,
    desc: "Das Studi-Café schlechthin: günstiger Galão, Pastel de Nata und immer jemand, den man kennt. Perfekt zum Lernen oder für einen schnellen Kaffee zwischen den Vorlesungen.",
    tip: "Nimm einen Galão und eine Nata – unter 3 €.",
    hours: "Mo–Fr 8–20 Uhr",
  },
  {
    id: "caco", level: 1, cat: "food",
    name: "Caco Factory",
    area: "Zentrum",
    lat: 32.6503, lng: -16.9058,
    desc: "Hier gibt's Bolo do Caco – das typische madeirensische Fladenbrot, frisch vom Stein, mit Knoblauchbutter oder als Sandwich gefüllt. Ein Muss für alle, die die lokale Küche probieren wollen.",
    tip: "Klassisch: Bolo do Caco mit Prego (Rindfleisch).",
    hours: "Täglich 11–23 Uhr",
  },
  {
    id: "formosa", level: 1, cat: "beach",
    name: "Praia Formosa",
    area: "São Martinho",
    lat: 32.6418, lng: -16.9478,
    desc: "Der größte Strand Funchals – dunkler Kies und Sand, eine lange Promenade und richtig gute Sonnenuntergänge. Ideal für einen Nachmittag mit der ganzen Erasmus-Gruppe.",
    tip: "Zum Sonnenuntergang kommen – und Snacks mitbringen.",
    hours: "Immer offen",
  },
  {
    id: "yellowcastle", level: 1, cat: "beach",
    name: "Yellow Castle Praia",
    area: "Zona Velha",
    lat: 32.6467, lng: -16.9013,
    desc: "Kleiner Strand direkt unter dem gelben Forte de São Tiago in der Altstadt. Klares Wasser, Felsen zum Reinspringen und das wohl fotogenste Fort der Stadt im Hintergrund.",
    tip: "Badeschuhe mitnehmen – es ist steinig.",
    hours: "Immer offen",
  },
  {
    id: "numbertwo", level: 1, cat: "bar",
    name: "Bar Number Two",
    area: "Zona Velha",
    lat: 32.6482, lng: -16.9048,
    desc: "Gemütliche Bar mit Tischen draußen, guter Musik und fairen Preisen. Ein beliebter Treffpunkt, bevor es abends weiter in die Altstadt geht.",
    tip: "Frag nach dem Cocktail des Tages.",
    hours: "Täglich ab 17 Uhr",
  },
  {
    id: "reidaponcha", level: 1, cat: "bar",
    name: "Rei da Poncha",
    area: "Zona Velha",
    lat: 32.6478, lng: -16.9036,
    desc: "Poncha ist DAS Getränk Madeiras: Zuckerrohrschnaps, Honig und frischer Zitronensaft, mit dem Caralhinho gequirlt. Hier probierst du die verschiedenen Sorten – von Maracuja bis Tangerine.",
    tip: "Erst eine Poncha Regional, dann Maracujá.",
    hours: "Täglich ab 12 Uhr",
  },

  // ---------------- LEVEL 2 ----------------
  {
    id: "zebra", level: 2, cat: "sweet",
    name: "Zebra Icecream",
    area: "Zentrum",
    lat: 32.6489, lng: -16.9098,
    desc: "Hausgemachtes Eis mit lokalen Sorten wie Maracuja, Banane aus Madeira oder Bolo de Mel. Die perfekte Abkühlung nach einem Tag in der Stadt.",
    tip: "Unbedingt Maracujá probieren.",
    hours: "Täglich 12–22 Uhr",
  },
  {
    id: "maia", level: 2, cat: "cafe",
    name: "Maia Coffee Shop",
    area: "Zentrum",
    lat: 32.6508, lng: -16.9112,
    desc: "Specialty Coffee, helle Einrichtung und richtig gutes Frühstück. Etwas teurer, dafür der beste Flat White in Funchal – sagen zumindest viele.",
    tip: "Brunch am Wochenende – früh kommen!",
    hours: "Täglich 9–18 Uhr",
  },
  {
    id: "toco", level: 2, cat: "beach",
    name: "Praia do Toco",
    area: "Zona Velha Ost",
    lat: 32.6463, lng: -16.8978,
    desc: "Ein versteckter Kiesstrand östlich der Altstadt. Weniger Touristen, ruhiges Wasser und ein toller Blick zurück auf Funchal.",
    tip: "Ideal für einen ruhigen Vormittag.",
    hours: "Immer offen",
  },
  {
    id: "almirante", level: 2, cat: "beach",
    name: "Praia do Almirante Reis",
    area: "Zona Velha",
    lat: 32.6474, lng: -16.9028,
    desc: "Stadtstrand direkt neben der Seilbahn-Station zum Monte. Duschen, Liegeflächen und mittendrin – perfekt für eine spontane Abkühlung.",
    tip: "Danach mit der Seilbahn hoch zum Monte.",
    hours: "Immer offen",
  },
  {
    id: "vendavelha", level: 2, cat: "bar",
    name: "Venda Velha",
    area: "Zona Velha",
    lat: 32.6480, lng: -16.9027,
    desc: "Winzige, urige Bar in der Rua de Santa Maria. Die Poncha hier gilt als eine der besten der Altstadt – abends stehen alle draußen auf der Gasse.",
    tip: "Poncha de Tangerina!",
    hours: "Täglich ab 18 Uhr",
  },
  {
    id: "setemares", level: 2, cat: "cafe",
    name: "Cafeteria Sete Mares",
    area: "Lido",
    lat: 32.6378, lng: -16.9335,
    desc: "Kleines Café mit Blick aufs Meer. Ein klassischer madeirensischer Snack, ein Kaffee und der Atlantik vor der Nase – mehr braucht man nicht.",
    tip: "Bei Sonnenuntergang einen Platz am Fenster holen.",
    hours: "Täglich 8–21 Uhr",
  },
];

/* Demo-"Community": andere Studis aus der Erasmus-Gruppe.
   Nur sichtbar, wenn CONFIG.demoCommunity = true. */
const DEMO_USERS = [
  { name: "Sofia",  country: "🇪🇸", color: "#FF7A1A" },
  { name: "Luca",   country: "🇮🇹", color: "#1FA2D6" },
  { name: "Emma",   country: "🇫🇷", color: "#F15BB5" },
  { name: "Jonas",  country: "🇩🇪", color: "#2BB673" },
  { name: "Ana",    country: "🇵🇱", color: "#9B5DE5" },
  { name: "Mats",   country: "🇳🇱", color: "#FFB000" },
  { name: "Clara",  country: "🇦🇹", color: "#E63946" },
  { name: "Niko",   country: "🇬🇷", color: "#118AB2" },
];

const DEMO_SCORES = { Sofia: 640, Luca: 520, Emma: 455, Jonas: 390, Ana: 310, Mats: 240, Clara: 175, Niko: 95 };

// Pro Ort: Bewertungen (1–5), wer schon da war, und Bildunterschriften der Galerie.
const DEMO_ACTIVITY = {
  gaudeamus:    { ratings: [5,4,5,4,5,4], visitors: ["Sofia","Luca","Emma","Jonas","Ana","Clara"], captions: ["Lernsession ☕","Beste Nata!","Galão-Time","Vor der Vorlesung"] },
  caco:         { ratings: [5,5,4,5],     visitors: ["Sofia","Luca","Mats","Niko"],               captions: ["Bolo do Caco 🤤","Prego no caco","Lunch break"] },
  formosa:      { ratings: [5,5,5,4,5],   visitors: ["Sofia","Emma","Jonas","Ana","Mats"],        captions: ["Sunset 🌅","Beach day","Erasmus crew","Wellen!"] },
  yellowcastle: { ratings: [5,4,5,5],     visitors: ["Luca","Emma","Clara","Sofia"],              captions: ["Das Fort 💛","Klippensprung","So klar!"] },
  numbertwo:    { ratings: [4,4,3,5],     visitors: ["Jonas","Ana","Luca","Niko"],                captions: ["Freitagabend","Cheers 🍻"] },
  reidaponcha:  { ratings: [5,5,4,5,5],   visitors: ["Sofia","Luca","Emma","Jonas","Mats"],       captions: ["Erste Poncha!","Maracujá 🍹","Saúde!","Team Poncha"] },
  zebra:        { ratings: [5,4],         visitors: ["Emma","Ana"],                                captions: ["Maracuja-Eis 🍦"] },
  maia:         { ratings: [4,5,4],       visitors: ["Sofia","Clara","Luca"],                      captions: ["Flat white","Brunch 🥞"] },
  toco:         { ratings: [5],           visitors: ["Sofia"],                                     captions: ["Geheimtipp 🤫"] },
  almirante:    { ratings: [4,4,5],       visitors: ["Luca","Jonas","Emma"],                       captions: ["Kurz abkühlen","Seilbahn-Blick"] },
  vendavelha:   { ratings: [5,5],         visitors: ["Sofia","Luca"],                              captions: ["Tangerina!"] },
  setemares:    { ratings: [],            visitors: [],                                            captions: [] },
};
