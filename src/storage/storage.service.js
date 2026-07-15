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
