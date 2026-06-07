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

  async createSignedUploadUrl(courseId: string, fileName: string) {
    const fileKey = `courses/${courseId}/${Date.now()}-${fileName}`;

    const { data, error } = await this.supabase.storage
      .from('course-videos')
      .createSignedUploadUrl(fileKey);

    if (error) throw new Error(error.message);

    return {
      uploadUrl: data.signedUrl,
      fileKey,
    };
  }
}
