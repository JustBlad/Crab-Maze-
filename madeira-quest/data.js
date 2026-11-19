/* =========================================================
   Madeira Quest – Data
   ---------------------------------------------------------
   Coordinates are APPROXIMATE positions in Funchal.
   To fix one: open the place in Google Maps → long-press the
   pin → copy the two numbers (lat, lng) into the place below.
   ========================================================= */

const CONFIG = {
  center: [32.6485, -16.9065],   // Funchal centre
  zoom: 15,
  checkinRadius: 200,            // metres: how close you must be for a "verified" visit
  level2Unlock: 4,               // Level-1 places needed to unlock Level 2
  weeklyGoal: 3,                 // places per week for the weekly challenge
  points: { visit: 50, verified: 25, rating: 10, firstOfDay: 15, weekly: 100 },
  // Example students & photos for presentations.
  // Only used when NO Firebase config is set in firebase-config.js.
  demoCommunity: true,
};

const CATEGORIES = {
  cafe:  { label: "Cafés",     emoji: "☕", color: "#FF7A1A" },
  beach: { label: "Beaches",   emoji: "🏖️", color: "#1FA2D6" },
  bar:   { label: "Bars",      emoji: "🍹", color: "#9B5DE5" },
  food:  { label: "Food",      emoji: "🥪", color: "#2BB673" },
  sweet: { label: "Ice cream", emoji: "🍦", color: "#F15BB5" },
};

const PLACES = [
  // ---------------- LEVEL 1 ----------------
  {
    id: "gaudeamus", level: 1, cat: "cafe",
    name: "Gaudeamus Café",
    area: "City centre",
    lat: 32.6496, lng: -16.9089,
    desc: "The student café: cheap galão, pastel de nata and always someone you know. Perfect for studying or a quick coffee between lectures.",
    tip: "Get a galão and a nata – under €3.",
    hours: "Mon–Fri 8am–8pm",
  },
  {
    id: "caco", level: 1, cat: "food",
    name: "Caco Factory",
    area: "City centre",
    lat: 32.6503, lng: -16.9058,
    desc: "Home of bolo do caco – Madeira's traditional flatbread, fresh off the stone with garlic butter or stuffed as a sandwich. A must if you want to taste the local food.",
    tip: "Classic: bolo do caco with prego (beef).",
    hours: "Daily 11am–11pm",
  },
  {
    id: "formosa", level: 1, cat: "beach",
    name: "Praia Formosa",
    area: "São Martinho",
    lat: 32.6418, lng: -16.9478,
    desc: "Funchal's biggest beach – dark pebbles and sand, a long promenade and seriously good sunsets. Ideal for an afternoon with the whole Erasmus group.",
    tip: "Come for sunset – bring snacks.",
    hours: "Always open",
  },
  {
    id: "yellowcastle", level: 1, cat: "beach",
    name: "Yellow Castle Praia",
    area: "Old Town",
    lat: 32.6467, lng: -16.9013,
    desc: "Small beach right below the yellow fortress in the Old Town. Clear water, rocks to jump from and the most photogenic fort in the city in the background.",
    tip: "Bring water shoes – it's rocky.",
    hours: "Always open",
  },
  {
    id: "numbertwo", level: 1, cat: "bar",
    name: "Bar Number Two",
    area: "Old Town",
    lat: 32.6482, lng: -16.9048,
    desc: "Cosy bar with outdoor tables, good music and fair prices. A popular meeting point before heading on into the Old Town at night.",
    tip: "Ask for the cocktail of the day.",
    hours: "Daily from 5pm",
  },
  {
    id: "reidaponcha", level: 1, cat: "bar",
    name: "Rei da Poncha",
    area: "Old Town",
    lat: 32.6478, lng: -16.9036,
    desc: "Poncha is THE drink of Madeira: sugarcane rum, honey and fresh lemon juice, whisked with a caralhinho. Try the different flavours here – from passion fruit to tangerine.",
    tip: "Start with a poncha regional, then maracujá.",
    hours: "Daily from 12pm",
  },

  // ---------------- LEVEL 2 ----------------
  {
    id: "zebra", level: 2, cat: "sweet",
    name: "Zebra Icecream",
    area: "City centre",
    lat: 32.6489, lng: -16.9098,
    desc: "Homemade ice cream with local flavours like passion fruit, Madeira banana or bolo de mel. The perfect cool-down after a day in the city.",
    tip: "You have to try maracujá.",
    hours: "Daily 12pm–10pm",
  },
  {
    id: "maia", level: 2, cat: "cafe",
    name: "Maia Coffee Shop",
    area: "City centre",
    lat: 32.6508, lng: -16.9112,
    desc: "Specialty coffee, bright interior and a really good breakfast. A bit pricier, but many say it has the best flat white in Funchal.",
    tip: "Weekend brunch – come early!",
    hours: "Daily 9am–6pm",
  },
  {
    id: "toco", level: 2, cat: "beach",
    name: "Praia do Toco",
    area: "East of Old Town",
    lat: 32.6463, lng: -16.8978,
    desc: "A hidden pebble beach east of the Old Town. Fewer tourists, calm water and a great view back over Funchal.",
    tip: "Ideal for a quiet morning.",
    hours: "Always open",
  },
  {
    id: "almirante", level: 2, cat: "beach",
    name: "Praia do Almirante Reis",
    area: "Old Town",
    lat: 32.6474, lng: -16.9028,
    desc: "City beach right next to the cable car station up to Monte. Showers, space to lie down and right in the middle of everything – perfect for a spontaneous swim.",
    tip: "Afterwards take the cable car up to Monte.",
    hours: "Always open",
  },
  {
    id: "vendavelha", level: 2, cat: "bar",
    name: "Venda Velha",
    area: "Old Town",
    lat: 32.6480, lng: -16.9027,
    desc: "Tiny, rustic bar on Rua de Santa Maria. Its poncha is said to be one of the best in the Old Town – at night everyone stands outside in the alley.",
    tip: "Poncha de tangerina!",
    hours: "Daily from 6pm",
  },
  {
    id: "setemares", level: 2, cat: "cafe",
    name: "Cafeteria Sete Mares",
    area: "Lido",
    lat: 32.6378, lng: -16.9335,
    desc: "Small café with a view of the sea. A classic Madeiran snack, a coffee and the Atlantic in front of you – that's all you need.",
    tip: "Grab a window seat at sunset.",
    hours: "Daily 8am–9pm",
  },
];

/* ---------- Demo community (only without Firebase) ---------- */
const DEMO_USERS = [
  { name: "Sofia",  country: "🇪🇸", color: "#FF7A1A", points: 640 },
  { name: "Luca",   country: "🇮🇹", color: "#1FA2D6", points: 520 },
  { name: "Emma",   country: "🇫🇷", color: "#F15BB5", points: 455 },
  { name: "Jonas",  country: "🇩🇪", color: "#2BB673", points: 390 },
  { name: "Ana",    country: "🇵🇱", color: "#9B5DE5", points: 310 },
  { name: "Mats",   country: "🇳🇱", color: "#FFB000", points: 240 },
  { name: "Clara",  country: "🇦🇹", color: "#E63946", points: 175 },
  { name: "Niko",   country: "🇬🇷", color: "#118AB2", points: 95 },
];

// Per place: ratings (1–5), who has been there, and gallery captions.
const DEMO_ACTIVITY = {
  gaudeamus:    { ratings: [5,4,5,4,5,4], visitors: ["Sofia","Luca","Emma","Jonas","Ana","Clara"], captions: ["Study session ☕","Best nata!","Galão time","Before class"] },
  caco:         { ratings: [5,5,4,5],     visitors: ["Sofia","Luca","Mats","Niko"],               captions: ["Bolo do caco 🤤","Prego no caco","Lunch break"] },
  formosa:      { ratings: [5,5,5,4,5],   visitors: ["Sofia","Emma","Jonas","Ana","Mats"],        captions: ["Sunset 🌅","Beach day","Erasmus crew","Waves!"] },
  yellowcastle: { ratings: [5,4,5,5],     visitors: ["Luca","Emma","Clara","Sofia"],              captions: ["The fort 💛","Cliff jump","So clear!"] },
  numbertwo:    { ratings: [4,4,3,5],     visitors: ["Jonas","Ana","Luca","Niko"],                captions: ["Friday night","Cheers 🍻"] },
  reidaponcha:  { ratings: [5,5,4,5,5],   visitors: ["Sofia","Luca","Emma","Jonas","Mats"],       captions: ["First poncha!","Maracujá 🍹","Saúde!","Team poncha"] },
  zebra:        { ratings: [5,4],         visitors: ["Emma","Ana"],                                captions: ["Passion fruit 🍦"] },
  maia:         { ratings: [4,5,4],       visitors: ["Sofia","Clara","Luca"],                      captions: ["Flat white","Brunch 🥞"] },
  toco:         { ratings: [5],           visitors: ["Sofia"],                                     captions: ["Hidden gem 🤫"] },
  almirante:    { ratings: [4,4,5],       visitors: ["Luca","Jonas","Emma"],                       captions: ["Quick swim","Cable car view"] },
  vendavelha:   { ratings: [5,5],         visitors: ["Sofia","Luca"],                              captions: ["Tangerina!"] },
  setemares:    { ratings: [],            visitors: [],                                            captions: [] },
};
