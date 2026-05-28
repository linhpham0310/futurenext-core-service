// src/modules/auth/listeners/auth.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '../../notifications/services/email.service';
import { UsersService } from '../../users/services/users.service';

@Injectable()
export class AuthListener {
  constructor(
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {}

  @OnEvent('user.registered')
  async handleUserRegistered(payload: {
    userId: string;
    email: string;
    fullName: string;
  }) {
    console.log(`[AuthListener] User registered: ${payload.email}`);
  }

  @OnEvent('user.password.reset')
  async handlePasswordReset(payload: { email: string; token: string }) {
    console.log(`[AuthListener] Password reset requested: ${payload.email}`);
  }
}
