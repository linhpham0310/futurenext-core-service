import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabaseClient: SupabaseClient;
  private readonly bucket = 'certificates';

  constructor(private configService: ConfigService) {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL');
    const serviceKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.supabaseClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    const { error } = await this.supabaseClient.storage
      .from(this.bucket)
      .upload(fileName, buffer, { contentType, upsert: true });

    if (error) {
      this.logger.error(`Failed to upload certificate: ${error.message}`);
      throw new InternalServerErrorException('Upload chứng chỉ thất bại');
    }

    const { data } = this.supabaseClient.storage
      .from(this.bucket)
      .getPublicUrl(fileName);
    return data.publicUrl;
  }
}
