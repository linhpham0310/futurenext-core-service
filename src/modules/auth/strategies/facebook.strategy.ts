import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow('FACEBOOK_APP_ID'),
      clientSecret: configService.getOrThrow('FACEBOOK_APP_SECRET'),
      callbackURL: configService.getOrThrow('FACEBOOK_CALLBACK_URL'),
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: any,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const user = await this.authService.validateOAuthLogin({
      provider: 'facebook',
      providerId: profile.id,
      email: emails?.[0]?.value,
      fullName:
        `${name?.givenName || ''} ${name?.familyName || ''}`.trim() ||
        'Facebook User',
      avatarUrl: photos?.[0]?.value,
    });
    done(null, user);
  }
}
