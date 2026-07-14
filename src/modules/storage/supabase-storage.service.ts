import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'public', 'uploads');

  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async createSignedUploadUrl(fileKey: string) {
    // Mock signed URL for local development
    const mockUrl = `http://localhost:3000/api/mock-upload?key=${fileKey}`;
    return { uploadUrl: mockUrl, fileKey };
  }

  async uploadFile(
    buffer: Buffer,
    filePath: string,
    contentType: string,
  ): Promise<string> {
    try {
      // Create subdirectories if filePath contains them (e.g., 'avatars/user1.png')
      const fullPath = path.join(this.uploadDir, filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, buffer);
      
      // Return the public URL to access the file
      // NestJS static assets should serve 'public' folder
      return `http://localhost:3000/uploads/${filePath}`;
    } catch (error) {
      this.logger.error(`Failed to upload local file: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(fileKey: string) {
    try {
      const fullPath = path.join(this.uploadDir, fileKey);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete local file: ${error.message}`);
      throw error;
    }
  }
}
