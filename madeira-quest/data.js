/* =========================================================
   Madeira Quest – Data
   ---------------------------------------------------------
   Coordinates are exact (taken from the Google Maps links).
   New place: open it in Google Maps, the link contains
   !3d<lat>!4d<lng> – copy those two numbers.
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
  // Optional: free key from https://cloud.maptiler.com (no credit card) for the
  // sharpest, most colourful satellite map. Empty = free Esri imagery.
  maptilerKey: "iATCxHYYgZaPl2865zvK",
  // Google Maps (best look). Paste your Google Maps JavaScript API key here.
  // Empty = the MapTiler/Esri map above is used instead.
  googleMapsKey: "",
  googleMapId: "",   // optional: your own Map ID from Google Cloud (else Google's demo ID)
};

const CATEGORIES = {
  cafe:  { label: "Cafés",     icon: "coffee",   color: "#C8642E" },  // terracotta
  beach: { label: "Beaches",   icon: "waves",    color: "#1E7FA8" },  // ocean blue
  bar:   { label: "Bars",      icon: "martini",  color: "#8E2C48" },  // wine red
  food:  { label: "Food",      icon: "utensils", color: "#5E7B3A" },  // olive
  sweet: { label: "Ice cream", icon: "icecream", color: "#E5746A" },  // coral
};

/* Photos for the place header (up to 3): put image files into the img/ folder
   and list them per place, e.g.
     photos: ["img/caco-1.jpg", "img/caco-2.jpg"], photoCredit: "Photo: Lena",
   Only use photos you took yourself or are allowed to use (e.g. CC-licensed
   from Wikimedia Commons – then put the author in photoCredit).
   Without photos, the illustrations are shown. */
const PLACES = [
  // ---------------- LEVEL 1 ----------------
  {
    id: "gaudeamus", level: 1, cat: "cafe",
    name: "Gaudeamus Café",
    area: "Penteada (University)",
    lat: 32.6592854, lng: -16.9250331,
    desc: "The café at the university campus in Penteada: cheap galão, pastel de nata and always someone you know. Perfect for studying or a quick coffee between lectures.",
    tip: "Get a galão and a nata – under €3.",
    hours: "Mon–Fri 8am–8pm",
  },
  {
    id: "caco", level: 1, cat: "food",
    name: "Caco Factory",
    area: "City centre",
    lat: 32.6478369, lng: -16.9058253,
    desc: "Home of bolo do caco – Madeira's traditional flatbread, fresh off the stone with garlic butter or stuffed as a sandwich. A must if you want to taste the local food.",
    tip: "Classic: bolo do caco with prego (beef).",
    hours: "Daily 11am–11pm",
  },
  {
    id: "formosa", level: 1, cat: "beach",
    name: "Praia Formosa",
    area: "São Martinho",
    lat: 32.6382596, lng: -16.9497874,
    desc: "Funchal's biggest beach – dark pebbles and sand, a long promenade and seriously good sunsets. Ideal for an afternoon with the whole Erasmus group.",
    tip: "Come for sunset – bring snacks.",
    hours: "Always open",
  },
  {
    id: "yellowcastle", level: 1, cat: "beach",
    name: "Yellow Castle Praia",
    area: "Old Town",
    lat: 32.6466719, lng: -16.8985478,
    desc: "Small beach right below the yellow Forte de São Tiago at the end of the Old Town. Clear water, rocks to jump from and the most photogenic fort in the city in the background.",
    tip: "Bring water shoes – it's rocky.",
    hours: "Always open",
  },
  {
    id: "numbertwo", level: 1, cat: "bar",
    name: "Bar Number Two",
    area: "Old Town",
    lat: 32.6477622, lng: -16.9011962,
    desc: "Cosy bar with outdoor tables, good music and fair prices. A popular meeting point before heading on into the Old Town at night.",
    tip: "Ask for the cocktail of the day.",
    hours: "Daily from 5pm",
  },
  {
    id: "reidaponcha", level: 1, cat: "bar",
    name: "Rei da Poncha",
    area: "City centre",
    lat: 32.6478852, lng: -16.9060718,
    desc: "Poncha is THE drink of Madeira: sugarcane rum, honey and fresh lemon juice, whisked with a caralhinho. Try the different flavours here – from passion fruit to tangerine.",
    tip: "Start with a poncha regional, then maracujá.",
    hours: "Daily from 12pm",
  },

  // ---------------- LEVEL 2 ----------------
  {
    id: "zebra", level: 2, cat: "sweet",
    name: "Zebra Icecream",
    area: "City centre",
    lat: 32.6487647, lng: -16.9091029,
    desc: "Homemade ice cream with local flavours like passion fruit, Madeira banana or bolo de mel. The perfect cool-down after a day in the city.",
    tip: "You have to try maracujá.",
    hours: "Daily 12pm–10pm",
  },
  {
    id: "maia", level: 2, cat: "cafe",
    name: "Maia Coffee Shop",
    area: "City centre",
    lat: 32.6489796, lng: -16.9101402,
    desc: "Specialty coffee, bright interior and a really good breakfast. A bit pricier, but many say it has the best flat white in Funchal.",
    tip: "Weekend brunch – come early!",
    hours: "Daily 9am–6pm",
  },
  {
    id: "toco", level: 2, cat: "beach",
    name: "Praia do Toco",
    area: "East of Old Town",
    lat: 32.6471045, lng: -16.8955779,
    desc: "A hidden pebble beach east of the Old Town. Fewer tourists, calm water and a great view back over Funchal.",
    tip: "Ideal for a quiet morning.",
    hours: "Always open",
  },
  {
    id: "almirante", level: 2, cat: "beach",
    name: "Praia do Almirante Reis",
    area: "Old Town",
    lat: 32.6464862, lng: -16.9009611,
    desc: "City beach right next to the cable car station up to Monte. Showers, space to lie down and right in the middle of everything – perfect for a spontaneous swim.",
    tip: "Afterwards take the cable car up to Monte.",
    hours: "Always open",
  },
  {
    id: "vendavelha", level: 2, cat: "bar",
    name: "Venda Velha",
    area: "Old Town",
    lat: 32.6478069, lng: -16.9007364,
    desc: "Tiny, rustic bar on Rua de Santa Maria. Its poncha is said to be one of the best in the Old Town – at night everyone stands outside in the alley.",
    tip: "Poncha de tangerina!",
    hours: "Daily from 6pm",
  },
  {
    id: "setemares", level: 2, cat: "cafe",
    name: "Cafeteria Sete Mares",
    area: "West Funchal",
    lat: 32.6435589, lng: -16.9146699,
    desc: "Small café in west Funchal, close to the sea. A classic Madeiran snack, a coffee and the Atlantic in front of you – that's all you need.",
    tip: "Grab a window seat at sunset.",
    hours: "Daily 8am–9pm",
  },
];

/* ---------- Demo community (only without Firebase) ---------- */
const DEMO_USERS = [
  { name: "Sofia",  country: "🇪🇸", color: "#F26B1D", points: 640 },
  { name: "Luca",   country: "🇮🇹", color: "#1E7FA8", points: 520 },
  { name: "Emma",   country: "🇫🇷", color: "#E5746A", points: 455 },
  { name: "Jonas",  country: "🇩🇪", color: "#5E7B3A", points: 390 },
  { name: "Ana",    country: "🇵🇱", color: "#8E2C48", points: 310 },
  { name: "Mats",   country: "🇳🇱", color: "#C8642E", points: 240 },
  { name: "Clara",  country: "🇦🇹", color: "#0E2A47", points: 175 },
  { name: "Niko",   country: "🇬🇷", color: "#3D8C8C", points: 95 },
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
