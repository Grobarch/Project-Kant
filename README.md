# Project Kant 2.0 🤠

Księga charakterów i kantów (zaklęć) dla gry RPG w stylu Deadlands.

## Struktura

- **Stół Karciany** 🃏 - Widok kartkowy postaci z ich statystykami
- **Rejestr Kantów** 📕 - Tabela wszystkich dostępnych zaklęć
- **Biuro Szeryfa** 🔧 - Panel zarządzania dla administratorów i własnych kandłów

## Wymagania

- Node.js 16+
- Konto [Supabase](https://supabase.com) (darmowe)

## Instalacja

1. **Klonuj projekt:**
   ```bash
   git clone https://github.com/Grobarch/Project-Kant.git
   cd Project\ Kant
   ```

2. **Zainstaluj zależności:**
   ```bash
   npm install
   ```

3. **Skonfiguruj Supabase:**
   - Skopiuj `.env.example` na `.env.local`:
     ```bash
     cp .env.example .env.local
     ```
   - Otwórz `.env.local` i wstaw swoje klucze z [Supabase Dashboard](https://supabase.com/dashboard):
     - `VITE_SUPABASE_URL` - URL Twojego projektu Supabase
     - `VITE_SUPABASE_ANON_KEY` - Publiczny klucz "anon"

4. **Uruchom serwer deweloperski:**
   ```bash
   npm run dev
   ```
   Aplikacja otworzy się w przeglądarce na `http://localhost:8000`

## Build

Aby zbudować wersję produkcyjną:
```bash
npm run build
```

Pliki wyjściowe pojawią się w folderze `dist/`.

## Deployment na GitHub Pages

1. Push kod do GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. W ustawieniach repozytorium (Settings → Pages):
   - Source: **Deploy from a branch**
   - Branch: **main** / folder: **/dist**

3. GitHub Actions automatycznie zbuduje i deployuje Twoją aplikację.

## Funkcje

### Zarządzanie postaciami
- ✅ Tworzenie nowych postaci (Kanciarzy)
- ✅ Edycja imienia i zdjęcia
- ✅ Usuwanie postaci z potwierdzeniem
- ✅ Przegląd znanych kantów i ksiąg zaklęć

### Zarządzanie kantami (zaklęciami)
- ✅ Dodawanie nowych kantów (admin + użytkownicy)
- ✅ Edycja własnych kantów
- ✅ Usuwanie własnych kantów
- ✅ Przypisywanie kantów do charakterów
- ✅ Tworzenie osobistych ksiąg zaklęć

### Bezpieczeństwo
- ✅ Autentykacja przez email/hasło
- ✅ Row Level Security (RLS) w bazie danych
- ✅ Użytkownicy mogą zarządzać tylko swoimi resources
- ✅ Role administratora dla zarządzania systemem

## Struktura bazy danych

Projekt używa Supabase PostgreSQL z następującymi tabelami:

- **auth.users** - Użytkownicy Supabase
- **profiles** - Profile użytkowników + flaga is_admin
- **characters** - Postaci graczy
- **spells** - Dostępne kanty (zaklęcia)
- **known_spells** - Kanty przypisane do postaci
- **spellbooks** - Osobiste księgi zaklęć

Wszystkie tabele chronione są politykami RLS.

## Technologia

- **Frontend:** HTML5 + CSS3 + Vanilla JavaScript
- **Build:** Vite + esbuild
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Hosting:** GitHub Pages

## Licencja

ISC

## Autor

Grobarch

---

**Uwaga:** Klucze Supabase są przechowywane w `.env.local`, która jest ignorowana przez Git. Nigdy nie commituj pliku `.env.local` - będzie zablokowany przez `.gitignore`.
