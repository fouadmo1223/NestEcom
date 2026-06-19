import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
    constructor(config: ConfigService) {
        cloudinary.config({
            cloud_name: config.getOrThrow('CLOUDINARY_CLOUD_NAME'),
            api_key: config.getOrThrow('CLOUDINARY_API_KEY'),
            api_secret: config.getOrThrow('CLOUDINARY_API_SECRET'),
        });
    }

    uploadFile(buffer: Buffer, folder: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream(
                { folder, resource_type: 'image' },
                (error, result: UploadApiResponse | undefined) => {
                    if (error || !result) return reject(error ?? new Error('Upload failed'));
                    resolve(result.secure_url);
                },
            );
            Readable.from(buffer).pipe(upload);
        });
    }
}
