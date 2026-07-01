import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Public } from '../../../common/decorators';
import { ObjectStorageService } from '../../../common/storage/object-storage.service';

const MAX_UPLOAD_SIZE_MB = Number(process.env.FILE_UPLOAD_MAX_SIZE_MB ?? 50);
const MAX_UPLOAD_SIZE_BYTES = Math.max(Number.isFinite(MAX_UPLOAD_SIZE_MB) ? MAX_UPLOAD_SIZE_MB : 50, 1) * 1024 * 1024;

type UploadedBinaryFile = {
  originalname?: string;
  mimetype?: string;
  size?: number;
};

@Public()
@Controller('files')
export class FileController {
  constructor(private readonly objectStorageService: ObjectStorageService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_UPLOAD_SIZE_BYTES,
      },
    }),
  )
  uploadFile(@UploadedFile() file?: UploadedBinaryFile) {
    const buffer = (file as { buffer?: Buffer } | undefined)?.buffer ?? Buffer.from('');
    if (!file || !buffer.length) {
      throw new BadRequestException('File is required');
    }

    return this.objectStorageService.uploadPublicObject({
      buffer,
      fileName: file.originalname?.trim(),
      mimeType: file.mimetype,
      size: file.size,
      folder: 'uploads',
    });
  }
}
