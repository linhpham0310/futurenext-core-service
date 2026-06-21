import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow('APPLE_CLIENT_ID'),
      teamID: configService.getOrThrow('APPLE_TEAM_ID'),
      keyID: configService.getOrThrow('APPLE_KEY_ID'),
      privateKeyString: configService.getOrThrow('APPLE_PRIVATE_KEY'),
      callbackURL: configService.getOrThrow('APPLE_CALLBACK_URL'),
      scope: ['email', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { email, name } = profile;
    const user = await this.authService.validateOAuthLogin({
      provider: 'apple',
      providerId: profile.id,
      email: email,
      fullName:
        `${name?.firstName || ''} ${name?.lastName || ''}`.trim() ||
        'Apple User',
      avatarUrl: null,
    });
    done(null, user);
  }
}
