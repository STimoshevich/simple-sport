# SimpleSport

Angular + Capacitor app in an **Nx** workspace.

- `libs/shared` — reusable UI, models, and utilities (`@simple-sport/shared`)
- `libs/integration` — Capacitor / SQLite and other native adapters (`@simple-sport/integration`)

## Quick start

```bash
yarn install
yarn start
```

The workspace uses **Yarn 1** only (`packageManager` in `package.json`). Do not add `package-lock.json`.

Useful commands:

```bash
yarn start          # nx serve simple-sport
yarn build          # production build
yarn test           # all projects, Vitest via @angular/build:unit-test
yarn lint           # Nx lint for every project
nx graph
```

## Mobile (WebView)

### iOS

```bash
yarn mobile:ios
```

### Android

```bash
yarn mobile:android
```

These scripts build the app, sync Capacitor, and open the native project.
