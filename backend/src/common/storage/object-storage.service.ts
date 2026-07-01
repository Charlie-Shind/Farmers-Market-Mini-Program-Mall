import { BadRequestException, Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { extname, posix } from 'node:path';
import { randomUUID } from 'node:crypto';

export type StoredObjectInfo = {
  bucket: string;
  objectKey: string;
  path: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly client: MinioClient;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;
  private readonly maxUploadSizeBytes: number;
  private readonly storageRequired: boolean;
  private initPromise: Promise<void> | null = null;
  private ready = false;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT')?.trim();
    const portRaw = this.configService.get<string>('MINIO_PORT')?.trim();
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false').trim() === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY')?.trim();
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY')?.trim();

    if (!endpoint || !portRaw || !accessKey || !secretKey) {
      throw new InternalServerErrorException('MinIO configuration is incomplete');
    }

    const port = Number(portRaw);
    if (!Number.isFinite(port) || port <= 0) {
      throw new InternalServerErrorException('MinIO port is invalid');
    }

    this.bucketName = this.configService.get<string>('MINIO_BUCKET', 'farm-public');
    const publicBaseUrl =
      this.configService.get<string>('MINIO_PUBLIC_BASE_URL')?.trim() ||
      `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`;
    this.publicBaseUrl = this.normalizeBaseUrl(publicBaseUrl);
    this.maxUploadSizeBytes = this.resolveMaxUploadSizeBytes();
    this.storageRequired = this.resolveStorageRequired();

    this.client = new MinioClient({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureReady();
    } catch (error) {
      if (this.storageRequired) {
        throw error;
      }

      this.logger.warn('Object storage is unavailable; upload-related features stay disabled until MinIO becomes reachable.');
    }
  }

  getBucketName(): string {
    return this.bucketName;
  }

  getPublicBaseUrl(): string {
    return this.publicBaseUrl;
  }

  buildPublicObjectUrl(objectKey: string): string {
    const bucketPrefix = `/${this.bucketName}`;
    let hostBase = this.publicBaseUrl;
    if (hostBase.endsWith(bucketPrefix)) {
      hostBase = hostBase.slice(0, -bucketPrefix.length);
    }

    const key = objectKey.replace(/^\/+/, '');
    return `${hostBase}${bucketPrefix}/${key}`;
  }

  async uploadPublicObject(params: {
    buffer: Buffer;
    fileName?: string;
    mimeType?: string;
    size?: number;
    folder?: string;
  }): Promise<StoredObjectInfo> {
    await this.ensureReady();

    const buffer = params.buffer;
    const size = params.size ?? buffer.length;
    if (!buffer.length || size <= 0) {
      throw new BadRequestException('File is required');
    }

    if (size > this.maxUploadSizeBytes) {
      throw new BadRequestException('File is too large');
    }

    const safeFileName = this.normalizeFileName(params.fileName ?? `upload-${randomUUID()}`);
    const resolvedExt = this.resolveFileExtension(safeFileName, params.mimeType);
    const folder = this.normalizeFolder(params.folder ?? 'uploads');
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const objectKey = posix.join(folder, datePrefix, `${Date.now()}-${randomUUID()}${resolvedExt}`);
    const path = `${this.bucketName}/${objectKey}`;

    await this.client.putObject(
      this.bucketName,
      objectKey,
      buffer,
      size,
      {
        'Content-Type': params.mimeType ?? this.resolveMimeType(resolvedExt),
        'x-amz-meta-original-name': safeFileName,
      },
    );

    return {
      bucket: this.bucketName,
      objectKey,
      path,
      url: this.buildPublicObjectUrl(objectKey),
      fileName: safeFileName,
      mimeType: params.mimeType ?? this.resolveMimeType(resolvedExt),
      size,
    };
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.ensureReady();
    if (!objectKey.trim()) {
      throw new BadRequestException('Object key is required');
    }

    await this.client.removeObject(this.bucketName, objectKey);
  }

  async objectExists(objectKey: string): Promise<boolean> {
    await this.ensureReady();
    if (!objectKey.trim()) {
      return false;
    }

    try {
      await this.client.statObject(this.bucketName, objectKey);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) {
      return;
    }

    if (!this.initPromise) {
      this.initPromise = this.bootstrap().catch((error) => {
        this.initPromise = null;
        this.ready = false;
        throw error;
      });
    }

    await this.initPromise;
  }

  private async bootstrap(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucketName);
    if (!exists) {
      await this.client.makeBucket(this.bucketName);
    }

    await this.client.setBucketPolicy(this.bucketName, this.buildPublicReadPolicy());
    this.ready = true;
    this.logger.log(`MinIO bucket ready: ${this.bucketName}`);
  }

  private buildPublicReadPolicy(): string {
    return JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`],
        },
      ],
    });
  }

  private normalizeBaseUrl(value: string): string {
    return value.replace(/\/+$/, '');
  }

  private normalizeFolder(value: string): string {
    const folder = value.trim().replace(/^\/+|\/+$/g, '');
    return folder || 'uploads';
  }

  private normalizeFileName(value: string): string {
    const cleaned = value.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_');
    return cleaned || `upload-${randomUUID()}`;
  }

  private resolveFileExtension(fileName: string, mimeType?: string): string {
    const currentExt = extname(fileName).toLowerCase();
    if (currentExt) {
      if (this.isAllowedExtension(currentExt)) {
        return currentExt;
      }

      throw new BadRequestException('File type is not supported');
    }

    const mimeExtension = this.resolveExtensionFromMimeType(mimeType);
    if (mimeExtension) {
      return mimeExtension;
    }

    throw new BadRequestException('File type is not supported');
  }

  private isAllowedExtension(ext: string): boolean {
    return [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.bmp',
      '.svg',
      '.mp4',
      '.mov',
      '.avi',
      '.mkv',
      '.webm',
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.txt',
      '.zip',
      '.rar',
      '.7z',
    ].includes(ext);
  }

  private resolveExtensionFromMimeType(mimeType?: string): string | null {
    const normalized = mimeType?.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'image/svg+xml': '.svg',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'video/x-matroska': '.mkv',
      'video/webm': '.webm',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'text/plain': '.txt',
      'application/zip': '.zip',
      'application/x-rar-compressed': '.rar',
      'application/x-7z-compressed': '.7z',
    };

    if (normalized.startsWith('image/')) {
      return map[normalized] ?? '.png';
    }

    if (normalized.startsWith('video/')) {
      return map[normalized] ?? '.mp4';
    }

    return map[normalized] ?? null;
  }

  private resolveMimeType(ext: string): string {
    const map: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
    };

    return map[ext] ?? 'application/octet-stream';
  }

  private resolveMaxUploadSizeBytes(): number {
    const rawValue = this.configService.get<string>('FILE_UPLOAD_MAX_SIZE_MB', '50');
    const sizeInMb = Number(rawValue);
    if (!Number.isFinite(sizeInMb) || sizeInMb <= 0) {
      throw new InternalServerErrorException('Invalid FILE_UPLOAD_MAX_SIZE_MB configuration');
    }

    return sizeInMb * 1024 * 1024;
  }

  private resolveStorageRequired(): boolean {
    const rawValue = this.configService.get<string>('MINIO_REQUIRED');
    if (rawValue != null) {
      return rawValue.trim().toLowerCase() === 'true';
    }

    return this.configService.get<string>('NODE_ENV', 'development').trim().toLowerCase() === 'production';
  }
}
