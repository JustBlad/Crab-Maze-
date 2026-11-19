/* =========================================================
   Madeira Quest – App
   Plain HTML/CSS/JS, no build tools.
   - Demo mode: everything stays in the browser (localStorage),
     other students are example data.
   - Live mode (firebase-config.js filled in): visits, ratings,
     photos and points are shared via Firebase Firestore.
   ========================================================= */
(() => {
  "use strict";

  // ---------- State ----------
  const STORE_KEY = "madeiraQuest.v1";
  const LIVE = typeof FIREBASE_CONFIG !== "undefined" && !!FIREBASE_CONFIG.apiKey;
  const FB_VERSION = "10.12.2";

  const defaultState = () => ({
    user: null,            // { name, color }
    visits: {},            // placeId -> { photo, ts, verified, shared, caption }
    ratings: {},           // placeId -> 1..5
    favorites: [],
    points: 0,
    challengeWeeks: [],
    geoAsked: false,
    filter: "all",
  });

  let state = load();
  let userPos = null;      // { lat, lng, acc }
  let geoWatchId = null;
  let map, meMarker, accCircle;
  const markers = {};
  let selectedId = null;
  let pendingUpload = null;
  let lastRoute = null, prevRoute = null;

  // Other students (never includes me). Filled from demo data or Firebase.
  const community = {
    ratings: {},   // placeId -> [values]
    visitors: {},  // placeId -> [{ uid, name, color, flag, caption, ts }]
    users: [],     // [{ uid, name, color, flag, points }]
  };
  let db = null, uid = null;
  const photoCache = {}; // placeId -> [{ uid, name, color, caption, photo }]

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { /* ignore */ }
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); return true; }
    catch (e) { toast("Phone storage is full – the photo couldn't be saved locally."); return false; }
  }

  // ---------- Helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = (id) => PLACES.find((p) => p.id === id);
  const isVisited = (id) => !!state.visits[id];
  const level1Done = () => PLACES.filter((p) => p.level === 1 && isVisited(p.id)).length;
  const isUnlocked = (p) => p.level === 1 || level1Done() >= CONFIG.level2Unlock;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const safeColor = (c) => (/^#[0-9a-fA-F]{3,8}$/.test(c || "") ? c : "#999");
  const safeImg = (src) => (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src || "") ? src : "");

  function avgRating(id) {
    const r = (community.ratings[id] || []).slice();
    if (state.ratings[id]) r.push(state.ratings[id]);
    if (!r.length) return { avg: 0, count: 0 };
    return { avg: r.reduce((a, b) => a + b, 0) / r.length, count: r.length };
  }
  function visitorsOf(id) {
    const v = (community.visitors[id] || []).slice();
    if (isVisited(id) && state.user) v.push({ uid: uid || "me", name: state.user.name, color: state.user.color, me: true });
    return v;
  }
  function starsHTML(v) {
    let s = "";
    for (let i = 1; i <= 5; i++) s += `<span class="${v >= i - 0.25 ? "" : "off"}">★</span>`;
    return `<span class="stars" aria-label="${v.toFixed(1)} out of 5">${s}</span>`;
  }
  function haversine(a, b) {
    const R = 6371000, toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const distTo = (p) => (userPos ? haversine(userPos, p) : null);
  function fmtDist(m) {
    if (m == null) return "–";
    if (m < 1000) return `${Math.round(m / 10) * 10} m`;
    return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
  }
  const walkMin = (m) => (m == null ? "" : `${Math.max(1, Math.round(m / 80))} min walk`);
  const initials = (n) => (n || "?").trim().charAt(0).toUpperCase();
  const avatarHTML = (name, color, cls = "") => `<span class="avatar ${cls}" style="background:${safeColor(color)}">${esc(initials(name))}</span>`;
  const avatarsHTML = (list, n) => `<span class="avatars">${list.slice(-n).map((v) => avatarHTML(v.name, v.color)).join("")}</span>`;
  const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  const routeURL = (p) => `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${encodeURIComponent(p.name + ", Funchal, Madeira")}`;

  function streak() {
    const days = new Set(Object.values(state.visits).map((v) => dayKey(v.ts)));
    if (!days.size) return { n: 0, today: false };
    let n = 0; const d = new Date();
    const today = days.has(dayKey(d));
    if (!today) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return { n, today };
  }
  function startOfWeek() {
    const d = new Date(); const day = (d.getDay() + 6) % 7; // Mon = 0
    d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); return d;
  }
  function endOfWeek() { const d = startOfWeek(); d.setDate(d.getDate() + 7); return new Date(d.getTime() - 1); }
  const weekVisits = () => { const s = startOfWeek().getTime(); return Object.values(state.visits).filter((v) => v.ts >= s).length; };
  function countdown(to) {
    const ms = Math.max(0, to - Date.now());
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
  }

  // ---------- Art (illustrated placeholder pictures) ----------
  const LOGO = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="lg-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FD3F2"/><stop offset="1" stop-color="#2FA6D9"/></linearGradient>
    <linearGradient id="lg-land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7BCB4F"/><stop offset="1" stop-color="#3E9B3A"/></linearGradient></defs>
    <ellipse cx="60" cy="80" rx="54" ry="26" fill="url(#lg-sea)"/>
    <path d="M14 82c6-14 18-20 30-22 8-10 20-14 32-10 12 2 22 10 30 22-10 10-28 14-46 14S20 90 14 82Z" fill="url(#lg-land)"/>
    <path d="M38 68l10-14 8 10 8-16 12 20" fill="none" stroke="#2E7D32" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M30 86c10 3 24 4 34 3" stroke="#fff" stroke-opacity=".6" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M60 8c-13 0-23 10-23 23 0 17 23 39 23 39s23-22 23-39C83 18 73 8 60 8Z" fill="#FF7A1A"/>
    <circle cx="60" cy="31" r="9" fill="#fff"/></svg>`;

  const PALETTES = {
    beach: [["#8FD8F5", "#FFE3B8"], ["#FFB27A", "#FFD9A8"], ["#6EC6EC", "#E9F7FF"], ["#FF9E7A", "#FFE0C2"]],
    cafe:  [["#FFE1C7", "#FFC79A"], ["#F6D5B8", "#E7B48A"], ["#FFEBD9", "#FFB98A"], ["#FDE4CF", "#F3B98C"]],
    bar:   [["#3B2C5E", "#7B4FB8"], ["#2A2347", "#C0568C"], ["#432B6B", "#FF7A1A"], ["#251F3D", "#5E8BFF"]],
    food:  [["#E5F6EA", "#BFE6C8"], ["#FFF1DC", "#F8D29A"], ["#E9F7EE", "#A9DDB8"], ["#FFF4E6", "#FFC98F"]],
    sweet: [["#FFE3F1", "#FFC1DD"], ["#FFF0E0", "#FFD0E4"], ["#E6F4FF", "#FFD6EA"], ["#FFF5D6", "#FFC7DF"]],
  };
  let artSeq = 0;
  function placeArt(p, v = 0) {
    const pal = PALETTES[p.cat][v % 4];
    const gid = `g${p.id}${v}_${artSeq++}`;
    const bg = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal[0]}"/><stop offset="1" stop-color="${pal[1]}"/></linearGradient></defs>
      <rect width="200" height="200" fill="url(#${gid})"/>`;
    const shift = (v * 23) % 60 - 30;
    let fg = "";
    if (p.cat === "beach") {
      fg = `<circle cx="${140 + shift / 2}" cy="${60 + (v % 2) * 10}" r="22" fill="#FFD45C"/>
        <path d="M0 120 C40 110 80 128 120 118 S180 110 200 116 V200 H0Z" fill="#2FA6D9"/>
        <path d="M0 132 C40 124 80 140 120 130 S180 124 200 128" stroke="#fff" stroke-opacity=".6" stroke-width="3" fill="none"/>
        <path d="M0 160 C50 150 110 168 200 150 V200 H0Z" fill="#E9C98F"/>
        ${v % 2 ? `<path d="M40 150 l20 -50 l4 0 l-14 50z" fill="#8A5A3A"/><path d="M20 104 Q62 70 100 102 Z" fill="#FF7A1A"/>` : `<rect x="${130 + shift / 3}" y="78" width="30" height="40" fill="#FFC52E" rx="3"/><rect x="${126 + shift / 3}" y="72" width="38" height="8" fill="#E8A800"/>`}`;
    } else if (p.cat === "cafe") {
      fg = `<ellipse cx="100" cy="150" rx="62" ry="12" fill="#000" opacity=".08"/>
        <path d="M58 92 h76 v34 a30 30 0 0 1 -30 30 h-16 a30 30 0 0 1 -30 -30z" fill="#fff"/>
        <path d="M134 100 h8 a14 14 0 0 1 0 28 h-10" fill="none" stroke="#fff" stroke-width="8"/>
        <ellipse cx="96" cy="94" rx="36" ry="7" fill="#8B5A33"/>
        <path d="M84 78 c-8 -10 8 -14 0 -26 M100 76 c-8 -10 8 -14 0 -26 M116 78 c-8 -10 8 -14 0 -26" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>
        ${v % 2 ? `<circle cx="${40 + shift / 3}" cy="150" r="14" fill="#F4B740"/><circle cx="${40 + shift / 3}" cy="150" r="9" fill="#E38B1F"/>` : ""}`;
    } else if (p.cat === "bar") {
      fg = `${[...Array(12)].map((_, i) => `<circle cx="${(i * 47 + v * 31) % 200}" cy="${(i * 29 + v * 17) % 80}" r="${1 + (i % 3)}" fill="#fff" opacity=".6"/>`).join("")}
        <path d="M60 70 h80 l-40 46z" fill="#FFB347"/>
        <path d="M60 70 h80 l-40 46z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
        <rect x="97" y="114" width="6" height="34" fill="#fff"/><rect x="78" y="146" width="44" height="6" rx="3" fill="#fff"/>
        <circle cx="132" cy="66" r="11" fill="#FFE14D"/><path d="M118 44 l-22 32" stroke="#FF5E7E" stroke-width="4" stroke-linecap="round"/>`;
    } else if (p.cat === "food") {
      fg = `<ellipse cx="100" cy="150" rx="70" ry="12" fill="#000" opacity=".08"/>
        <ellipse cx="100" cy="118" rx="62" ry="30" fill="#D9A15A"/>
        <ellipse cx="100" cy="110" rx="58" ry="26" fill="#F2C27B"/>
        <path d="M60 106 q40 -18 80 0" stroke="#C98A3E" stroke-width="3" fill="none" opacity=".6"/>
        <circle cx="80" cy="104" r="3" fill="#C98A3E"/><circle cx="118" cy="100" r="3" fill="#C98A3E"/><circle cx="104" cy="116" r="3" fill="#C98A3E"/>
        ${v % 2 ? `<path d="M50 118 q50 18 100 0" stroke="#2BB673" stroke-width="7" fill="none" stroke-linecap="round"/>` : ""}`;
    } else {
      fg = `<path d="M78 98 l22 64 l22 -64z" fill="#E7A65A"/>
        <path d="M84 104 l32 0 M88 116 l24 0 M92 128 l16 0" stroke="#C78433" stroke-width="2"/>
        <circle cx="100" cy="84" r="26" fill="${["#FFD45C", "#FF9EC4", "#8BE0B8", "#FFFFFF"][v % 4]}"/>
        <circle cx="86" cy="70" r="18" fill="${["#FF9EC4", "#FFD45C", "#FFB27A", "#C7A6FF"][v % 4]}"/>
        <circle cx="114" cy="70" r="18" fill="${["#8BE0B8", "#FFFFFF", "#FF9EC4", "#FFD45C"][v % 4]}"/>`;
    }
    return `<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${bg}${fg}</svg>`;
  }

  // ---------- Toast / modal / confetti ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
  }
  function openModal(html) {
    const m = $("#modal"); m.innerHTML = `<div class="modal-card">${html}</div>`; m.hidden = false;
    m.onclick = (e) => { if (e.target === m) closeModal(); };
    return m;
  }
  function closeModal() { const m = $("#modal"); m.hidden = true; m.innerHTML = ""; }
  const modalOpen = () => !$("#modal").hidden;
  function confetti() {
    const c = document.createElement("div"); c.className = "confetti";
    const colors = ["#FF7A1A", "#FFB000", "#2BB673", "#1FA2D6", "#F15BB5", "#9B5DE5"];
    for (let i = 0; i < 70; i++) {
      const s = document.createElement("i");
      s.style.left = Math.random() * 100 + "%";
      s.style.background = colors[i % colors.length];
      s.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
      s.style.animationDelay = Math.random() * 0.4 + "s";
      c.appendChild(s);
    }
    $("#app").appendChild(c); setTimeout(() => c.remove(), 3800);
  }

  // =========================================================
  //  COMMUNITY BACKEND (demo data or Firebase)
  // =========================================================
  function buildDemoCommunity() {
    if (!CONFIG.demoCommunity) return;
    const find = (n) => DEMO_USERS.find((u) => u.name === n) || { name: n, color: "#999", country: "" };
    PLACES.forEach((p) => {
      const a = DEMO_ACTIVITY[p.id] || { ratings: [], visitors: [], captions: [] };
      community.ratings[p.id] = a.ratings.slice();
      community.visitors[p.id] = a.visitors.map((n, i) => {
        const u = find(n);
        return { uid: "demo-" + n, name: n, color: u.color, flag: u.country, ts: 0, caption: a.captions.length ? a.captions[i % a.captions.length] : "" };
      });
    });
    community.users = DEMO_USERS.map((u) => ({ uid: "demo-" + u.name, name: u.name, color: u.color, flag: u.country, points: u.points }));
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn't load " + src));
      document.head.appendChild(s);
    });
  }

  async function initFirebase() {
    const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
    await loadScript(base + "firebase-app-compat.js");
    await Promise.all([loadScript(base + "firebase-auth-compat.js"), loadScript(base + "firebase-firestore-compat.js")]);
    firebase.initializeApp(FIREBASE_CONFIG);
    const cred = await firebase.auth().signInAnonymously();
    uid = cred.user.uid;
    db = firebase.firestore();

    db.collection("visits").onSnapshot((snap) => {
      const v = {};
      snap.forEach((d) => {
        const x = d.data(); if (x.uid === uid) return;
        (v[x.placeId] = v[x.placeId] || []).push({ uid: x.uid, name: x.name, color: x.color, ts: x.ts || 0 });
      });
      Object.values(v).forEach((list) => list.sort((a, b) => a.ts - b.ts));
      community.visitors = v; onCommunityChange();
    }, (e) => console.warn("visits", e));

    db.collection("ratings").onSnapshot((snap) => {
      const r = {};
      snap.forEach((d) => { const x = d.data(); if (x.uid !== uid) (r[x.placeId] = r[x.placeId] || []).push(x.value); });
      community.ratings = r; onCommunityChange();
    }, (e) => console.warn("ratings", e));

    db.collection("users").orderBy("points", "desc").limit(100).onSnapshot((snap) => {
      const u = [];
      snap.forEach((d) => { const x = d.data(); if (d.id !== uid) u.push({ uid: d.id, name: x.name, color: x.color, flag: "", points: x.points || 0 }); });
      community.users = u; onCommunityChange();
    }, (e) => console.warn("users", e));

    syncUser();
    // Upload visits made while offline / before Firebase loaded
    Object.keys(state.visits).forEach((id) => { if (!state.visits[id].synced) pushVisit(id).catch(() => {}); });
    Object.keys(state.ratings).forEach(pushRating);
  }

  async function fetchPhotos(placeId) {
    if (!db) return [];
    const snap = await db.collection("photos").where("placeId", "==", placeId).get();
    const list = [];
    snap.forEach((d) => { const x = d.data(); if (x.uid !== uid) list.push(x); });
    list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    photoCache[placeId] = list;
    return list;
  }

  function syncUser() {
    if (!db || !uid || !state.user) return;
    db.collection("users").doc(uid).set({
      name: state.user.name, color: state.user.color, points: Math.round(state.points),
      visited: Object.keys(state.visits).length, updatedAt: Date.now(),
    }).catch((e) => console.warn("user sync", e));
  }
  async function pushVisit(placeId, photoData) {
    if (!db || !uid) return;
    const v = state.visits[placeId], key = `${placeId}_${uid}`;
    const base = { placeId, uid, name: state.user.name, color: state.user.color, ts: v.ts };
    await db.collection("visits").doc(key).set({ ...base, verified: !!v.verified });
    const photo = photoData || v.photo;
    if (v.shared && photo) await db.collection("photos").doc(key).set({ ...base, photo, caption: v.caption || "" });
    v.synced = true; save();
    syncUser();
  }
  function pushRating(placeId) {
    if (!db || !uid || !state.ratings[placeId]) return;
    db.collection("ratings").doc(`${placeId}_${uid}`).set({ placeId, uid, value: state.ratings[placeId], ts: Date.now() })
      .catch((e) => console.warn("rating", e));
    syncUser();
  }
  async function deleteMyData() {
    if (!db || !uid) return;
    const jobs = [];
    PLACES.forEach((p) => ["ratings", "photos", "visits"].forEach((c) => jobs.push(db.collection(c).doc(`${p.id}_${uid}`).delete().catch(() => {}))));
    jobs.push(db.collection("users").doc(uid).delete().catch(() => {}));
    await Promise.all(jobs);
  }

  let changeTimer;
  function onCommunityChange() {
    clearTimeout(changeTimer);
    changeTimer = setTimeout(() => {
      if (map) refreshMarkers();
      if (selectedId) renderSheet(selectedId, true);
      if (modalOpen() || !state.user) return; // don't disturb the user mid-action
      const [, page, arg] = (location.hash || "#/map").split("/");
      if (page === "quests") keepScroll("#view-quests", renderQuests);
      else if (page === "profile") keepScroll("#view-profile", renderProfile);
      else if (page === "place" && arg) keepScroll("#view-place", () => renderPlace(arg, true));
    }, 250);
  }
  function keepScroll(sel, fn) { const el = $(sel), y = el.scrollTop; fn(); el.scrollTop = y; }

  // ---------- Geolocation ----------
  function startGeo(userInitiated) {
    if (!("geolocation" in navigator)) { if (userInitiated) toast("Your browser doesn't support GPS."); return; }
    state.geoAsked = true; save();
    if (geoWatchId != null) { if (userInitiated && userPos) centerOnMe(); return; }
    let first = true;
    geoWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
        updateMe();
        if (first && userInitiated) centerOnMe();
        first = false;
        refreshDistances();
      },
      (err) => {
        if (geoWatchId != null) navigator.geolocation.clearWatch(geoWatchId);
        geoWatchId = null;
        $("#locateBtn").classList.remove("active");
        if (err.code === 1) toast("Location blocked – you can allow it in your browser settings.");
        else if (userInitiated) toast("Couldn't find your location.");
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }
  function updateMe() {
    if (!map || !userPos) return;
    const ll = [userPos.lat, userPos.lng];
    if (!meMarker) {
      meMarker = L.marker(ll, { icon: L.divIcon({ className: "", html: '<div class="mq-me"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }), zIndexOffset: 1000, interactive: false }).addTo(map);
      accCircle = L.circle(ll, { radius: userPos.acc, color: "#2F80ED", weight: 1, fillOpacity: 0.08, interactive: false }).addTo(map);
    } else { meMarker.setLatLng(ll); accCircle.setLatLng(ll).setRadius(userPos.acc); }
    $("#locateBtn").classList.add("active");
  }
  function centerOnMe() {
    if (!userPos || !map) return;
    const funchal = L.latLngBounds([32.60, -17.05], [32.72, -16.80]);
    if (funchal.contains([userPos.lat, userPos.lng])) map.flyTo([userPos.lat, userPos.lng], 16, { duration: 0.8 });
    else { toast("You're not in Funchal right now – showing the city anyway 🙂"); map.flyTo(CONFIG.center, CONFIG.zoom); }
  }
  function refreshDistances() {
    if (selectedId) renderSheet(selectedId, true);
    const h = location.hash;
    if (h.startsWith("#/place/")) {
      const el = $("#distVal"), p = byId(h.split("/")[2]);
      if (el && p) { el.textContent = fmtDist(distTo(p)); $("#distSub").textContent = walkMin(distTo(p)) || "Distance"; updateGpsState(p); }
    }
  }
  function updateGpsState(p) {
    const el = $("#gpsState"); if (!el) return;
    const d = distTo(p);
    if (d == null) {
      el.className = "gps-state";
      el.innerHTML = `📍 <a href="#" id="gpsAsk" style="text-decoration:underline">Turn on location</a> for the on-site bonus (+${CONFIG.points.verified})`;
      $("#gpsAsk").onclick = (e) => { e.preventDefault(); startGeo(true); };
    } else if (d <= CONFIG.checkinRadius) {
      el.className = "gps-state ok"; el.textContent = `✓ You're here – verified visit (+${CONFIG.points.verified} bonus)`;
    } else {
      el.className = "gps-state"; el.textContent = `You're ${fmtDist(d)} away. Upload on site for +${CONFIG.points.verified} bonus points.`;
    }
  }

  // ---------- Map ----------
  function initMap() {
    map = L.map("map", { zoomControl: false }).setView(CONFIG.center, CONFIG.zoom);
    L.tileLayer("https://{s}.basemap.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19, subdomains: "abcd",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);
    map.on("click", closeSheet);
    PLACES.forEach((p) => {
      markers[p.id] = L.marker([p.lat, p.lng], { icon: markerIcon(p) }).addTo(map)
        .on("click", (e) => { L.DomEvent.stopPropagation(e); selectPlace(p.id); });
    });
    renderChips();
    applyFilter();
    $("#locateBtn").onclick = () => { if (userPos) centerOnMe(); else startGeo(true); };
  }
  function markerIcon(p) {
    const c = CATEGORIES[p.cat], { avg } = avgRating(p.id);
    const cls = ["mq-marker", isVisited(p.id) && "visited", !isUnlocked(p) && "locked", selectedId === p.id && "selected"].filter(Boolean).join(" ");
    const label = !isUnlocked(p) ? "🔒" : avg ? `★ ${avg.toFixed(1)}` : "new";
    return L.divIcon({
      className: "", iconSize: [44, 54], iconAnchor: [22, 50],
      html: `<div class="${cls}" style="--c:${c.color}"><div class="mq-pin"></div><div class="mq-pin-ic">${c.emoji}</div><div class="mq-rating">${label}</div></div>`,
    });
  }
  function refreshMarkers() { PLACES.forEach((p) => markers[p.id] && markers[p.id].setIcon(markerIcon(p))); }
  function renderChips() {
    const chips = [["all", "All", "✨"], ...Object.entries(CATEGORIES).map(([k, c]) => [k, c.label, c.emoji])];
    $("#chips").innerHTML = chips.map(([k, l, e]) => `<button class="chip ${state.filter === k ? "active" : ""}" data-f="${k}">${e} ${l}</button>`).join("");
    $("#chips").onclick = (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      state.filter = b.dataset.f; save(); renderChips(); applyFilter(); closeSheet();
    };
  }
  function applyFilter() {
    PLACES.forEach((p) => {
      const show = state.filter === "all" || p.cat === state.filter, m = markers[p.id];
      if (show && !map.hasLayer(m)) m.addTo(map);
      if (!show && map.hasLayer(m)) map.removeLayer(m);
    });
  }
  function selectPlace(id) {
    const prev = selectedId; selectedId = id;
    if (prev && markers[prev]) markers[prev].setIcon(markerIcon(byId(prev)));
    markers[id].setIcon(markerIcon(byId(id)));
    const p = byId(id);
    map.panTo([p.lat - 0.0012, p.lng], { animate: true });
    renderSheet(id);
  }
  function renderSheet(id, silent) {
    const p = byId(id), c = CATEGORIES[p.cat], { avg, count } = avgRating(id), v = visitorsOf(id), d = distTo(p);
    const unlocked = isUnlocked(p), visit = state.visits[id];
    $("#sheet").innerHTML = `
      <button class="sheet-close" aria-label="Close">✕</button>
      <div class="sheet-card">
        <div class="sheet-thumb ph">${visit && visit.photo ? `<img src="${visit.photo}" alt="">` : placeArt(p, 0)}</div>
        <div class="sheet-body">
          <span class="tag ${visit ? "green" : !unlocked ? "grey" : ""}" style="align-self:flex-start">${visit ? "✓ Visited" : !unlocked ? "🔒 Level " + p.level : c.emoji + " " + c.label}</span>
          <div class="sheet-title">${esc(p.name)}</div>
          <div class="sheet-meta">${count ? `${starsHTML(avg)} <b style="color:var(--ink)">${avg.toFixed(1)}</b> (${count})` : "No ratings yet"} · ${fmtDist(d)}</div>
          <div class="sheet-social">${v.length ? `${avatarsHTML(v, 3)} ${plural(v.length, "student has", "students have")} been here` : "🌱 Be the first one here!"}</div>
        </div>
      </div>
      <div class="sheet-actions">
        <a class="btn btn-outline" href="${routeURL(p)}" target="_blank" rel="noopener">🧭 Route</a>
        <a class="btn btn-primary" href="#/place/${p.id}">Open</a>
      </div>`;
    $(".sheet-close").onclick = closeSheet;
    if (!silent) { $("#sheet").classList.add("open"); $("#view-map").classList.add("sheet-open"); }
  }
  function closeSheet() {
    $("#sheet").classList.remove("open"); $("#view-map").classList.remove("sheet-open");
    const prev = selectedId; selectedId = null;
    if (prev && markers[prev]) markers[prev].setIcon(markerIcon(byId(prev)));
  }

  // ---------- Place page ----------
  function galleryItems(p) {
    const visit = state.visits[p.id], items = [];
    if (visit && visit.photo) items.push({ name: state.user.name, color: state.user.color, cap: visit.caption || "You", img: visit.photo });
    if (LIVE) {
      (photoCache[p.id] || []).forEach((x) => { const img = safeImg(x.photo); if (img) items.push({ name: x.name, color: x.color, cap: x.caption || x.name, img }); });
    } else {
      (community.visitors[p.id] || []).forEach((x, i) => items.push({ name: x.name, color: x.color, cap: x.caption || x.name, art: placeArt(p, i + 1) }));
    }
    return items;
  }
  function galleryHTML(p) {
    const items = galleryItems(p);
    if (!items.length) return `<div class="empty">No shared photos yet.</div>`;
    return `<div class="gallery-grid">${items.map((it) => `<div class="ph">${it.img ? `<img src="${it.img}" alt="Photo by ${esc(it.name)}" loading="lazy">` : it.art}<div class="ph-cap">${avatarHTML(it.name, it.color)}${esc(it.cap)}</div></div>`).join("")}</div>`;
  }

  function renderPlace(id, fromRefresh) {
    const p = byId(id); if (!p) { location.hash = "#/map"; return; }
    const c = CATEGORIES[p.cat], { avg, count } = avgRating(id), v = visitorsOf(id), d = distTo(p);
    const visit = state.visits[id], unlocked = isUnlocked(p), fav = state.favorites.includes(id);
    const others = (community.visitors[id] || []).length;
    const missing = CONFIG.level2Unlock - level1Done();

    let action;
    if (!unlocked) {
      action = `<div class="empty">🔒 Visit <b>${plural(missing, "more Level 1 place", "more Level 1 places")}</b> to unlock this one.</div>`;
    } else if (!visit) {
      action = `<div class="upload-card">
          <div class="upload-ic">+</div>
          <h3>Been here?</h3>
          <p>Upload a photo of this place to unlock the gallery${others ? ` of the <b>${others}</b> other ${others === 1 ? "student" : "students"}` : ""}.</p>
          <button class="btn btn-primary btn-block" id="uploadBtn">📸 Upload photo</button>
          <div class="gps-state" id="gpsState"></div>
        </div>`;
    } else {
      const my = state.ratings[id] || 0;
      action = `<div class="done-card">
          <div class="done-check">✓</div>
          <div><b>Visited!</b><small>${visit.verified ? "📍 Verified on site" : "Photo uploaded"} · ${new Date(visit.ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></div>
          ${visit.photo ? `<div class="done-thumb"><img src="${visit.photo}" alt=""></div>` : ""}
        </div>
        <div class="rate-box">
          <p>${my ? "Your rating" : "How was it?"}</p>
          <div class="rate-stars" id="rateStars">${[1, 2, 3, 4, 5].map((i) => `<button data-v="${i}" class="${i <= my ? "on" : ""}" aria-label="${i} stars">★</button>`).join("")}</div>
          <small>${my ? "Tap to change your rating" : `Be honest – it helps everyone (+${CONFIG.points.rating} points)`}</small>
        </div>`;
    }

    const lockedCells = [1, 2, 3, 4, 5, 6].map((i) => `<div class="ph">${placeArt(p, i)}</div>`).join("");
    const nPhotos = galleryItems(p).length;

    $("#view-place").innerHTML = `
      <div class="place-top">
        <button class="icon-btn" id="backBtn" aria-label="Back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <h1>${esc(p.name)}</h1>
        <button class="icon-btn fav-btn ${fav ? "on" : ""}" id="favBtn" aria-label="Save">${fav ? "★" : "☆"}</button>
      </div>
      ${!unlocked ? `<div class="locked-banner"><span style="font-size:26px">🔒</span><div><b>Level ${p.level} – still locked</b>${plural(missing, "more place", "more places")} from Level 1 and it's yours.</div></div>` : ""}
      <div class="gallery-hero">${[0, 1, 2].map((i) => `<div class="ph">${placeArt(p, i)}</div>`).join("")}</div>
      <div class="place-body">
        <div class="place-head">
          <div>
            <div class="place-cat">${c.emoji} ${c.label} · ${esc(p.area)} · Level ${p.level}</div>
            <div class="place-rating">${count ? `<b>${avg.toFixed(1)}</b>${starsHTML(avg)}<small>(${count})</small>` : `<small>No ratings yet</small>`}</div>
          </div>
          <div class="place-dist"><b id="distVal">${fmtDist(d)}</b><small id="distSub">${walkMin(d) || "Distance"}</small></div>
        </div>
        <p class="place-desc">${esc(p.desc)}</p>
        <div class="info-row">
          <div class="info-box"><b>Tip</b>${esc(p.tip)}</div>
          <div class="info-box"><b>Open</b>${esc(p.hours)}</div>
        </div>
        ${v.length
          ? `<div class="social-proof">${avatarsHTML(v, 4)}<span><b>${plural(v.length, "student", "students")}</b> from your group ${v.length === 1 ? "has" : "have"} been here</span></div>`
          : `<div class="social-proof">🌱 <span>Nobody has been here yet – <b>be the first</b> and earn the Pioneer badge!</span></div>`}
        <a class="btn btn-ghost btn-block" href="${routeURL(p)}" target="_blank" rel="noopener" style="margin-bottom:18px">🧭 Directions in Google Maps</a>

        ${action}

        <div class="section-title">Group gallery <small id="photoCount">${visit ? plural(nPhotos, "photo", "photos") : ""}</small></div>
        <div id="galleryWrap">${visit
          ? galleryHTML(p)
          : `<div class="gallery-grid locked">${lockedCells}<div class="lock-overlay"><div class="lock-ic">🔒</div><b>Upload a photo to see the gallery</b></div></div>`}</div>
      </div>`;

    $("#backBtn").onclick = () => { if (prevRoute) history.back(); else location.hash = "#/map"; };
    $("#favBtn").onclick = () => {
      const i = state.favorites.indexOf(id);
      if (i >= 0) state.favorites.splice(i, 1); else state.favorites.push(id);
      save(); keepScroll("#view-place", () => renderPlace(id, true)); toast(i >= 0 ? "Removed from saved" : "⭐ Saved");
    };
    const ub = $("#uploadBtn");
    if (ub) ub.onclick = () => { pendingUpload = id; const fi = $("#fileInput"); fi.value = ""; fi.click(); };
    const rs = $("#rateStars");
    if (rs) rs.onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const first = !state.ratings[id];
      state.ratings[id] = +b.dataset.v;
      if (first) state.points += CONFIG.points.rating;
      save(); pushRating(id); refreshMarkers(); updateScore();
      keepScroll("#view-place", () => renderPlace(id, true));
      toast(first ? `Thanks! +${CONFIG.points.rating} points` : "Rating updated");
    };
    updateGpsState(p);

    // Live mode: load the group's real photos once the gallery is unlocked
    if (LIVE && visit && !fromRefresh) {
      fetchPhotos(id).then(() => {
        if (location.hash !== `#/place/${id}`) return;
        $("#galleryWrap").innerHTML = galleryHTML(p);
        $("#photoCount").textContent = plural(galleryItems(p).length, "photo", "photos");
      }).catch((e) => console.warn("photos", e));
    }
  }

  // ---------- Upload flow ----------
  function compressImage(file, max, q) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL("image/jpeg", q));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that image.")); };
      img.src = url;
    });
  }

  async function onFileChosen(e) {
    const file = e.target.files && e.target.files[0];
    const id = pendingUpload; pendingUpload = null;
    if (!file || !id) return;
    let data;
    try { data = await compressImage(file, LIVE ? 800 : 1000, LIVE ? 0.68 : 0.72); } catch (err) { toast(err.message); return; }
    const p = byId(id), d = distTo(p), verified = d != null && d <= CONFIG.checkinRadius;
    const pts = CONFIG.points.visit + (verified ? CONFIG.points.verified : 0) + (streak().today ? 0 : CONFIG.points.firstOfDay);
    openModal(`
      <img class="preview" src="${data}" alt="Preview">
      <h2>${esc(p.name)}</h2>
      <p>${verified ? "📍 You're on site – your visit will be verified." : d == null ? "Location unknown – saved without the GPS bonus." : `You're ${fmtDist(d)} away – saved without the GPS bonus.`}</p>
      <label class="field"><input id="capInput" maxlength="40" placeholder="Add a caption (optional)"></label>
      <label style="display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:16px;font-size:14px;font-weight:600">
        <input type="checkbox" id="shareChk" checked style="width:20px;height:20px;accent-color:var(--orange)"> Share in the group gallery
      </label>
      <div class="btns">
        <button class="btn btn-primary btn-block" id="confirmUp">Upload · +${pts} points</button>
        <button class="btn btn-outline btn-block" id="cancelUp">Cancel</button>
      </div>`);
    $("#cancelUp").onclick = closeModal;
    $("#confirmUp").onclick = async () => {
      const btn = $("#confirmUp"); btn.disabled = true; btn.textContent = "Uploading…";
      const shared = $("#shareChk").checked, caption = $("#capInput").value.trim();
      const wasL2Locked = level1Done() < CONFIG.level2Unlock;
      state.visits[id] = { photo: data, ts: Date.now(), verified, shared, caption };
      state.points += pts;
      const wk = startOfWeek().getTime();
      const weeklyNow = weekVisits() >= CONFIG.weeklyGoal && !state.challengeWeeks.includes(wk);
      if (weeklyNow) { state.challengeWeeks.push(wk); state.points += CONFIG.points.weekly; }
      if (!save()) { state.visits[id].photo = null; save(); }
      if (LIVE) {
        try { await pushVisit(id, data); }
        catch (err) { console.warn(err); toast("Saved on your phone – sharing failed. We'll retry next time you open the app."); }
      }
      closeModal(); confetti(); refreshMarkers(); updateScore();
      renderPlace(id);
      if (wasL2Locked && level1Done() >= CONFIG.level2Unlock) {
        setTimeout(() => {
          openModal(`<div class="m-ic">🔓</div><h2>Level 2 unlocked!</h2><p>Nice! You visited ${CONFIG.level2Unlock} Level 1 places. ${PLACES.filter((x) => x.level === 2).length} new places are waiting for you.</p><div class="btns"><a class="btn btn-primary btn-block" href="#/quests" id="toQuests">Go to quests</a></div>`);
          $("#toQuests").onclick = closeModal;
        }, 900);
      } else {
        toast(weeklyNow ? `🏅 Weekly challenge done! +${pts + CONFIG.points.weekly} points` : `🎉 Gallery unlocked! +${pts} points`);
      }
    };
  }

  // ---------- Quests page ----------
  function renderQuests() {
    const total = PLACES.length, visited = PLACES.filter((p) => isVisited(p.id)).length;
    const st = streak(), wk = weekVisits(), goal = CONFIG.weeklyGoal, l1 = level1Done();
    const levelBlock = (lvl) => {
      const list = PLACES.filter((p) => p.level === lvl);
      const done = list.filter((p) => isVisited(p.id)).length;
      const locked = lvl > 1 && l1 < CONFIG.level2Unlock;
      return `<div class="level ${locked ? "locked" : ""}">
        <div class="level-head"><h2><span class="level-badge">${locked ? "🔒" : lvl}</span>Level ${lvl}</h2><small>${done}/${list.length}</small></div>
        ${locked
          ? `<div class="level-lock">🔒 <span><b>${plural(CONFIG.level2Unlock - l1, "more place", "more places")}</b> from Level 1 to unlock</span></div>`
          : `<div class="progress dark" style="margin-bottom:12px"><i style="width:${(done / list.length) * 100}%"></i></div>`}
        <div class="place-list">${list.map((p) => {
          const { avg, count } = avgRating(p.id), c = CATEGORIES[p.cat], n = visitorsOf(p.id).length, vis = state.visits[p.id];
          return `<a class="place-row" href="#/place/${p.id}">
            <div class="pr-thumb ph">${vis && vis.photo ? `<img src="${vis.photo}" alt="">` : placeArt(p, 0)}</div>
            <div class="pr-body"><b>${esc(p.name)}</b>
              <small>${c.emoji} ${c.label} · ${count ? `★ ${avg.toFixed(1)}` : "new"} · ${n ? `👥 ${n}` : "🌱 nobody yet"}${userPos ? ` · ${fmtDist(distTo(p))}` : ""}</small></div>
            <div class="pr-state ${vis ? "done" : ""}">${vis ? "✓" : "+" + CONFIG.points.visit}</div>
          </a>`;
        }).join("")}</div></div>`;
    };
    $("#view-quests").innerHTML = `
      <div class="page-head"><h1>Your quests</h1><p>Visit places, collect points, unlock levels.</p></div>
      <div class="page-pad">
        <div class="hero-card">
          <div class="hc-label">Places discovered</div>
          <div class="hc-big">${visited}<small> / ${total}</small></div>
          <div class="progress"><i style="width:${(visited / total) * 100}%"></i></div>
          <div class="hc-row"><span>⭐ ${state.points} points</span><span>${visited === total ? "🏆 All discovered!" : `${total - visited} to go`}</span></div>
        </div>
        <div class="mini-cards">
          <div class="mini-card ${st.n && !st.today ? "warn" : ""}">
            <div class="mc-ic">🔥</div><b>${plural(st.n, "day", "days")}</b>
            <small>${st.n && !st.today ? "Visit a place today or you'll lose your streak!" : st.today ? "Streak secured for today 💪" : "Start your streak today"}</small>
          </div>
          <div class="mini-card">
            <div class="mc-ic">📍</div><b>${PLACES.filter((p) => isVisited(p.id) && state.visits[p.id].verified).length}</b>
            <small>visits verified on site</small>
          </div>
        </div>
        <div class="challenge">
          <div class="ch-ic">⏳</div>
          <div><b>Weekly challenge</b><small>${Math.min(wk, goal)}/${goal} places this week · +${CONFIG.points.weekly} bonus</small></div>
          <div class="timer">${wk >= goal ? "✓ Done" : countdown(endOfWeek())}<small>${wk >= goal ? "" : "left"}</small></div>
        </div>
        ${levelBlock(1)}
        ${levelBlock(2)}
      </div>`;
  }

  // ---------- Profile page ----------
  function renderProfile() {
    const u = state.user, visited = PLACES.filter((p) => isVisited(p.id));
    const rated = Object.keys(state.ratings).length;
    const board = community.users.map((x) => ({ ...x })).concat([{ name: u.name, color: u.color, flag: "", points: state.points, me: true }])
      .sort((a, b) => b.points - a.points);
    const myRank = board.findIndex((b) => b.me) + 1;
    const above = board[myRank - 2];
    const has = (cat) => visited.some((p) => p.cat === cat);
    const badges = [
      ["👣", "First step", visited.length >= 1],
      ["☕", "Café fan", has("cafe")],
      ["🏖️", "Beach lover", has("beach")],
      ["🍹", "Poncha pro", has("bar")],
      ["📍", "On site", visited.some((p) => state.visits[p.id].verified)],
      ["🌱", "Pioneer", visited.some((p) => !(community.visitors[p.id] || []).some((x) => (x.ts || 0) < state.visits[p.id].ts))],
      ["🔓", "Level 2", level1Done() >= CONFIG.level2Unlock],
      ["🏆", "Madeira master", visited.length === PLACES.length],
    ];
    const photos = visited.filter((p) => state.visits[p.id].photo);
    const shown = board.slice(0, 15);
    if (!shown.some((b) => b.me)) shown.push(board[myRank - 1]);

    $("#view-profile").innerHTML = `
      <div class="page-head"><h1>Profile</h1><p>Your Erasmus adventures in Funchal</p></div>
      <div class="page-pad">
        <div class="profile-card">
          ${avatarHTML(u.name, u.color, "lg")}
          <div><h2>${esc(u.name)}</h2><small>Rank ${myRank} of ${board.length} in your group</small></div>
        </div>
        <div class="stats">
          <div class="stat"><b>${state.points}</b><small>Points</small></div>
          <div class="stat"><b>${visited.length}</b><small>Places</small></div>
          <div class="stat"><b>${rated}</b><small>Ratings</small></div>
        </div>

        <div class="section-title">Leaderboard <small>${LIVE ? "🟢 live" : "demo"}</small></div>
        ${board.length < 2
          ? `<div class="social-proof">👋 <span>You're the first one here – <b>share the link</b> with your Erasmus group!</span></div>`
          : above
            ? `<div class="social-proof">🎯 <span>Only <b>${above.points - state.points + 1} points</b> until you overtake ${esc(above.name)}!</span></div>`
            : `<div class="social-proof">👑 <span><b>You're #1!</b> Keep going to stay on top.</span></div>`}
        <div class="leader">${shown.map((b) => { const i = board.indexOf(b); return `<div class="leader-row ${b.me ? "me" : ""}"><span class="rank">${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>${avatarHTML(b.name, b.color)}<span class="who">${esc(b.name)} ${b.flag || ""}${b.me ? " (you)" : ""}</span><span class="pts">${Number(b.points) || 0}</span></div>`; }).join("")}</div>

        <div class="section-title">Badges <small>${badges.filter((b) => b[2]).length}/${badges.length}</small></div>
        <div class="badges">${badges.map(([ic, l, on]) => `<div class="badge ${on ? "" : "off"}"><div class="b-ic">${ic}</div>${l}</div>`).join("")}</div>

        <div class="section-title">My photos <small>${photos.length}</small></div>
        ${photos.length ? `<div class="my-photos">${photos.map((p) => `<a class="ph" href="#/place/${p.id}"><img src="${state.visits[p.id].photo}" alt="${esc(p.name)}"></a>`).join("")}</div>` : `<div class="empty">No photos yet. Pick a place on the map! 🗺️</div>`}

        ${state.favorites.length ? `<div class="section-title">Saved <small>${state.favorites.length}</small></div><div class="place-list">${state.favorites.map(byId).filter(Boolean).map((p) => `<a class="place-row" href="#/place/${p.id}"><div class="pr-thumb ph">${placeArt(p, 0)}</div><div class="pr-body"><b>${esc(p.name)}</b><small>${CATEGORIES[p.cat].emoji} ${CATEGORIES[p.cat].label}</small></div><div class="pr-state ${isVisited(p.id) ? "done" : ""}">${isVisited(p.id) ? "✓" : "→"}</div></a>`).join("")}</div>` : ""}

        <div class="section-title">Settings</div>
        <div class="settings">
          <button id="geoSet"><span>📍 Location ${userPos ? "on" : "– turn on"}</span><span>${userPos ? "✓" : "→"}</span></button>
          <button id="renameSet"><span>✏️ Change name</span><span>→</span></button>
          <button id="resetSet" class="danger"><span>🗑️ Reset progress</span><span>→</span></button>
        </div>
        <p class="note">Fair &amp; honest: you can only rate a place after uploading a photo there. Your location is only used on your phone to show distances and verify visits – it's never uploaded.${LIVE ? "" : " (Prototype: the other students are example data.)"}</p>
      </div>`;
    $("#geoSet").onclick = () => startGeo(true);
    $("#renameSet").onclick = () => {
      openModal(`<div class="m-ic">✏️</div><h2>New name</h2><label class="field"><input id="newName" maxlength="20" value="${esc(u.name)}"></label><div class="btns"><button class="btn btn-primary btn-block" id="saveName">Save</button></div>`);
      $("#saveName").onclick = () => { const n = $("#newName").value.trim(); if (n) { state.user.name = n; save(); syncUser(); } closeModal(); renderProfile(); };
    };
    $("#resetSet").onclick = () => {
      openModal(`<div class="m-ic">⚠️</div><h2>Reset everything?</h2><p>All your visits, photos and points will be deleted${LIVE ? " – also from the group gallery" : ""}.</p><div class="btns"><button class="btn btn-primary btn-block" id="doReset" style="background:#D33;box-shadow:none">Yes, delete everything</button><button class="btn btn-outline btn-block" id="noReset">Cancel</button></div>`);
      $("#noReset").onclick = closeModal;
      $("#doReset").onclick = async () => {
        $("#doReset").disabled = true;
        await deleteMyData();
        localStorage.removeItem(STORE_KEY); location.hash = ""; location.reload();
      };
    };
  }

  // ---------- Router ----------
  function updateScore() { $("#scorePill").textContent = `⭐ ${state.points}`; }
  function show(viewId) { ["view-map", "view-place", "view-quests", "view-profile"].forEach((v) => ($("#" + v).hidden = v !== viewId)); }
  function route() {
    if (!state.user) return;
    const h = location.hash || "#/map";
    const [, page, arg] = h.split("/");
    document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === (page || "map")));
    if (page === "place") { show("view-place"); renderPlace(arg); $("#view-place").scrollTop = 0; }
    else if (page === "quests") { show("view-quests"); renderQuests(); $("#view-quests").scrollTop = 0; }
    else if (page === "profile") { show("view-profile"); renderProfile(); $("#view-profile").scrollTop = 0; }
    else { show("view-map"); if (map) setTimeout(() => map.invalidateSize(), 0); }
    prevRoute = lastRoute; lastRoute = h;
  }

  // ---------- Boot ----------
  function startApp() {
    $("#onboarding").hidden = true;
    $("#tabbar").hidden = false;
    $("#brandSmall").innerHTML = `${LOGO}<div>Madeira <span>Quest</span></div>`;
    if (!map) initMap();
    updateScore();
    route();
    syncUser();
    if (state.geoAsked && navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((r) => { if (r.state === "granted") startGeo(false); }).catch(() => {});
    }
  }

  function boot() {
    $("#obLogo").innerHTML = LOGO;
    $("#fileInput").addEventListener("change", onFileChosen);
    window.addEventListener("hashchange", route);

    if (LIVE) {
      initFirebase().catch((e) => { console.error(e); toast("Offline – couldn't connect to the group. Your progress is saved on your phone."); });
    } else {
      buildDemoCommunity();
    }

    if (state.user) { startApp(); return; }

    $("#onboarding").hidden = false;
    const go = () => {
      const name = $("#obName").value.trim();
      if (!name) { $("#obName").focus(); toast("What should the others call you?"); return; }
      const colors = ["#FF7A1A", "#1FA2D6", "#2BB673", "#9B5DE5", "#F15BB5", "#E63946"];
      state.user = { name, color: colors[Math.floor(Math.random() * colors.length)] };
      save();
      location.hash = "#/map";
      startApp();
      setTimeout(() => {
        openModal(`<div class="m-ic">📍</div><h2>Allow location?</h2><p>We'll show how far away each place is, and you get <b>+${CONFIG.points.verified} bonus points</b> when you take a photo on site.</p><div class="btns"><button class="btn btn-primary btn-block" id="geoYes">Allow location</button><button class="btn btn-outline btn-block" id="geoNo">Later</button></div>`);
        $("#geoYes").onclick = () => { closeModal(); startGeo(true); };
        $("#geoNo").onclick = () => { closeModal(); state.geoAsked = true; save(); };
      }, 500);
    };
    $("#obStart").onclick = go;
    $("#obName").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
