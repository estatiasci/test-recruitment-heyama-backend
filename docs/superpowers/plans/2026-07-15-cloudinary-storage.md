# Migration du stockage vers Cloudinary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer Backblaze B2/S3 par Cloudinary comme backend de stockage des images de l'API, sans changer l'interface publique de `StorageService`.

**Architecture:** `StorageService` (`src/storage/storage.service.js`) est réécrit pour utiliser le SDK `cloudinary` (déjà dans `package.json`) au lieu de `@aws-sdk/client-s3`. `uploadFile(file)` et `deleteFile(key)` gardent la même signature, donc `ObjectsService`, `ObjectsController` et le schéma Mongo ne changent pas.

**Tech Stack:** NestJS (JS pur, décorateurs Babel), SDK `cloudinary` v2, Mongoose.

## Global Constraints

- Spec source : `docs/superpowers/specs/2026-07-15-cloudinary-storage-design.md`.
- Remplacement complet de B2/S3 : pas de mode hybride, pas de fallback (décision validée).
- L'interface publique de `StorageService` (`uploadFile(file) -> {url, key}`, `deleteFile(key)`) ne doit pas changer.
- Pas de migration des données déjà stockées sur B2 : hors périmètre.
- Le projet n'a aucune suite de tests automatisés (pas de Jest/Mocha installé) : la vérification se fait manuellement (démarrage de l'app + appels HTTP réels), comme prévu dans la spec.
- Variables d'environnement Cloudinary déjà présentes dans `.env` : `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

---

### Task 1: Réécrire `StorageService` pour utiliser Cloudinary

**Files:**
- Modify: `src/storage/storage.service.js` (réécriture complète)

**Interfaces:**
- Consumes: `ConfigService.get(key)` (déjà injecté), `uuidv4()` de `uuid` (déjà une dépendance), SDK `cloudinary` (déjà une dépendance).
- Produces: `StorageService.uploadFile(file: {buffer, originalname, mimetype}) -> Promise<{url: string, key: string}>`, `StorageService.deleteFile(key: string) -> Promise<void>`. Ces signatures sont consommées par `src/objects/objects.service.js` (inchangé, ne pas modifier).

- [ ] **Step 1: Remplacer le contenu de `src/storage/storage.service.js`**

```js
const { Injectable, Dependencies } = require('@nestjs/common');
const { ConfigService } = require('@nestjs/config');
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');

@Injectable()
// @Dependencies() remplace le typage TS pour l'injection de dépendances en JS pur
@Dependencies(ConfigService)
class StorageService {
  constructor(configService) {
    this.configService = configService;

    cloudinary.config({
      cloud_name: configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get('CLOUDINARY_API_KEY'),
      api_secret: configService.get('CLOUDINARY_API_SECRET'),
    });

    this.cloudinary = cloudinary;
  }

  /**
   * Télécharge un fichier vers Cloudinary et retourne son URL publique + son public_id.
   */
  uploadFile(file) {
    const publicId = `objects/${uuidv4()}`;

    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { public_id: publicId, resource_type: 'image' },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve({ url: result.secure_url, key: result.public_id });
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  /**
   * Supprime un fichier de Cloudinary à partir de son public_id.
   */
  async deleteFile(key) {
    await this.cloudinary.uploader.destroy(key);
  }
}

module.exports = { StorageService };
```

- [ ] **Step 2: Vérifier qu'il ne reste aucune référence à B2/S3 dans le code**

Run: `grep -rn "B2_\|aws-sdk\|S3Client" src/`
Expected: aucune sortie (no match).

- [ ] **Step 3: Commit**

```bash
git add src/storage/storage.service.js
git commit -m "feat: use Cloudinary instead of Backblaze B2 for image storage"
```

---

### Task 2: Retirer la dépendance `@aws-sdk/client-s3` et mettre à jour `package.json`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (régénéré par `npm install`)

**Interfaces:**
- Consumes: rien (tâche de nettoyage de dépendances).
- Produces: `package.json` sans `@aws-sdk/client-s3` dans `dependencies`, description mise à jour.

- [ ] **Step 1: Retirer la ligne `"@aws-sdk/client-s3": "^3.600.0",` de `dependencies` dans `package.json`**

- [ ] **Step 2: Mettre à jour le champ `description` de `package.json`**

Remplacer :
```json
"description": "API REST NestJS (JavaScript) pour gérer une collection d'objets (MongoDB + Cloudflare R2)",
```
Par :
```json
"description": "API REST NestJS (JavaScript) pour gérer une collection d'objets (MongoDB + Cloudinary)",
```

- [ ] **Step 3: Régénérer le lockfile et vérifier que le paquet est bien retiré**

Run: `npm install`
Expected: `package-lock.json` mis à jour, plus d'entrée `@aws-sdk/client-s3`. Vérifier avec `grep "@aws-sdk/client-s3" package-lock.json` → aucune sortie.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused @aws-sdk/client-s3 dependency"
```

---

### Task 3: Nettoyer les variables B2 du `.env`

**Files:**
- Modify: `.env`

**Interfaces:** aucune (fichier de config, pas de code).

- [ ] **Step 1: Supprimer du `.env` les lignes des variables B2 devenues inutiles**

Variables à retirer : `B2_BUCKET_NAME`, `B2_PUBLIC_URL`, `B2_REGION`, `B2_ENDPOINT`, `B2_KEY_ID`, `B2_APPLICATION_KEY`.

Note pour l'exécutant : si l'accès direct au fichier `.env` est bloqué par les permissions de l'environnement (fichier sensible), demander à l'utilisateur de supprimer ces lignes lui-même et passer à l'étape suivante une fois confirmé.

- [ ] **Step 2: Vérifier que les variables Cloudinary sont toujours présentes**

Run: `grep -c "CLOUDINARY_" .env`
Expected: `3` (les trois variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

- [ ] **Step 3: Commit (si l'exécutant a pu modifier le fichier — sinon skip, `.env` est dans `.gitignore`)**

Vérifier d'abord que `.env` est ignoré par git :
Run: `git check-ignore .env`
Expected: `.env` (confirmant qu'il est ignoré, donc pas de commit nécessaire — cette étape est informative uniquement).

---

### Task 4: Vérification manuelle de bout en bout

**Files:** aucun fichier modifié — vérification uniquement.

**Interfaces:** aucune (validation).

- [ ] **Step 1: Démarrer l'application**

Run: `npm run start:dev`
Expected: log `🚀 API démarrée sur http://localhost:3000` sans erreur de connexion Cloudinary/MongoDB.

- [ ] **Step 2: Créer un objet avec une image via l'API**

Run (dans un autre terminal, avec une image de test `test.jpg` à la racine) :
```bash
curl -s -X POST http://localhost:3000/objects \
  -F "title=Test Cloudinary" \
  -F "description=Vérification migration Cloudinary" \
  -F "imgFile=@test.jpg"
```
Expected: réponse JSON 201 avec `imageUrl` pointant vers un domaine `res.cloudinary.com` et `imageKey` de la forme `objects/<uuid>`.

- [ ] **Step 3: Vérifier l'image sur le dashboard Cloudinary**

Ouvrir le dashboard Cloudinary (Media Library) et confirmer la présence du fichier dans le dossier `objects/`.

- [ ] **Step 4: Lister les objets**

Run: `curl -s http://localhost:3000/objects`
Expected: tableau JSON contenant l'objet créé à l'étape 2.

- [ ] **Step 5: Supprimer l'objet créé**

Run: `curl -s -X DELETE http://localhost:3000/objects/<id_retourné_a_l_etape_2>`
Expected: réponse 200/204 sans erreur.

- [ ] **Step 6: Vérifier la suppression côté Cloudinary**

Rafraîchir le dashboard Cloudinary et confirmer que le fichier a disparu du dossier `objects/`.

- [ ] **Step 7: Arrêter le serveur de dev**

Interrompre le process `npm run start:dev` (Ctrl+C).
