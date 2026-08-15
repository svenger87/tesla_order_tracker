# Überarbeitung der kompletten Site

Arbeitsliste. Nicht eingecheckt (siehe .gitignore).
Stand: 2026-08-15. Branch `fix/audit-sofort-massnahmen` → staging.

Legende: `[ ]` offen · `[x]` erledigt und verifiziert · `[~]` in Arbeit · `[?]` braucht Entscheidung von Sven

---

## A — Durchgehende Hülle  ✅

Kopf- und Fußzeile stehen heute in genau einer Datei (`HomeClient.tsx`). Jede
andere Seite ist eine Insel: keine Navigation, kein Sprachumschalter, kein
Themenwechsel, keine Marke. Das ist die größte verbleibende Lücke.

- [x] A1 `SiteShell` als Server-Komponente: Einstellungen laden, Admin-Status
      serverseitig über `getAdminFromCookie()` statt Client-Rundreise,
      Bestellzähler über zwei billige `count()`-Abfragen
- [x] A2 Layout rendert die Hülle um `children`
- [x] A3 Kopf-/Fußzeile aus `HomeClient` entfernen (sonst doppelt)
- [x] A4 Jede Route prüfen: `/`, `/new`, `/track/[name]`, `/impressum`,
      `/datenschutz`, `/docs`, `/admin`, `/admin/login`
- [x] A5 Abstände prüfen — die Seiten haben heute eigene Außenabstände, die mit
      einer Hülle doppelt wirken könnten

## B — Fehler- und Ladezustände  ✅

Es gibt weder `not-found`, `error`, `loading` noch `global-error`. Eine falsche
URL liefert die nackte Next.js-Vorgabe auf Englisch, ohne Weg zurück, weiß
unabhängig vom Dunkelmodus.

- [x] B1 `not-found.tsx` — übersetzt, gebrandet, mit Auswegen
- [x] B2 `error.tsx` — Client-Komponente mit `reset()`
- [x] B3 `global-error.tsx` — greift, wenn das Layout selbst bricht
- [x] B4 `loading.tsx` — die Startseite ist `force-dynamic`, bei langsamer
      Datenbank steht sonst nichts da
- [x] B5 Neue Zeichenketten nach `messages/de.json` (Crowdin-Quelle) und
      `en.json`; die übrigen 21 Sprachen zieht Crowdin nach
- [x] B6 **Nachgezogen:** Genau dadurch stand auf der französischen 404 als
      Überschrift `errors.pageNotFoundTitle`. Es gab keinen Nachrichten-Fallback
      — jeder neue Schlüssel hätte bis zum Crowdin-Lauf seinen Pfad gezeigt.
      `mergeMessages` legt jede Übersetzung schlüsselweise über die Quelle;
      7 Tests, testgetrieben. Auf Staging über 7 Sprachen geprüft.

## C — Dunkelmodus-Reste  ✅

Das System steht: 529 Token-Nutzungen gegen ~40 rohe Farben ohne
Dunkel-Gegenstück. Es sind Nachzügler, kein struktureller Mangel.

- [x] C1 Fahrzeugbild: `bkba_opt=2` brennt einen weißen Hintergrund ein, der im
      Dunkelmodus als weißer Block steht (`TeslaCarImage.tsx:183`)
- [x] C2 Rohe Farben ohne `dark:`-Variante auflisten und ersetzen
- [x] C3 Jede Seite im Dunkelmodus ansehen

## D — Admin-Bereich

Nach Codelage der ungepflegteste Teil. Ich habe keine Zugangsdaten, kann also
nur den Code prüfen, nicht die Darstellung.

- [x] D1 Rohe Farben in `SettingsTab` (13), `ImportExportTab` (12),
      `CompositorTab`, `OptionsManager`
- [?] D2 Sichtprüfung — braucht Zugang oder Svens Blick

## E — Unfertige Funktionen  ✅

- [x] E1 `ConfigDeliveryInsights` — Median-Wartezeit je Konfiguration, wird
      nirgends eingebunden. Verdrahten oder verwerfen?
- [x] E2 `TransparencyBar` — Serverkosten-Balken. Spalte `yearlyGoal` existiert,
      nichts liest sie. Nicht anschlussfertig: „Serverkosten" fest auf Deutsch,
      rohes `bg-green-500` statt Token.

## F — Kleinkram

- [x] F1 Spalte „Lieferfenster" ist knapp zu schmal — 3 von 155 Zellen
      schneiden um 10–19 px ab
- [?] F2 `/u/script.js` liefert auf Staging 404: `UMAMI_WEBSITE_ID` ist gesetzt,
      `/u/` aber nicht durchgereicht. Liegt in der Server-Umgebung, nicht im
      Repo — entweder Variable entfernen oder Analyse auch für Staging proxen.

---

## Erledigt in dieser Sitzung (vor dieser Liste)

- Formular-Vereinheitlichung: 1374 → 984 Zeilen, Feld-Inventur identisch
- Suchsprung ohne DOM-Raten, `data-quarter` statt Textvergleich
- Zugängliche Namen für alle Icon-Buttons (erst unvollständig, dann per
  Quelltext-Prüfung vervollständigt)
- Diagrammfarben: Ampelskala und Rangstreifen entfernt
- Drei tote Komponenten gelöscht (495 Zeilen)
- `/api/options`: vierfacher Abruf → Bündelung + ETag
- Swagger-Stylesheet nicht mehr auf jeder Seite
- Sicherheits-Kopfzeilen für Staging + der Bind-Mount-Fund, durch den **jede**
  Caddy-Änderung seit Containererstellung ins Leere lief
