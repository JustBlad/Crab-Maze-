/* =========================================================
   Madeira Quest – App
   Reines HTML/CSS/JS, keine Build-Tools nötig.
   Speicherung lokal im Browser (localStorage).
   ========================================================= */
(() => {
  "use strict";

  // ---------- State ----------
  const STORE_KEY = "madeiraQuest.v1";
  const defaultState = () => ({
    user: null,            // { name, color }
    visits: {},            // placeId -> { photo, ts, verified, shared }
    ratings: {},           // placeId -> 1..5
    favorites: [],
    points: 0,
    geoAsked: false,
    filter: "all",
  });

  let state = load();
  let userPos = null;      // { lat, lng, acc }
  let geoWatchId = null;
  let map, meMarker, accCircle;
  const markers = {};
  let selectedId = null;
  let pendingUpload = null; // placeId waiting for file
  let lastRoute = null, prevRoute = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { /* ignore */ }
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); return true; }
    catch (e) {
      toast("Speicher voll – älteste Fotos konnten nicht gespeichert werden.");
      return false;
    }
  }

  // ---------- Helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = (id) => PLACES.find((p) => p.id === id);
  const demo = (id) => (CONFIG.demoCommunity && DEMO_ACTIVITY[id]) || { ratings: [], visitors: [], captions: [] };
  const demoUser = (name) => DEMO_USERS.find((u) => u.name === name) || { name, color: "#999", country: "" };
  const isVisited = (id) => !!state.visits[id];
  const level1Done = () => PLACES.filter((p) => p.level === 1 && isVisited(p.id)).length;
  const isUnlocked = (p) => p.level === 1 || level1Done() >= CONFIG.level2Unlock;

  function avgRating(id) {
    const r = demo(id).ratings.slice();
    if (state.ratings[id]) r.push(state.ratings[id]);
    if (!r.length) return { avg: 0, count: 0 };
    return { avg: r.reduce((a, b) => a + b, 0) / r.length, count: r.length };
  }
  function visitorNames(id) {
    const v = demo(id).visitors.slice();
    if (isVisited(id) && state.user) v.push(state.user.name);
    return v;
  }
  function starsHTML(v) {
    let s = "";
    for (let i = 1; i <= 5; i++) s += `<span class="${v >= i - 0.25 ? "" : "off"}">★</span>`;
    return `<span class="stars" aria-label="${v.toFixed(1)} von 5">${s}</span>`;
  }
  function haversine(a, b) {
    const R = 6371000, toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function distTo(p) { return userPos ? haversine(userPos, p) : null; }
  function fmtDist(m) {
    if (m == null) return "–";
    if (m < 1000) return `${Math.round(m / 10) * 10} m`;
    return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
  }
  function walkMin(m) { return m == null ? "" : `${Math.max(1, Math.round(m / 80))} min zu Fuß`; }
  function initials(n) { return (n || "?").trim().charAt(0).toUpperCase(); }
  function avatarHTML(name, color, cls = "") {
    return `<span class="avatar ${cls}" style="background:${color}">${esc(initials(name))}</span>`;
  }
  function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

  function streak() {
    const days = new Set(Object.values(state.visits).map((v) => dayKey(v.ts)));
    if (!days.size) return { n: 0, today: false };
    let n = 0; const d = new Date();
    const today = days.has(dayKey(d));
    if (!today) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return { n, today };
  }
  function endOfWeek() {
    const d = new Date(); const day = (d.getDay() + 6) % 7; // Mo=0
    d.setDate(d.getDate() + (6 - day)); d.setHours(23, 59, 59, 999); return d;
  }
  function startOfWeek() {
    const d = new Date(); const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); return d;
  }
  function weekVisits() {
    const s = startOfWeek().getTime();
    return Object.values(state.visits).filter((v) => v.ts >= s).length;
  }
  function countdown(to) {
    const ms = Math.max(0, to - Date.now());
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    return d > 0 ? `${d}T ${h}h` : `${h}h ${m}m`;
  }

  // ---------- Art (placeholder pictures) ----------
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

  function placeArt(p, v = 0) {
    const pal = PALETTES[p.cat][v % 4];
    const uid = `${p.id}${v}${Math.random().toString(36).slice(2, 6)}`;
    const bg = `<defs><linearGradient id="g${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal[0]}"/><stop offset="1" stop-color="${pal[1]}"/></linearGradient></defs>
      <rect width="200" height="200" fill="url(#g${uid})"/>`;
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
  function confetti() {
    const c = document.createElement("div"); c.className = "confetti";
    const colors = ["#FF7A1A", "#FFB000", "#2BB673", "#1FA2D6", "#F15BB5", "#9B5DE5"];
    for (let i = 0; i < 70; i++) {
      const s = document.createElement("i");
      s.style.left = Math.random() * 100 + "%";
      s.style.background = colors[i % colors.length];
      s.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
      s.style.animationDelay = Math.random() * 0.4 + "s";
      s.style.transform = `rotate(${Math.random() * 360}deg)`;
      c.appendChild(s);
    }
    $("#app").appendChild(c); setTimeout(() => c.remove(), 3800);
  }

  // ---------- Geolocation ----------
  function startGeo(userInitiated) {
    if (!("geolocation" in navigator)) { if (userInitiated) toast("Dein Browser unterstützt kein GPS."); return; }
    state.geoAsked = true; save();
    if (geoWatchId != null) { if (userInitiated && userPos) centerOnMe(); return; }
    let first = true;
    geoWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
        updateMe();
        if (first && userInitiated) { first = false; centerOnMe(); }
        first = false;
        refreshDistances();
      },
      (err) => {
        geoWatchId = null;
        $("#locateBtn").classList.remove("active");
        if (err.code === 1) toast("Standort abgelehnt – du kannst ihn in den Browser-Einstellungen erlauben.");
        else if (userInitiated) toast("Standort konnte nicht ermittelt werden.");
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
    const funchalBounds = L.latLngBounds([32.60, -17.05], [32.72, -16.80]);
    if (funchalBounds.contains([userPos.lat, userPos.lng])) map.flyTo([userPos.lat, userPos.lng], 16, { duration: 0.8 });
    else { toast("Du bist gerade nicht in Funchal – wir zeigen dir trotzdem die Karte 🙂"); map.flyTo(CONFIG.center, CONFIG.zoom); }
  }
  function refreshDistances() {
    if (selectedId) renderSheet(selectedId, true);
    const r = location.hash;
    if (r.startsWith("#/place/")) {
      const el = $("#distVal"); const p = byId(r.split("/")[2]);
      if (el && p) { el.textContent = fmtDist(distTo(p)); $("#distSub").textContent = walkMin(distTo(p)) || "Entfernung"; updateGpsState(p); }
    }
  }
  function updateGpsState(p) {
    const el = $("#gpsState"); if (!el) return;
    const d = distTo(p);
    if (d == null) { el.className = "gps-state"; el.innerHTML = `📍 <a href="#" id="gpsAsk" style="text-decoration:underline">Standort aktivieren</a> für den verifizierten Bonus (+${CONFIG.points.verified})`; const a = $("#gpsAsk"); if (a) a.onclick = (e) => { e.preventDefault(); startGeo(true); }; }
    else if (d <= CONFIG.checkinRadius) { el.className = "gps-state ok"; el.textContent = `✓ Du bist vor Ort – verifizierter Besuch (+${CONFIG.points.verified} Bonus)`; }
    else { el.className = "gps-state"; el.textContent = `Du bist ${fmtDist(d)} entfernt. Vor Ort gibt's +${CONFIG.points.verified} Bonuspunkte.`; }
  }

  // ---------- Map ----------
  function initMap() {
    map = L.map("map", { zoomControl: false, attributionControl: true }).setView(CONFIG.center, CONFIG.zoom);
    L.tileLayer("https://{s}.basemap.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19, subdomains: "abcd",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);
    map.on("click", () => closeSheet());
    PLACES.forEach((p) => {
      markers[p.id] = L.marker([p.lat, p.lng], { icon: markerIcon(p) }).addTo(map).on("click", (e) => { L.DomEvent.stopPropagation(e); selectPlace(p.id); });
    });
    renderChips();
    applyFilter();
    $("#locateBtn").onclick = () => { if (userPos) centerOnMe(); else startGeo(true); };
  }
  function markerIcon(p) {
    const c = CATEGORIES[p.cat];
    const { avg } = avgRating(p.id);
    const cls = ["mq-marker", isVisited(p.id) ? "visited" : "", !isUnlocked(p) ? "locked" : "", selectedId === p.id ? "selected" : ""].join(" ");
    const label = !isUnlocked(p) ? "🔒" : avg ? `★ ${avg.toFixed(1)}` : "neu";
    return L.divIcon({
      className: "", iconSize: [44, 54], iconAnchor: [22, 50],
      html: `<div class="${cls}" style="--c:${c.color}"><div class="mq-pin"></div><div class="mq-pin-ic">${c.emoji}</div><div class="mq-rating">${label}</div></div>`,
    });
  }
  function refreshMarkers() { PLACES.forEach((p) => markers[p.id] && markers[p.id].setIcon(markerIcon(p))); }
  function renderChips() {
    const chips = [["all", "Alle", "✨"], ...Object.entries(CATEGORIES).map(([k, c]) => [k, c.label, c.emoji])];
    $("#chips").innerHTML = chips.map(([k, l, e]) => `<button class="chip ${state.filter === k ? "active" : ""}" data-f="${k}">${e} ${l}</button>`).join("");
    $("#chips").onclick = (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      state.filter = b.dataset.f; save(); renderChips(); applyFilter(); closeSheet();
    };
  }
  function applyFilter() {
    PLACES.forEach((p) => {
      const show = state.filter === "all" || p.cat === state.filter;
      const m = markers[p.id];
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
    const p = byId(id), c = CATEGORIES[p.cat], { avg, count } = avgRating(id), v = visitorNames(id), d = distTo(p);
    const unlocked = isUnlocked(p);
    $("#sheet").innerHTML = `
      <button class="sheet-close" aria-label="Schließen">✕</button>
      <div class="sheet-card">
        <div class="sheet-thumb ph">${isVisited(id) && state.visits[id].photo ? `<img src="${state.visits[id].photo}" alt="">` : placeArt(p, 0)}</div>
        <div class="sheet-body">
          <span class="tag ${isVisited(id) ? "green" : !unlocked ? "grey" : ""}" style="align-self:flex-start">${isVisited(id) ? "✓ Besucht" : !unlocked ? "🔒 Level " + p.level : c.emoji + " " + c.label}</span>
          <div class="sheet-title">${esc(p.name)}</div>
          <div class="sheet-meta">${count ? `${starsHTML(avg)} <b style="color:var(--ink)">${avg.toFixed(1)}</b> (${count})` : "Noch keine Bewertung"} · ${fmtDist(d)}</div>
          <div class="sheet-social">${v.length ? `<span class="avatars">${v.slice(-3).map((n) => avatarHTML(n, n === state.user?.name ? state.user.color : demoUser(n).color)).join("")}</span> ${v.length} ${v.length === 1 ? "Studi war" : "Studis waren"} schon hier` : "🌱 Sei die erste Person hier!"}</div>
        </div>
      </div>
      <div class="sheet-actions">
        <a class="btn btn-outline" href="https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${encodeURIComponent(p.name + ", Funchal, Madeira")}" target="_blank" rel="noopener">🧭 Route</a>
        <a class="btn btn-primary" href="#/place/${p.id}">Ansehen</a>
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
  function renderPlace(id) {
    const p = byId(id); if (!p) { location.hash = "#/map"; return; }
    const c = CATEGORIES[p.cat], { avg, count } = avgRating(id), v = visitorNames(id), d = distTo(p);
    const visit = state.visits[id], unlocked = isUnlocked(p), fav = state.favorites.includes(id);
    const dm = demo(id);

    const heroPics = [0, 1, 2].map((i) => `<div class="ph">${placeArt(p, i)}</div>`).join("");

    // Community gallery
    const items = dm.visitors.map((n, i) => ({ name: n, color: demoUser(n).color, cap: dm.captions[i % Math.max(1, dm.captions.length)] || "", art: placeArt(p, i + 1) }));
    if (visit && visit.photo && visit.shared !== false) items.unshift({ name: state.user.name, color: state.user.color, cap: "Du", img: visit.photo });
    const galleryCells = items.length
      ? items.map((it) => `<div class="ph">${it.img ? `<img src="${it.img}" alt="Foto von ${esc(it.name)}">` : it.art}<div class="ph-cap">${avatarHTML(it.name, it.color)}${esc(it.cap || it.name)}</div></div>`).join("")
      : "";
    const lockedCells = [1, 2, 3, 4, 5, 6].map((i) => `<div class="ph">${placeArt(p, i)}</div>`).join("");

    let action;
    if (!unlocked) {
      action = `<div class="empty">🔒 Besuche noch <b>${CONFIG.level2Unlock - level1Done()}</b> Level‑1‑Orte, um diesen Ort freizuschalten.</div>`;
    } else if (!visit) {
      action = `<div class="upload-card">
          <div class="upload-ic">+</div>
          <h3>Warst du schon hier?</h3>
          <p>Lade ein Foto von diesem Ort hoch und schalte die Galerie der anderen ${dm.visitors.length ? `<b>${dm.visitors.length}</b> ` : ""}Studis frei.</p>
          <button class="btn btn-primary btn-block" id="uploadBtn">📸 Foto hochladen</button>
          <div class="gps-state" id="gpsState"></div>
        </div>`;
    } else {
      const my = state.ratings[id] || 0;
      action = `<div class="done-card">
          <div class="done-check">✓</div>
          <div><b>Besucht!</b><small>${visit.verified ? "📍 Vor Ort verifiziert" : "Foto hochgeladen"} · ${new Date(visit.ts).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</small></div>
          ${visit.photo ? `<div class="done-thumb"><img src="${visit.photo}" alt=""></div>` : ""}
        </div>
        <div class="rate-box">
          <p>${my ? "Deine Bewertung" : "Wie fandest du's?"}</p>
          <div class="rate-stars" id="rateStars">${[1, 2, 3, 4, 5].map((i) => `<button data-v="${i}" class="${i <= my ? "on" : ""}" aria-label="${i} Sterne">★</button>`).join("")}</div>
          <small>${my ? "Tippe, um deine Bewertung zu ändern" : `Ehrlich bewerten – hilft allen (+${CONFIG.points.rating} Punkte)`}</small>
        </div>`;
    }

    $("#view-place").innerHTML = `
      <div class="place-top">
        <button class="icon-btn" id="backBtn" aria-label="Zurück"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <h1>${esc(p.name)}</h1>
        <button class="icon-btn fav-btn ${fav ? "on" : ""}" id="favBtn" aria-label="Merken">${fav ? "★" : "☆"}</button>
      </div>
      ${!unlocked ? `<div class="locked-banner"><span style="font-size:26px">🔒</span><div><b>Level ${p.level} – noch gesperrt</b>Noch ${CONFIG.level2Unlock - level1Done()} Orte aus Level 1, dann gehört er dir.</div></div>` : ""}
      <div class="gallery-hero">${heroPics}</div>
      <div class="place-body">
        <div class="place-head">
          <div>
            <div class="place-cat">${c.emoji} ${c.label} · ${esc(p.area)} · Level ${p.level}</div>
            <div class="place-rating">${count ? `<b>${avg.toFixed(1)}</b>${starsHTML(avg)}<small>(${count})</small>` : `<small>Noch keine Bewertungen</small>`}</div>
          </div>
          <div class="place-dist"><b id="distVal">${fmtDist(d)}</b><small id="distSub">${walkMin(d) || "Entfernung"}</small></div>
        </div>
        <p class="place-desc">${esc(p.desc)}</p>
        <div class="info-row">
          <div class="info-box"><b>Tipp</b>${esc(p.tip)}</div>
          <div class="info-box"><b>Offen</b>${esc(p.hours)}</div>
        </div>
        ${v.length ? `<div class="social-proof"><span class="avatars">${v.slice(-4).map((n) => avatarHTML(n, n === state.user?.name ? state.user.color : demoUser(n).color)).join("")}</span><span><b>${v.length} ${v.length === 1 ? "Studi" : "Studis"}</b> aus deiner Gruppe ${v.length === 1 ? "war" : "waren"} schon hier</span></div>` : `<div class="social-proof">🌱 <span>Noch niemand war hier – <b>sei die erste Person</b> und hol dir den Entdecker‑Badge!</span></div>`}
        <a class="btn btn-ghost btn-block" href="https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${encodeURIComponent(p.name + ", Funchal, Madeira")}" target="_blank" rel="noopener" style="margin-bottom:18px">🧭 Route in Google Maps</a>

        ${action}

        <div class="section-title">Galerie der Gruppe <small>${items.length} ${items.length === 1 ? "Foto" : "Fotos"}</small></div>
        ${visit
          ? (items.length ? `<div class="gallery-grid">${galleryCells}</div>` : `<div class="empty">Noch keine geteilten Fotos.</div>`)
          : `<div class="gallery-grid locked">${lockedCells}<div class="lock-overlay"><div class="lock-ic">🔒</div><b>Lade ein Foto hoch, um die Galerie zu sehen</b></div></div>`}
      </div>`;

    $("#backBtn").onclick = () => { if (prevRoute) history.back(); else location.hash = "#/map"; };
    $("#favBtn").onclick = () => {
      const i = state.favorites.indexOf(id);
      if (i >= 0) state.favorites.splice(i, 1); else state.favorites.push(id);
      save(); renderPlace(id); toast(i >= 0 ? "Aus Merkliste entfernt" : "⭐ Gemerkt");
    };
    const ub = $("#uploadBtn");
    if (ub) ub.onclick = () => { pendingUpload = id; const fi = $("#fileInput"); fi.value = ""; fi.click(); };
    const rs = $("#rateStars");
    if (rs) rs.onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const first = !state.ratings[id];
      state.ratings[id] = +b.dataset.v;
      if (first) state.points += CONFIG.points.rating;
      save(); refreshMarkers(); updateScore(); renderPlace(id);
      toast(first ? `Danke! +${CONFIG.points.rating} Punkte` : "Bewertung aktualisiert");
    };
    updateGpsState(p);
  }

  // ---------- Upload flow ----------
  function compressImage(file, max = 1000, q = 0.72) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL("image/jpeg", q));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Bild konnte nicht gelesen werden")); };
      img.src = url;
    });
  }

  async function onFileChosen(e) {
    const file = e.target.files && e.target.files[0];
    const id = pendingUpload; pendingUpload = null;
    if (!file || !id) return;
    let data;
    try { data = await compressImage(file); } catch (err) { toast(err.message); return; }
    const p = byId(id), d = distTo(p), verified = d != null && d <= CONFIG.checkinRadius;
    const pts = CONFIG.points.visit + (verified ? CONFIG.points.verified : 0) + (streak().today ? 0 : CONFIG.points.firstOfDay);
    openModal(`
      <img class="preview" src="${data}" alt="Vorschau">
      <h2>${esc(p.name)}</h2>
      <p>${verified ? "📍 Du bist vor Ort – dein Besuch wird verifiziert." : d == null ? "Standort unbekannt – Besuch wird ohne GPS-Bonus gespeichert." : `Du bist ${fmtDist(d)} entfernt – Besuch wird ohne GPS-Bonus gespeichert.`}</p>
      <label style="display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:16px;font-size:14px;font-weight:600">
        <input type="checkbox" id="shareChk" checked style="width:20px;height:20px;accent-color:var(--orange)"> In der Gruppen‑Galerie teilen
      </label>
      <div class="btns">
        <button class="btn btn-primary btn-block" id="confirmUp">Hochladen · +${pts} Punkte</button>
        <button class="btn btn-outline btn-block" id="cancelUp">Abbrechen</button>
      </div>`);
    $("#cancelUp").onclick = closeModal;
    $("#confirmUp").onclick = () => {
      const shared = $("#shareChk").checked;
      const wasL2Locked = level1Done() < CONFIG.level2Unlock;
      state.visits[id] = { photo: data, ts: Date.now(), verified, shared };
      state.points += pts;
      const wk0 = startOfWeek().getTime();
      state.challengeWeeks = state.challengeWeeks || [];
      const challengeNow = weekVisits() >= 3 && !state.challengeWeeks.includes(wk0);
      if (challengeNow) { state.challengeWeeks.push(wk0); state.points += 100; }
      if (!save()) { state.visits[id].photo = null; save(); }
      closeModal(); confetti(); refreshMarkers(); updateScore();
      renderPlace(id);
      const nowL2 = level1Done() >= CONFIG.level2Unlock;
      if (wasL2Locked && nowL2) {
        setTimeout(() => openModal(`<div class="m-ic">🔓</div><h2>Level 2 freigeschaltet!</h2><p>Stark! Du hast ${CONFIG.level2Unlock} Orte aus Level 1 besucht. Jetzt warten 6 neue Orte auf dich.</p><div class="btns"><a class="btn btn-primary btn-block" href="#/quests" id="toQuests">Zu den Quests</a></div>`), 900);
        setTimeout(() => { const b = $("#toQuests"); if (b) b.onclick = closeModal; }, 950);
      } else {
        toast(challengeNow ? `🏅 Wochen-Challenge geschafft! +${pts + 100} Punkte` : `🎉 Galerie freigeschaltet! +${pts} Punkte`);
      }
    };
  }

  // ---------- Quests page ----------
  function renderQuests() {
    const total = PLACES.length, visited = PLACES.filter((p) => isVisited(p.id)).length;
    const st = streak(), wk = weekVisits(), wkGoal = 3;
    const l1 = level1Done();
    const levelBlock = (lvl) => {
      const list = PLACES.filter((p) => p.level === lvl);
      const done = list.filter((p) => isVisited(p.id)).length;
      const locked = lvl === 2 && l1 < CONFIG.level2Unlock;
      return `<div class="level ${locked ? "locked" : ""}">
        <div class="level-head"><h2><span class="level-badge">${locked ? "🔒" : lvl}</span>Level ${lvl}</h2><small>${done}/${list.length}</small></div>
        ${locked ? `<div class="level-lock">🔒 <span>Noch <b>${CONFIG.level2Unlock - l1}</b> ${CONFIG.level2Unlock - l1 === 1 ? "Ort" : "Orte"} aus Level 1 zum Freischalten</span></div>` : `<div class="progress dark" style="margin-bottom:12px"><i style="width:${(done / list.length) * 100}%"></i></div>`}
        <div class="place-list">${list.map((p) => {
          const { avg, count } = avgRating(p.id), c = CATEGORIES[p.cat], v = visitorNames(p.id).length;
          return `<a class="place-row" href="#/place/${p.id}">
            <div class="pr-thumb ph">${isVisited(p.id) && state.visits[p.id].photo ? `<img src="${state.visits[p.id].photo}" alt="">` : placeArt(p, 0)}</div>
            <div class="pr-body"><b>${esc(p.name)}</b>
              <small>${c.emoji} ${c.label} · ${count ? `★ ${avg.toFixed(1)}` : "neu"} · ${v ? `👥 ${v}` : "🌱 noch niemand"}${userPos ? ` · ${fmtDist(distTo(p))}` : ""}</small></div>
            <div class="pr-state ${isVisited(p.id) ? "done" : ""}">${isVisited(p.id) ? "✓" : "+" + CONFIG.points.visit}</div>
          </a>`;
        }).join("")}</div></div>`;
    };
    $("#view-quests").innerHTML = `
      <div class="page-head"><h1>Deine Quests</h1><p>Besuche Orte, sammle Punkte, schalte Level frei.</p></div>
      <div class="page-pad">
        <div class="hero-card">
          <div class="hc-label">Orte entdeckt</div>
          <div class="hc-big">${visited}<small> / ${total}</small></div>
          <div class="progress"><i style="width:${(visited / total) * 100}%"></i></div>
          <div class="hc-row"><span>⭐ ${state.points} Punkte</span><span>${visited === total ? "🏆 Alles entdeckt!" : `Noch ${total - visited} Orte`}</span></div>
        </div>
        <div class="mini-cards">
          <div class="mini-card ${st.n && !st.today ? "warn" : ""}">
            <div class="mc-ic">🔥</div><b>${st.n} ${st.n === 1 ? "Tag" : "Tage"}</b>
            <small>${st.n && !st.today ? "Besuche heute einen Ort, sonst ist deine Serie weg!" : st.today ? "Serie für heute gesichert 💪" : "Starte heute deine Serie"}</small>
          </div>
          <div class="mini-card">
            <div class="mc-ic">📍</div><b>${PLACES.filter((p) => isVisited(p.id) && state.visits[p.id].verified).length}</b>
            <small>vor Ort verifizierte Besuche</small>
          </div>
        </div>
        <div class="challenge">
          <div class="ch-ic">⏳</div>
          <div><b>Wochen‑Challenge</b><small>${Math.min(wk, wkGoal)}/${wkGoal} Orte diese Woche · +100 Bonus</small></div>
          <div class="timer">${wk >= wkGoal ? "✓ Geschafft" : countdown(endOfWeek())}<small>${wk >= wkGoal ? "" : "verbleibend"}</small></div>
        </div>
        ${levelBlock(1)}
        ${levelBlock(2)}
      </div>`;
  }

  // ---------- Profile page ----------
  function renderProfile() {
    const u = state.user, visited = PLACES.filter((p) => isVisited(p.id));
    const rated = Object.keys(state.ratings).length;
    const board = (CONFIG.demoCommunity ? DEMO_USERS.map((d) => ({ name: d.name, color: d.color, flag: d.country, pts: DEMO_SCORES[d.name] || 0 })) : [])
      .concat([{ name: u.name, color: u.color, flag: "", pts: state.points, me: true }])
      .sort((a, b) => b.pts - a.pts);
    const myRank = board.findIndex((b) => b.me) + 1;
    const above = board[myRank - 2];
    const cats = (cat) => visited.some((p) => p.cat === cat);
    const pioneer = visited.some((p) => demo(p.id).visitors.length === 0);
    const badges = [
      ["👣", "Erster Schritt", visited.length >= 1],
      ["☕", "Café‑Fan", cats("cafe")],
      ["🏖️", "Beach Lover", cats("beach")],
      ["🍹", "Poncha Profi", cats("bar")],
      ["📍", "Vor Ort", visited.some((p) => state.visits[p.id].verified)],
      ["🌱", "Entdecker:in", pioneer],
      ["🔓", "Level 2", level1Done() >= CONFIG.level2Unlock],
      ["🏆", "Madeira Master", visited.length === PLACES.length],
    ];
    const photos = visited.filter((p) => state.visits[p.id].photo);

    $("#view-profile").innerHTML = `
      <div class="page-head"><h1>Profil</h1><p>Deine Erasmus‑Abenteuer in Funchal</p></div>
      <div class="page-pad">
        <div class="profile-card">
          ${avatarHTML(u.name, u.color, "lg")}
          <div><h2>${esc(u.name)}</h2><small>Platz ${myRank} von ${board.length} in deiner Gruppe</small></div>
        </div>
        <div class="stats">
          <div class="stat"><b>${state.points}</b><small>Punkte</small></div>
          <div class="stat"><b>${visited.length}</b><small>Orte</small></div>
          <div class="stat"><b>${rated}</b><small>Bewertungen</small></div>
        </div>

        <div class="section-title">Rangliste <small>diese Woche</small></div>
        ${above ? `<div class="social-proof">🎯 <span>Nur noch <b>${above.pts - state.points + 1} Punkte</b> bis du ${esc(above.name)} überholst!</span></div>` : `<div class="social-proof">👑 <span><b>Du bist auf Platz 1!</b> Bleib dran, damit es so bleibt.</span></div>`}
        <div class="leader">${board.map((b, i) => `<div class="leader-row ${b.me ? "me" : ""}"><span class="rank">${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>${avatarHTML(b.name, b.color)}<span class="who">${esc(b.name)} ${b.flag}${b.me ? " (du)" : ""}</span><span class="pts">${b.pts}</span></div>`).join("")}</div>

        <div class="section-title">Abzeichen <small>${badges.filter((b) => b[2]).length}/${badges.length}</small></div>
        <div class="badges">${badges.map(([ic, l, on]) => `<div class="badge ${on ? "" : "off"}"><div class="b-ic">${ic}</div>${l}</div>`).join("")}</div>

        <div class="section-title">Meine Fotos <small>${photos.length}</small></div>
        ${photos.length ? `<div class="my-photos">${photos.map((p) => `<a class="ph" href="#/place/${p.id}"><img src="${state.visits[p.id].photo}" alt="${esc(p.name)}"></a>`).join("")}</div>` : `<div class="empty">Noch keine Fotos. Such dir einen Ort auf der Karte aus! 🗺️</div>`}

        ${state.favorites.length ? `<div class="section-title">Gemerkt <small>${state.favorites.length}</small></div><div class="place-list">${state.favorites.map(byId).filter(Boolean).map((p) => `<a class="place-row" href="#/place/${p.id}"><div class="pr-thumb ph">${placeArt(p, 0)}</div><div class="pr-body"><b>${esc(p.name)}</b><small>${CATEGORIES[p.cat].emoji} ${CATEGORIES[p.cat].label}</small></div><div class="pr-state ${isVisited(p.id) ? "done" : ""}">${isVisited(p.id) ? "✓" : "→"}</div></a>`).join("")}</div>` : ""}

        <div class="section-title">Einstellungen</div>
        <div class="settings">
          <button id="geoSet"><span>📍 Standort ${userPos ? "aktiv" : "aktivieren"}</span><span>${userPos ? "✓" : "→"}</span></button>
          <button id="renameSet"><span>✏️ Namen ändern</span><span>→</span></button>
          <button id="resetSet" class="danger"><span>🗑️ Fortschritt zurücksetzen</span><span>→</span></button>
        </div>
        <p class="note">Fair &amp; ehrlich: Bewertungen kommen nur von Leuten, die ein Foto vom Ort hochgeladen haben. Dein Standort wird nur auf deinem Gerät verwendet, um Entfernungen zu berechnen und Besuche zu verifizieren.${CONFIG.demoCommunity ? " (Prototyp: andere Studis sind Beispieldaten.)" : ""}</p>
      </div>`;
    $("#geoSet").onclick = () => startGeo(true);
    $("#renameSet").onclick = () => {
      openModal(`<div class="m-ic">✏️</div><h2>Neuer Name</h2><label class="field"><input id="newName" maxlength="20" value="${esc(u.name)}"></label><div class="btns"><button class="btn btn-primary btn-block" id="saveName">Speichern</button></div>`);
      $("#saveName").onclick = () => { const n = $("#newName").value.trim(); if (n) { state.user.name = n; save(); } closeModal(); renderProfile(); };
    };
    $("#resetSet").onclick = () => {
      openModal(`<div class="m-ic">⚠️</div><h2>Wirklich zurücksetzen?</h2><p>Alle Besuche, Fotos und Punkte gehen verloren.</p><div class="btns"><button class="btn btn-primary btn-block" id="doReset" style="background:#D33;box-shadow:none">Ja, alles löschen</button><button class="btn btn-outline btn-block" id="noReset">Abbrechen</button></div>`);
      $("#noReset").onclick = closeModal;
      $("#doReset").onclick = () => { localStorage.removeItem(STORE_KEY); location.hash = ""; location.reload(); };
    };
  }

  // ---------- Router ----------
  function updateScore() { $("#scorePill").textContent = `⭐ ${state.points}`; }
  function show(viewId) {
    ["view-map", "view-place", "view-quests", "view-profile"].forEach((v) => ($("#" + v).hidden = v !== viewId));
  }
  function route() {
    if (!state.user) return;
    const h = location.hash || "#/map";
    const [, page, arg] = h.split("/");
    document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === (page === "place" ? "" : page || "map")));
    if (page === "place") { show("view-place"); renderPlace(arg); $("#view-place").scrollTop = 0; }
    else if (page === "quests") { show("view-quests"); renderQuests(); $("#view-quests").scrollTop = 0; }
    else if (page === "profile") { show("view-profile"); renderProfile(); $("#view-profile").scrollTop = 0; }
    else { show("view-map"); if (map) setTimeout(() => map.invalidateSize(), 0); if (page === "map" && arg && byId(arg)) selectPlace(arg); }
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
    // Standort automatisch starten, wenn schon erlaubt
    if (state.geoAsked && navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((r) => { if (r.state === "granted") startGeo(false); }).catch(() => {});
    }
  }

  function boot() {
    $("#obLogo").innerHTML = LOGO;
    $("#fileInput").addEventListener("change", onFileChosen);
    window.addEventListener("hashchange", route);
    if (!state.user) {
      $("#onboarding").hidden = false;
      const go = () => {
        const name = $("#obName").value.trim();
        if (!name) { $("#obName").focus(); toast("Wie sollen dich die anderen nennen?"); return; }
        const colors = ["#FF7A1A", "#1FA2D6", "#2BB673", "#9B5DE5", "#F15BB5", "#E63946"];
        state.user = { name, color: colors[Math.floor(Math.random() * colors.length)] };
        save();
        location.hash = "#/map";
        startApp();
        // Nach GPS fragen (Default: an)
        setTimeout(() => {
          openModal(`<div class="m-ic">📍</div><h2>Standort erlauben?</h2><p>So zeigen wir dir, wie weit die Orte entfernt sind, und du bekommst <b>+${CONFIG.points.verified} Bonuspunkte</b>, wenn du vor Ort ein Foto machst.</p><div class="btns"><button class="btn btn-primary btn-block" id="geoYes">Standort erlauben</button><button class="btn btn-outline btn-block" id="geoNo">Später</button></div>`);
          $("#geoYes").onclick = () => { closeModal(); startGeo(true); };
          $("#geoNo").onclick = () => { closeModal(); state.geoAsked = true; save(); };
        }, 500);
      };
      $("#obStart").onclick = go;
      $("#obName").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    } else {
      startApp();
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
