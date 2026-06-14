import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.refreshToken || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    payload: { sub: string; email?: string; role?: string },
  ) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Refresh token payload không hợp lệ.');
    }
    const refreshToken = request?.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Không tìm thấy Refresh token trong request.',
      );
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      refreshToken,
    };
  }
}
