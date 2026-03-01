# Changelog

Wszystkie istotne zmiany w projekcie będą dokumentowane w tym pliku.

## [2026-03-02] - UI Modernization Release

### Added
- Nowy dashboardowy układ głównego widoku (hero + dynamiczny opis aktywnego widoku).
- Kafelki statystyk w top sekcji:
  - łączna liczba wpisów,
  - liczba kantów,
  - liczba sztuczek,
  - liczba postaci użytkownika.
- Dynamiczne aktualizowanie statystyk w zależności od stanu danych, logowania i przełączania widoków.

### Changed
- Kompletny redesign warstwy wizualnej w stylu nowoczesnego panelu aplikacji:
  - odświeżony header,
  - nowy shell widoków,
  - spójniejsze panele, formularze i przyciski,
  - lepsza responsywność (desktop/tablet/mobile).
- Ulepszony wygląd karty zaklęcia (`game-card`):
  - lepsza hierarchia typografii,
  - wyraźniejsze sekcje metadanych,
  - czytelniejszy blok opisu,
  - dopracowane akcje w stopce.
- Zmodernizowany modal efektów (widok `Zobacz Efekty`) w tej samej estetyce co karta.
- Ujednolicony wygląd rozwijanego panelu szczegółów w tabeli `Rejestr Kantów`:
  - layout szczegółów,
  - style sekcji efektów,
  - style akcji.

### Fixed
- Spójność liczników statystyk po wylogowaniu i utracie sesji (reset liczby postaci przy cleanupie sesji).

### Validation
- Build produkcyjny zakończony powodzeniem:
  - `npm run build` (Vite) ✅
- Preview uruchomione lokalnie i gotowe do szybkiego smoke testu:
  - `npm run preview -- --host 127.0.0.1 --port 4173` ✅

### Scope
- Zmiany skupione na warstwie UI/UX.
- Bez zmian w API i bez migracji schematu bazy danych w ramach tej paczki UI.
