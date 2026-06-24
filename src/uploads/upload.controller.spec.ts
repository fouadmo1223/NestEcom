import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

describe('UploadController', () => {
  let controller: UploadController;
  let service: {
    fileResponse: jest.Mock;
    filesResponse: jest.Mock;
    deleteFile: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      fileResponse: jest.fn(),
      filesResponse: jest.fn(),
      deleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [{ provide: UploadService, useValue: service }],
    }).compile();

    controller = module.get(UploadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('uploadImage throws when no file is provided', () => {
    expect(() => controller.uploadImage(undefined as any)).toThrow(BadRequestException);
    expect(service.fileResponse).not.toHaveBeenCalled();
  });

  it('uploadImage delegates to the service when a file is provided', () => {
    const file = { filename: 'image.png' } as Express.Multer.File;
    const result = { url: '/uploads/files/image.png' };
    service.fileResponse.mockReturnValue(result);

    expect(controller.uploadImage(file)).toBe(result);
    expect(service.fileResponse).toHaveBeenCalledWith(file);
  });

  it('uploadImages throws when no files are provided', () => {
    expect(() => controller.uploadImages([] as Express.Multer.File[])).toThrow(BadRequestException);
    expect(service.filesResponse).not.toHaveBeenCalled();
  });

  it('uploadImages delegates to the service when files are provided', () => {
    const files = [{ filename: 'one.png' }] as Express.Multer.File[];
    const result = [{ url: '/uploads/files/one.png' }];
    service.filesResponse.mockReturnValue(result);

    expect(controller.uploadImages(files)).toBe(result);
    expect(service.filesResponse).toHaveBeenCalledWith(files);
  });

  it('deleteFile delegates to the service', () => {
    const result = Promise.resolve();
    service.deleteFile.mockReturnValue(result);

    expect(controller.deleteFile('image.png')).toBe(result);
    expect(service.deleteFile).toHaveBeenCalledWith('image.png');
  });
});
