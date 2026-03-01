# Project Kant 2.0 🤠

Aplikacja webowa do zarządzania kantami i postaciami w klimacie Deadlands.

## Widoki

- **Stół Karciany** 🃏 — karta pojedynczego kanta/sztuczki
- **Rejestr Kantów** 📕 — tabela z filtrowaniem i szczegółami
- **Biuro Szeryfa** 🔧 — zarządzanie postaciami, znanymi kantami i księgami

## Wymagania

- Node.js 18+
- konto [Supabase](https://supabase.com)
- repozytorium na GitHub (do publikacji na GitHub Pages)

## Uruchomienie lokalne

1. **Sklonuj repozytorium**

    ```bash
    git clone https://github.com/Grobarch/Project-Kant.git
    cd Project-Kant
    ```

2. **Zainstaluj zależności**

    ```bash
    npm install
    ```

3. **Skonfiguruj zmienne środowiskowe**

    ```bash
    cp .env.example .env.local
    ```

    Uzupełnij `.env.local` wartościami z Supabase Dashboard:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`

4. **Uruchom dev server**

    ```bash
    npm run dev
    ```

    Domyślnie: `http://localhost:8000`.

## Konfiguracja bazy (Supabase)

1. W Supabase utwórz projekt i włącz Email/Password w Auth.
2. Utwórz wymagane tabele (`profiles`, `characters`, `spells`, `known_spells`, `spellbooks` i tabele powiązane).
3. Wykonaj skrypty SQL z repozytorium w Supabase SQL Editor (pliki `fix-*.sql` i inne skrypty korekcyjne).
4. Zweryfikuj RLS dla `spells` oraz tabel użytkownika (owner/admin).

> W repozytorium znajdują się skrypty naprawcze (np. polityki RLS). Traktuj je jako migracje korekcyjne do istniejącej struktury.

## Build produkcyjny

```bash
npm run build
```

Wynik trafia do folderu `dist/`.

Podgląd builda lokalnie:

```bash
npm run preview
```

## Jak wdrożyć projekt samodzielnie (GitHub Pages)

### 1) Przygotuj repo

- Wypchnij kod na gałąź główną:

   ```bash
   git add .
   git commit -m "Prepare production deploy"
   git push origin main
   ```

### 2) Sprawdź `base` w Vite

W pliku `vite.config.js` ustaw `base` zgodnie z nazwą repo:

- dla repo `Project-Kant`: `base: '/Project-Kant/'`
- dla innej nazwy repo: `base: '/NAZWA-REPO/'`

### 3) Dodaj workflow GitHub Actions

Utwórz plik `.github/workflows/deploy-pages.yml`:

```yml
name: Deploy to GitHub Pages

on:
   push:
      branches: [main]
   workflow_dispatch:

permissions:
   contents: read
   pages: write
   id-token: write

concurrency:
   group: pages
   cancel-in-progress: true

jobs:
   build:
      runs-on: ubuntu-latest
      steps:
         - name: Checkout
            uses: actions/checkout@v4

         - name: Setup Node
            uses: actions/setup-node@v4
            with:
               node-version: 20
               cache: npm

         - name: Install
            run: npm ci

         - name: Build
            run: npm run build
            env:
               VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
               VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

         - name: Upload artifact
            uses: actions/upload-pages-artifact@v3
            with:
               path: dist

   deploy:
      environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
      runs-on: ubuntu-latest
      needs: build
      steps:
         - name: Deploy
            id: deployment
            uses: actions/deploy-pages@v4
```

### 4) Ustaw sekrety repozytorium

W GitHub: `Settings` → `Secrets and variables` → `Actions`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 5) Włącz Pages

W GitHub: `Settings` → `Pages`:

- **Source**: `GitHub Actions`

Po pushu do `main` deployment wykona się automatycznie.

## Smoke test po wdrożeniu

- otwiera się aplikacja i ładuje lista kantów,
- działają filtry i wyszukiwarka,
- działa logowanie i wylogowanie,
- działa widok kart i modal efektów,
- panel zarządzania działa zgodnie z rolą użytkownika,
- operacje CRUD respektują RLS (owner/admin).

## Technologia

- Frontend: HTML5 + CSS3 + Vanilla JavaScript
- Build: Vite
- Backend: Supabase (PostgreSQL + Auth + RLS)
- Hosting: GitHub Pages

## Release notes

Szczegóły ostatnich zmian znajdziesz w [CHANGELOG.md](CHANGELOG.md).

## Bezpieczeństwo

Nie commituj `.env.local` ani tajnych kluczy. W pipeline używaj wyłącznie GitHub Secrets.

## Licencja

ISC
