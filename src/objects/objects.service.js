const {
  Injectable,
  Dependencies,
  BadRequestException,
  NotFoundException,
} = require('@nestjs/common');
const { getModelToken } = require('@nestjs/mongoose');
const { StorageService } = require('../storage/storage.service');
const { OBJECT_MODEL_NAME } = require('./schemas/object.schema');

@Injectable()
// En JS pur, pas de métadonnées de type : on déclare explicitement les
// dépendances à injecter dans l'ordre des paramètres du constructeur.
@Dependencies(getModelToken(OBJECT_MODEL_NAME), StorageService)
class ObjectsService {
  constructor(objectModel, storageService) {
    this.objectModel = objectModel;
    this.storageService = storageService;
  }

  async create(dto, imgFile) {
    const { title, description } = dto || {};

    if (!title || typeof title !== 'string') {
      throw new BadRequestException(
        'Le champ "title" est requis et doit être une chaîne de caractères.',
      );
    }
    if (!description || typeof description !== 'string') {
      throw new BadRequestException(
        'Le champ "description" est requis et doit être une chaîne de caractères.',
      );
    }
    if (!imgFile) {
      throw new BadRequestException('Le fichier image (imgFile) est requis.');
    }

    // 1. Télécharger l'image vers le stockage S3-compatible (Backblaze B2)
    const { url, key } = await this.storageService.uploadFile(imgFile);

    // 2. Enregistrer l'objet en base MongoDB avec l'URL de l'image
    const createdObject = new this.objectModel({
      title,
      description,
      imageUrl: url,
      imageKey: key,
    });

    return createdObject.save();
  }

  async findAll() {
    return this.objectModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id) {
    const object = await this.objectModel.findById(id).exec();
    if (!object) {
      throw new NotFoundException(`Objet avec l'id ${id} introuvable.`);
    }
    return object;
  }

  async remove(id) {
    const object = await this.findOne(id); // lève une 404 si non trouvé

    // 1. Supprimer l'image du stockage S3
    await this.storageService.deleteFile(object.imageKey);

    // 2. Supprimer l'objet de MongoDB
    await this.objectModel.findByIdAndDelete(id).exec();
  }
}

module.exports = { ObjectsService };
