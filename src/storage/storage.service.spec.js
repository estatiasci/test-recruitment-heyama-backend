const mockCloudinary = {
  config: jest.fn(),
  uploader: {
    upload_stream: jest.fn(),
    destroy: jest.fn(),
  },
};

jest.mock('cloudinary', () => ({ v2: mockCloudinary }));

const { StorageService } = require('./storage.service');

function createConfigService(overrides = {}) {
  const values = {
    CLOUDINARY_CLOUD_NAME: 'demo-cloud',
    CLOUDINARY_API_KEY: 'demo-key',
    CLOUDINARY_API_SECRET: 'demo-secret',
    ...overrides,
  };
  return { get: (key) => values[key] };
}

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('configure Cloudinary avec les identifiants fournis', () => {
      new StorageService(createConfigService());

      expect(mockCloudinary.config).toHaveBeenCalledWith({
        cloud_name: 'demo-cloud',
        api_key: 'demo-key',
        api_secret: 'demo-secret',
      });
    });

    it.each([
      ['CLOUDINARY_CLOUD_NAME'],
      ['CLOUDINARY_API_KEY'],
      ['CLOUDINARY_API_SECRET'],
    ])('lève une erreur si %s est manquant', (missingKey) => {
      const configService = createConfigService({ [missingKey]: undefined });

      expect(() => new StorageService(configService)).toThrow();
      expect(mockCloudinary.config).not.toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    it("télécharge le buffer et retourne l'URL sécurisée + le public_id", async () => {
      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options, callback) => ({
          end: () => {
            callback(null, {
              secure_url:
                'https://res.cloudinary.com/demo-cloud/image/upload/objects/generated-id.jpg',
              public_id: options.public_id,
            });
          },
        }),
      );

      const service = new StorageService(createConfigService());
      const file = { buffer: Buffer.from('image-bytes') };

      const result = await service.uploadFile(file);

      expect(result.url).toBe(
        'https://res.cloudinary.com/demo-cloud/image/upload/objects/generated-id.jpg',
      );
      expect(result.key).toMatch(/^objects\//);
    });

    it("rejette la promesse si Cloudinary retourne une erreur", async () => {
      const uploadError = new Error('Cloudinary indisponible');
      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options, callback) => ({
          end: () => {
            callback(uploadError, null);
          },
        }),
      );

      const service = new StorageService(createConfigService());
      const file = { buffer: Buffer.from('image-bytes') };

      await expect(service.uploadFile(file)).rejects.toBe(uploadError);
    });
  });

  describe('deleteFile', () => {
    it('supprime le fichier via son public_id', async () => {
      mockCloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

      const service = new StorageService(createConfigService());
      await service.deleteFile('objects/abc');

      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith(
        'objects/abc',
      );
    });
  });
});
