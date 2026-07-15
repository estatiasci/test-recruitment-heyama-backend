# Migration du stockage vers Cloudinary

## Contexte

L'API NestJS (JS pur, sans TypeScript) gère une collection d'"objets" (title,
description, image). Le stockage des images utilise actuellement Backblaze B2
via le SDK S3-compatible (`@aws-sdk/client-s3`). Le SDK `cloudinary` est déjà
présent dans `package.json` mais n'est utilisé nulle part.

## Objectif

Remplacer complètement Backblaze B2 par Cloudinary comme backend de stockage
des images, en gardant l'interface publique de `StorageService` inchangée
pour ne pas impacter `ObjectsService`, le contrôleur, ni le schéma Mongo.

## Design

### `StorageService` (`src/storage/storage.service.js`)

- Remplace `S3Client` par le SDK `cloudinary`, configuré via
  `cloudinary.config({ cloud_name, api_key, api_secret })` à partir de
  `ConfigService` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`).
- `uploadFile(file)` :
  - Upload du buffer Multer via `cloudinary.uploader.upload_stream`
    (streaming, pas de fichier temporaire sur disque).
  - Dossier Cloudinary : `objects/`.
  - `public_id` généré via `uuid` (cohérent avec la génération de clé
    actuelle), sans l'extension (Cloudinary gère le format automatiquement).
  - Retourne `{ url, key }` où `url = secure_url` et `key = public_id` complet
    (incluant le dossier, ex. `objects/<uuid>`), pour rester compatible avec
    la signature actuelle.
- `deleteFile(key)` :
  - Appelle `cloudinary.uploader.destroy(key)`.

### Schéma Mongo (`src/objects/schemas/object.schema.js`)

- Aucun changement de structure. `imageUrl` et `imageKey` sont conservés tels
  quels ; `imageKey` contient désormais un `public_id` Cloudinary au lieu
  d'une clé S3.

### `ObjectsService` / `ObjectsController`

- Aucun changement : ils dépendent uniquement de l'interface
  `uploadFile`/`deleteFile` de `StorageService`.

### Dépendances (`package.json`)

- Retrait de `@aws-sdk/client-s3` (plus utilisé).
- `cloudinary` reste (déjà présent).
- Mise à jour de la description du package (mentionne encore
  "Cloudflare R2").

### Configuration (`.env`)

- Suppression des variables B2 devenues inutiles : `B2_BUCKET_NAME`,
  `B2_PUBLIC_URL`, `B2_REGION`, `B2_ENDPOINT`, `B2_KEY_ID`,
  `B2_APPLICATION_KEY`.
- Les variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET` existent déjà dans le `.env` de l'utilisateur.

## Hors périmètre

- Pas de migration des données existantes (images déjà stockées sur B2) :
  hors périmètre, non demandé.
- Pas de mode hybride/configurable entre B2 et Cloudinary : remplacement
  complet et définitif, décision validée par l'utilisateur.

## Tests

- Vérification manuelle : démarrer l'app, créer un objet avec une image via
  `POST /objects`, vérifier que l'image apparaît sur le dashboard Cloudinary
  et que l'URL retournée est fonctionnelle, puis `DELETE /objects/:id` et
  vérifier la suppression côté Cloudinary.
- Pas de suite de tests automatisés existante dans le projet à ce jour.
