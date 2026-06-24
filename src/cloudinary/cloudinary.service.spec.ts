jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
    },
  },
}));

jest.mock('stream', () => ({
  Readable: {
    from: jest.fn(),
  },
}));

import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  let config: { getOrThrow: jest.Mock };

  beforeEach(() => {
    config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          CLOUDINARY_CLOUD_NAME: 'cloud-name',
          CLOUDINARY_API_KEY: 'api-key',
          CLOUDINARY_API_SECRET: 'api-secret',
        };
        return values[key];
      }),
    };
    jest.clearAllMocks();
  });

  it('configures cloudinary during construction', () => {
    new CloudinaryService(config as unknown as ConfigService);

    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'cloud-name',
      api_key: 'api-key',
      api_secret: 'api-secret',
    });
  });

  it('uploadFile resolves the secure url returned by cloudinary', async () => {
    const service = new CloudinaryService(config as unknown as ConfigService);
    const pipe = jest.fn();
    (Readable.from as jest.Mock).mockReturnValue({ pipe });
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_options: unknown, callback: (error: unknown, result?: { secure_url: string }) => void) => {
        callback(null, { secure_url: 'https://cdn.example.com/image.png' });
        return {};
      },
    );

    await expect(service.uploadFile(Buffer.from('image'), 'products')).resolves.toBe(
      'https://cdn.example.com/image.png',
    );
    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      { folder: 'products', resource_type: 'image' },
      expect.any(Function),
    );
    expect(Readable.from).toHaveBeenCalledWith(Buffer.from('image'));
    expect(pipe).toHaveBeenCalled();
  });
});
