// src/modules/storage/storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(
    process.cwd(),
    'public',
    'uploads',
    'certificates',
  );

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    try {
      const fullPath = path.join(this.uploadDir, fileName);
      fs.writeFileSync(fullPath, buffer);

      return `http://localhost:3000/uploads/certificates/${fileName}`;
    } catch (error) {
      this.logger.error(
        `Failed to upload certificate locally: ${error.message}`,
      );
      throw error;
    }
  }
}
