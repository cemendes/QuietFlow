# 🛠️ QuietFlow Development & Testing Guide

This guide covers running, testing, and debugging QuietFlow locally for both Web and Desktop platforms.

---

## 💻 Environment Setup

### 1. Requirements
- **Node.js**: v18.0 or later
- **Rust**: v1.75 or later (via `rustup`)
- **macOS / Linux dependencies** (for native window compilation):
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

---

## 🏃 Running the Application

Navigate to the application root directory:
```bash
cd "to-do app"
```

### Web Browser Mode (Fast UI Iteration)
```bash
npm run dev
```
Open `http://localhost:5173` in your browser. In browser mode, QuietFlow uses the in-memory mock vault engine with instant reload.

### Desktop App Mode (Native macOS / Windows / Linux)
```bash
npm run tauri dev
```
Runs the Vite development server and launches the native Tauri desktop window with live reload.

---

## 🧪 Testing Protocol

QuietFlow enforces strict testing across unit, component, and full user journeys.

### 1. Run Vitest Component & Unit Tests (18 Suites)
```bash
npm test
```

### 2. Type Checking & Bundle Verification
```bash
npm run build
```

### 3. Rust Desktop Core Check
```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

### 4. Playwright User Journey Tests
```bash
npx playwright test tests/e2e/playwright-user-journey.spec.ts
```

---

## 📦 Building Installers

### macOS DMG Installer
```bash
npm run tauri build
```
Output: `src-tauri/target/release/bundle/dmg/QuietFlow_0.1.0_aarch64.dmg`

### Windows EXE & Linux DEB
Automatically compiled via GitHub Actions on every release tag or push to `main` via `.github/workflows/release.yml`.
