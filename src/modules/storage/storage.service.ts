// src/modules/storage/storage.service.ts
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('certificates')
      .upload(fileName, buffer, { contentType });

    if (error) throw new Error(error.message);

    const { data: urlData } = this.supabase.storage
      .from('certificates')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }
}
