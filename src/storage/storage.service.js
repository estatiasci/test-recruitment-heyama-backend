const { Injectable, Dependencies } = require('@nestjs/common');
const { ConfigService } = require('@nestjs/config');
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

@Injectable()
// @Dependencies() remplace le typage TS pour l'injection de dépendances en JS pur
@Dependencies(ConfigService)
class StorageService {
  constructor(configService) {
    this.configService = configService;
    this.bucketName = configService.get('B2_BUCKET_NAME');
    this.publicUrl = configService.get('B2_PUBLIC_URL');

    // Backblaze B2 est compatible avec l'API S3 : on utilise le SDK AWS S3
    // (une simple librairie cliente, aucune dépendance réelle à AWS) en
    // pointant vers l'endpoint S3-compatible de B2.
    this.s3Client = new S3Client({
      region: configService.get('B2_REGION'), // ex: "us-west-002"
      endpoint: configService.get('B2_ENDPOINT'), // ex: https://s3.us-west-002.backblazeb2.com
      credentials: {
        accessKeyId: configService.get('B2_KEY_ID'),
        secretAccessKey: configService.get('B2_APPLICATION_KEY'),
      },
    });
  }

  /**
   * Télécharge un fichier vers le bucket B2 et retourne son URL publique + sa clé.
   */
  async uploadFile(file) {
    const extension = file.originalname.split('.').pop();
    const key = `objects/${uuidv4()}.${extension}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    return { url, key };
  }

  /**
   * Supprime un fichier du bucket B2 à partir de sa clé.
   */
  async deleteFile(key) {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }
}

module.exports = { StorageService };
