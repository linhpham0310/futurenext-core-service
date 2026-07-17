import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as WebSocket from 'ws';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly supabaseClient: SupabaseClient;
  private readonly defaultBucket: string;

  constructor(private configService: ConfigService) {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL');
    const serviceKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.defaultBucket = this.configService.get<string>(
      'SUPABASE_STORAGE_BUCKET',
      'course-uploads',
    );

    this.supabaseClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: {
        transport: WebSocket as any,
      },
    });
  }

  private async ensureBucketExists(bucket: string): Promise<void> {
    try {
      const { error: listError } = await this.supabaseClient.storage
        .from(bucket)
        .list('', { limit: 1 });

      if (listError && listError.message.includes('not found')) {
        this.logger.warn(`Bucket "${bucket}" not found, creating it...`);
        const { error: createError } =
          await this.supabaseClient.storage.createBucket(bucket, {
            public: true,
          });
        if (createError) {
          // 👉 THROW lỗi thay vì chỉ log
          throw new Error(`Failed to create bucket: ${createError.message}`);
        }
        this.logger.log(`Bucket "${bucket}" created successfully.`);
      } else if (listError) {
        throw new Error(`Bucket check failed: ${listError.message}`);
      }
    } catch (error) {
      this.logger.error(`Error ensuring bucket exists: ${error.message}`);
      throw error; // Re-throw để dừng upload
    }
  }

  // ===== AVATAR =====
  async uploadAvatar(
    buffer: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    return this.uploadFile(buffer, fileName, contentType, 'avatars');
  }

  // ===== VIDEO =====
  async uploadVideo(
    buffer: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    return this.uploadFile(buffer, fileName, contentType, 'course-videos');
  }

  private async uploadFile(
    buffer: Buffer,
    filePath: string,
    contentType: string,
    bucket: string,
  ): Promise<string> {
    try {
      const { error } = await this.supabaseClient.storage
        .from(bucket)
        .upload(filePath, buffer, { contentType, upsert: true });

      if (error) {
        // Log chi tiết lỗi để biết chính xác
        console.error('Supabase upload error:', {
          message: error.message,
          status: error.status,
          bucket,
          filePath,
        });
        throw new InternalServerErrorException(
          `Upload thất bại: ${error.message}`,
        );
      }

      const { data } = this.supabaseClient.storage
        .from(bucket)
        .getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      this.logger.error(`Error in uploadFile: ${error.message}`);
      throw error;
    }
  }

  async createSignedUploadUrl(fileKey: string, bucket?: string) {
    const targetBucket = bucket || this.defaultBucket;
    try {
      await this.ensureBucketExists(targetBucket);
      const { data, error } = await this.supabaseClient.storage
        .from(targetBucket)
        .createSignedUploadUrl(fileKey);

      if (error) {
        this.logger.error(
          `Failed to create signed upload URL: ${error.message}`,
        );
        throw new InternalServerErrorException('Không thể tạo URL upload');
      }

      return { uploadUrl: data.signedUrl, fileKey, token: data.token };
    } catch (error) {
      this.logger.error(`Error in createSignedUploadUrl: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(fileKey: string, bucket?: string) {
    const targetBucket = bucket || this.defaultBucket;
    try {
      const { error } = await this.supabaseClient.storage
        .from(targetBucket)
        .remove([fileKey]);
      if (error) {
        this.logger.error(`Failed to delete file: ${error.message}`);
        throw new InternalServerErrorException('Xóa file thất bại');
      }
      return { success: true };
    } catch (error) {
      this.logger.error(`Error in deleteFile: ${error.message}`);
      throw error;
    }
  }
}
