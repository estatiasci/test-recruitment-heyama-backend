const { BadRequestException, NotFoundException } = require('@nestjs/common');
const { ObjectsService } = require('./objects.service');

function createMockObjectModel() {
  class MockObjectModel {
    constructor(data) {
      Object.assign(this, data);
    }
  }
  MockObjectModel.prototype.save = jest.fn(function save() {
    return Promise.resolve(this);
  });
  MockObjectModel.find = jest.fn();
  MockObjectModel.findById = jest.fn();
  MockObjectModel.findByIdAndDelete = jest.fn();
  return MockObjectModel;
}

function createMockStorageService() {
  return {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };
}

describe('ObjectsService', () => {
  let objectModel;
  let storageService;
  let service;

  beforeEach(() => {
    objectModel = createMockObjectModel();
    storageService = createMockStorageService();
    service = new ObjectsService(objectModel, storageService);
  });

  describe('create', () => {
    const validDto = { title: 'Chaise', description: 'Une chaise en bois' };
    const imgFile = { originalname: 'chaise.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('x') };

    it('rejette si le titre est manquant', async () => {
      await expect(
        service.create({ description: 'x' }, imgFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette si la description est manquante', async () => {
      await expect(
        service.create({ title: 'x' }, imgFile),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejette si le fichier image est manquant", async () => {
      await expect(service.create(validDto, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("télécharge l'image et enregistre l'objet avec l'URL/clé Cloudinary retournées", async () => {
      storageService.uploadFile.mockResolvedValue({
        url: 'https://res.cloudinary.com/demo/image/upload/objects/abc.jpg',
        key: 'objects/abc',
      });

      const result = await service.create(validDto, imgFile);

      expect(storageService.uploadFile).toHaveBeenCalledWith(imgFile);
      expect(result.title).toBe(validDto.title);
      expect(result.description).toBe(validDto.description);
      expect(result.imageUrl).toBe(
        'https://res.cloudinary.com/demo/image/upload/objects/abc.jpg',
      );
      expect(result.imageKey).toBe('objects/abc');
      expect(objectModel.prototype.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('retourne les objets triés par date de création décroissante', async () => {
      const exec = jest.fn().mockResolvedValue([{ title: 'a' }, { title: 'b' }]);
      const sort = jest.fn().mockReturnValue({ exec });
      objectModel.find.mockReturnValue({ sort });

      const result = await service.findAll();

      expect(objectModel.find).toHaveBeenCalled();
      expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual([{ title: 'a' }, { title: 'b' }]);
    });
  });

  describe('findOne', () => {
    it('retourne l\'objet trouvé', async () => {
      const exec = jest.fn().mockResolvedValue({ _id: '1', title: 'a' });
      objectModel.findById.mockReturnValue({ exec });

      const result = await service.findOne('1');

      expect(objectModel.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual({ _id: '1', title: 'a' });
    });

    it('lève une NotFoundException si l\'objet est introuvable', async () => {
      const exec = jest.fn().mockResolvedValue(null);
      objectModel.findById.mockReturnValue({ exec });

      await expect(service.findOne('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    function mockExistingObject(overrides = {}) {
      const doc = {
        _id: '1',
        title: 'Ancien titre',
        description: 'Ancienne description',
        save: jest.fn(),
        ...overrides,
      };
      doc.save.mockResolvedValue(doc);
      const exec = jest.fn().mockResolvedValue(doc);
      objectModel.findById.mockReturnValue({ exec });
      return doc;
    }

    it('rejette si ni title ni description ne sont fournis', async () => {
      mockExistingObject();

      await expect(service.update('1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejette si title est fourni mais vide', async () => {
      mockExistingObject();

      await expect(service.update('1', { title: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejette si description est fournie mais vide', async () => {
      mockExistingObject();

      await expect(
        service.update('1', { description: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('met à jour uniquement le titre quand seul title est fourni', async () => {
      const doc = mockExistingObject();

      const result = await service.update('1', { title: 'Nouveau titre' });

      expect(result.title).toBe('Nouveau titre');
      expect(result.description).toBe('Ancienne description');
      expect(doc.save).toHaveBeenCalled();
    });

    it('met à jour uniquement la description quand seule description est fournie', async () => {
      const doc = mockExistingObject();

      const result = await service.update('1', {
        description: 'Nouvelle description',
      });

      expect(result.title).toBe('Ancien titre');
      expect(result.description).toBe('Nouvelle description');
      expect(doc.save).toHaveBeenCalled();
    });

    it('met à jour title et description quand les deux sont fournis', async () => {
      mockExistingObject();

      const result = await service.update('1', {
        title: 'Nouveau titre',
        description: 'Nouvelle description',
      });

      expect(result.title).toBe('Nouveau titre');
      expect(result.description).toBe('Nouvelle description');
    });

    it("propage la NotFoundException si l'objet n'existe pas", async () => {
      const exec = jest.fn().mockResolvedValue(null);
      objectModel.findById.mockReturnValue({ exec });

      await expect(
        service.update('unknown', { title: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it("supprime l'image sur Cloudinary puis l'objet en base", async () => {
      const findByIdExec = jest
        .fn()
        .mockResolvedValue({ _id: '1', imageKey: 'objects/abc' });
      objectModel.findById.mockReturnValue({ exec: findByIdExec });

      const findByIdAndDeleteExec = jest.fn().mockResolvedValue(undefined);
      objectModel.findByIdAndDelete.mockReturnValue({
        exec: findByIdAndDeleteExec,
      });

      await service.remove('1');

      expect(storageService.deleteFile).toHaveBeenCalledWith('objects/abc');
      expect(objectModel.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(findByIdAndDeleteExec).toHaveBeenCalled();
    });

    it("lève une NotFoundException si l'objet est introuvable et ne supprime rien", async () => {
      const exec = jest.fn().mockResolvedValue(null);
      objectModel.findById.mockReturnValue({ exec });

      await expect(service.remove('unknown')).rejects.toThrow(
        NotFoundException,
      );
      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });
  });
});
