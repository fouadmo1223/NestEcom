import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtGuard } from '../auth/jwt.guard';
import { UploadService } from './upload.service';

const storage = diskStorage({
  destination: './src/uploads/files',
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

const imageFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
    return cb(new BadRequestException('Only image files are allowed'), false);
  }
  cb(null, true);
};

@UseGuards(JwtGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', { storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.uploadService.fileResponse(file);
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10, { storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No files uploaded');
    return this.uploadService.filesResponse(files);
  }

  @Delete(':filename')
  deleteFile(@Param('filename') filename: string) {
    return this.uploadService.deleteFile(filename);
  }
}
