import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

@Injectable()
export class SupabaseStorageService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        realtime: { transport: ws },
      },
    );
  }

  async createSignedUploadUrl(fileKey: string) {
    const { data, error } = await this.supabase.storage
      .from('course-videos')
      .createSignedUploadUrl(fileKey);
    if (error) throw new Error(error.message);
    return { uploadUrl: data.signedUrl, fileKey };
  }

  async deleteFile(fileKey: string) {
    const { error } = await this.supabase.storage
      .from('course-videos')
      .remove([fileKey]);
    if (error) throw new Error(error.message);
    return { success: true };
  }
}
