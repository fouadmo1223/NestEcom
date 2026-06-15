import { Injectable, BadRequestException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class UploadService {
  private readonly uploadDir = join(process.cwd(), 'src/uploads/files');

  fileResponse(file: Express.Multer.File) {
    return {
      url: `/uploads/files/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  filesResponse(files: Express.Multer.File[]) {
    return files.map((file) => this.fileResponse(file));
  }

  async deleteFile(filename: string) {
    try {
      await unlink(join(this.uploadDir, filename));
    } catch {
      throw new BadRequestException(`File not found: ${filename}`);
    }
  }
}
