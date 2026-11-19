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
- Orte, Texte, Koordinaten: `data.js` (Koordinaten sind noch ungefähr – in Google Maps lange drücken, Zahlen kopieren)
- Sprache der App: Englisch (für alle Erasmus-Studis)

## Echtes Teilen mit Firebase (kostenlos)
Ohne Config läuft die App im **Demo-Modus** (Beispiel-Studis, alles nur auf dem eigenen Handy).
Mit Firebase sehen alle die Fotos, Bewertungen und Punkte der anderen – live.

1. https://console.firebase.google.com → **Projekt hinzufügen** (Google Analytics kannst du ausschalten).
2. Links **Build → Authentication → Jetzt starten → Sign-in method → Anonym → aktivieren**.
3. Links **Build → Firestore Database → Datenbank erstellen** → Standort `eur3 (europe-west)` → *Produktionsmodus*.
4. In Firestore auf den Tab **Regeln**, alles löschen, den Inhalt von [`firestore.rules`](firestore.rules) einfügen → **Veröffentlichen**.
5. Zahnrad ⚙️ → **Projekteinstellungen** → unten **Web-App hinzufügen** (`</>`) → Namen eingeben → die angezeigten
   Werte (`apiKey`, `authDomain`, `projectId`, …) in [`firebase-config.js`](firebase-config.js) eintragen.
6. Fertig. Oben im Profil steht jetzt „🟢 live“ statt „demo“.

Hinweise:
- Der `apiKey` von Firebase ist **kein Geheimnis** und darf öffentlich im Code stehen; geschützt wird alles durch die Regeln.
- Es wird nur Firestore benutzt (kein Firebase Storage) – Fotos werden auf ~800 px verkleinert und passen in den kostenlosen Spark-Plan.
- Jedes Handy bekommt eine anonyme ID. Jede:r kann alles lesen, aber nur die eigenen Einträge schreiben/löschen.
  Bewerten geht laut Regeln nur, wenn man an dem Ort schon ein Foto hochgeladen hat.
- Der Standort wird **nie** hochgeladen, nur Name, Farbe, Punkte, Besuche, Bewertungen und geteilte Fotos.
