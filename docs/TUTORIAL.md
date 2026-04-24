# VocalBooth Examination App - Setup & Deployment Guide

## 1. Firebase Firestore Setup

This application uses Firebase Firestore for authentication. Follow these steps to configure your database correctly.

### Prerequisites
1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project or select your existing project (`pronunciation-examination`).
3.  Navigate to **Firestore Database** in the sidebar.
4.  Click **Create Database** (Select "Start in production mode" or "test mode" depending on your phase).

### Database Structure
You need to create a specific collection and document structure for the login to work.

1.  **Create Collection**:
    *   Click "Start collection".
    *   **Collection ID**: `Cedar` (Case sensitive).

2.  **Add User Documents**:
    *   The **Document ID** must be the student's **Full Name**.
    *   Inside the document, add a field for the password.

### Data Entry Example
To add a user named "Asep Sadboy":

*   **Collection**: `Cedar`
*   **Document ID**: `Asep Sadboy`
*   **Field**: `Password`
    *   **Type**: `string`
    *   **Value**: `Siluman, March 13, 2013` (Format: Place, Month Day, Year)

**Visual Hierarchy:**
```text
(Collection) Cedar
    └── (Document) "Asep Sadboy"
          └── (Field) Password: "Siluman, March 13, 2013"
```

## 2. Firebase Security Rules

Agar aplikasi dapat membaca data pengguna untuk proses login, Anda harus mengatur **Firestore Rules**. Jika tidak diatur, aplikasi akan menolak akses ("Missing or insufficient permissions").

1.  Buka tab **Firestore Database** > **Rules** di Firebase Console.
2.  Hapus aturan yang ada dan ganti dengan kode berikut:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Izinkan membaca (read) koleksi 'Cedar' untuk verifikasi login
    // Tapi tolak penulisan (write) dari aplikasi web demi keamanan data
    match /Cedar/{document=**} {
      allow read: if true;
      allow write: if false;
    }
    
    // Tolak akses ke koleksi lain secara default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
3.  Klik tombol **Publish**.

## 3. Login Instructions

When accessing the application:

1.  **Full Name**: Enter the exact Document ID you created (e.g., `Asep Sadboy`).
2.  **Password**: Enter the exact string stored in the Password field (e.g., `Siluman, March 13, 2013`).

*Note: The system checks for an exact match, including spaces and capitalization.*

## 4. Deployment to GitHub Pages (Local Method)

Since this project uses **Vite** and **React**, you can easily deploy it to GitHub Pages.

### Step 1: Install `gh-pages`
Open your terminal in the project root and run:
```bash
npm install gh-pages --save-dev
```

### Step 2: Update `vite.config.ts`
Add the `base` property to your configuration. This ensures assets are loaded correctly.

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Replace 'repo-name' with the actual name of your GitHub repository
  base: '/repo-name/', 
})
```

### Step 3: Configure `package.json`
Add the `homepage` URL and the `deploy` scripts.

```json
{
  "name": "pronunciation-exam",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  // Replace variables with your actual GitHub username and repo name
  "homepage": "https://username.github.io/repo-name",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  // ... dependencies
}
```

### Step 4: Deploy
Run the deployment script:
```bash
npm run deploy
```
This command will build your project (creating a `dist` folder) and push it to the `gh-pages` branch of your repository.

### Step 5: GitHub Settings
1.  Go to your GitHub repository.
2.  Click on **Settings** > **Pages**.
3.  Ensure **Source** is set to `Deploy from a branch`.
4.  Ensure **Branch** is set to `gh-pages` / `/(root)`.

Your application should now be live at the URL specified in your `homepage` field!

## 5. Deploy Langsung dari GitHub (Tanpa PC/Terminal)

Jika Anda tidak memiliki akses ke PC atau Terminal (misalnya menggunakan HP/Tablet), Anda bisa menggunakan fitur **GitHub Actions** untuk deploy otomatis tanpa perlu menjalankan perintah `npm run build` secara manual.

### Langkah 1: Persiapan File di GitHub
1.  Buat **Repository** baru di GitHub.
2.  Upload semua file project ini ke repository tersebut (bisa menggunakan tombol **Add file** > **Upload files** pada tampilan web GitHub).
3.  Pastikan file utama seperti `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json` berada di halaman utama (root) repository, bukan di dalam sub-folder.

### Langkah 2: Edit Konfigurasi Vite
1.  Buka file `vite.config.ts` di GitHub.
2.  Klik ikon pensil (**Edit this file**).
3.  Tambahkan/Edit baris `base` agar sesuai dengan nama repository Anda:
    ```typescript
    export default defineConfig({
      plugins: [react()],
      base: '/nama-repository-anda/', // <--- PENTING: Ganti dengan nama repo Anda
    })
    ```
4.  Klik **Commit changes**.

### Langkah 3: Buat Workflow Otomatis
1.  Di dalam repository GitHub Anda, klik tab **Actions**.
2.  Klik **New workflow** (jika belum ada) atau pilih "set up a workflow yourself".
3.  Beri nama file: `deploy.yml`.
4.  Hapus semua isi default di editor teks, lalu Copy & Paste kode berikut:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"] # Pastikan ini sesuai dengan branch utama Anda (main atau master)
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```
5.  Klik tombol hijau **Commit changes** di pojok kanan atas.

### Langkah 4: Aktifkan GitHub Pages
1.  Masuk ke tab **Settings** di repository Anda.
2.  Pilih menu **Pages** di sidebar kiri.
3.  Pada bagian **Build and deployment** > **Source**, ubah pilihan dari "Deploy from a branch" menjadi **GitHub Actions**.
4.  GitHub akan otomatis mendeteksi workflow yang baru saja Anda buat.
5.  Tunggu sekitar 2-3 menit. Refresh halaman Settings > Pages tersebut.
6.  Link website Anda akan muncul di bagian atas (contoh: `https://username.github.io/nama-repository/`).
