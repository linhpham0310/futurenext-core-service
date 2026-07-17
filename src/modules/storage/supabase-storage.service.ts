import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly supabaseClient: SupabaseClient;
  private readonly bucket: string;

  constructor(private configService: ConfigService) {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL');
    const serviceKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.bucket = this.configService.get<string>(
      'SUPABASE_STORAGE_BUCKET',
      'course-uploads',
    );

    this.supabaseClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async createSignedUploadUrl(fileKey: string) {
    const { data, error } = await this.supabaseClient.storage
      .from(this.bucket)
      .createSignedUploadUrl(fileKey);

    if (error) {
      this.logger.error(`Failed to create signed upload URL: ${error.message}`);
      throw new InternalServerErrorException('Không thể tạo URL upload');
    }

    return { uploadUrl: data.signedUrl, fileKey, token: data.token };
  }

  async uploadFile(
    buffer: Buffer,
    filePath: string,
    contentType: string,
  ): Promise<string> {
    const { error } = await this.supabaseClient.storage
      .from(this.bucket)
      .upload(filePath, buffer, { contentType, upsert: true });

    if (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new InternalServerErrorException('Upload thất bại');
    }

    const { data } = this.supabaseClient.storage
      .from(this.bucket)
      .getPublicUrl(filePath);
    return data.publicUrl;
  }

  async deleteFile(fileKey: string) {
    const { error } = await this.supabaseClient.storage
      .from(this.bucket)
      .remove([fileKey]);
    if (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw new InternalServerErrorException('Xóa file thất bại');
    }
    return { success: true };
  }
}
