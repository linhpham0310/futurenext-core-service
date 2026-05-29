// src/modules/auth/interfaces/request-with-user.interface.ts
import { Request } from 'express';

export interface RequestWithUser extends Request {
  user: {
    userId: string;
    refreshToken: string;
    sub?: string;
    role?: string;
  };
}
