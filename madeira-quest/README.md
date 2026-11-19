# Madeira Quest 🗺️📸

Mobile Web-App (Persuasive Computing Gruppenprojekt): Erasmus-Studis in Funchal entdecken lokale Orte,
laden ein Foto hoch, schalten damit die geteilte Galerie frei und bewerten den Ort.

## Features
- **Karte von Funchal** (Leaflet + OpenStreetMap/CARTO) mit Pins nach Kategorie und **Bewertung direkt auf der Karte**
- **GPS**: fragt nach dem Standort, zeigt Entfernung + Gehzeit, verifiziert Besuche vor Ort (Bonuspunkte)
- **Ortsseite** (wie Skizze): Name + Stern (merken), Bilder, Bewertung, Beschreibung, „Foto hochladen“
- **Foto hochladen → Galerie freischalten** (vorher verschwommen + Schloss), danach bewerten
- **Level 1 / Level 2**: Level 2 wird nach 4 besuchten Level-1-Orten freigeschaltet
- **Gamification**: Punkte, Abzeichen, Rangliste, Streak, Wochen-Challenge mit Countdown

### Persuasive-Prinzipien
| Prinzip | Umsetzung |
|---|---|
| Fogg (Motivation/Ability/Trigger) | Entfernung + „Route“-Button senken die Hürde, Streak-Hinweis als Trigger |
| Social Proof | „X Studis aus deiner Gruppe waren schon hier“, Avatare, Rangliste |
| Consistency | Fortschrittsbalken, Level-System, Serie |
| Scarcity | gesperrte Galerie & Level 2, Wochen-Challenge mit echtem Countdown |
| Loss Aversion | „Besuche heute einen Ort, sonst ist deine Serie weg!“ |
| Default Effect | Teilen in der Galerie ist standardmäßig an, Standort-Abfrage beim Start |
| Ethik | Bewerten nur nach Foto-Upload, echte Fristen, Standort bleibt auf dem Gerät |

## Starten
Einfach `index.html` über einen Webserver öffnen, z. B.:
```bash
cd madeira-quest
python3 -m http.server 8000
```
→ http://localhost:8000

**GPS funktioniert auf dem Handy nur über HTTPS.** Am einfachsten: GitHub Pages aktivieren
(Settings → Pages → Branch wählen) und den Link `…/madeira-quest/` an die Gruppe schicken.

## Anpassen
- Orte, Texte, Koordinaten: `data.js` (Koordinaten sind ungefähr – in Google Maps lange drücken, Zahlen kopieren)
- `CONFIG.demoCommunity`: Beispiel-Studis/Fotos für den Prototyp an/aus
- Daten werden aktuell lokal im Browser gespeichert. Für eine *echte* geteilte Galerie zwischen
  mehreren Handys braucht es ein Backend (z. B. Firebase oder Supabase).
