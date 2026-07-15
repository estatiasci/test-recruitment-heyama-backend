const { Injectable, Dependencies } = require('@nestjs/common');
const { ConfigService } = require('@nestjs/config');
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');

@Injectable()
// @Dependencies() remplace le typage TS pour l'injection de dépendances en JS pur
@Dependencies(ConfigService)
class StorageService {
  constructor(configService) {
    const cloudName = configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = configService.get('CLOUDINARY_API_KEY');
    const apiSecret = configService.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Configuration Cloudinary manquante : CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET sont requis.',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
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
