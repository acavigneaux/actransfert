# ACTransfert

Transfert de fichiers simplifie. 100% cote client.

## Fonctionnalites

- Entree du nom d'utilisateur pour identifier le transfert
- Drag & drop de fichiers et dossiers
- Compression automatique en ZIP (dossiers ou fichiers multiples)
- Renommage au format `{username}_{YYYYMMDD}_{HHmm}.{ext}`
- Telechargement automatique via le navigateur
- Zero backend, tout se passe dans le navigateur

## Stack

- Next.js 14 (App Router, export statique)
- TypeScript
- Tailwind CSS
- JSZip
- file-saver

## Developpement

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Le site statique est genere dans le dossier `out/`.
