/**
 * @file Defines the Passport strategy for validating JWT Access Tokens.
 */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import {
  User,
  UserRole,
  UserStatus,
} from '@/modules/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface JwtAccessPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
    this.logger.log('JwtStrategy initialized.');
  }

  async validate(payload: JwtAccessPayload): Promise<JwtAccessPayload> {
    this.logger.verbose(
      `Validating access token payload for user ID: ${payload.sub}`,
    );

    const user = await this.userRepository.findOne({
      where: { id: payload.sub, status: UserStatus.ACTIVE },
      select: ['id', 'lockedUntil'],
    });
    if (!user)
      throw new UnauthorizedException(
        'Người dùng không hợp lệ hoặc đã bị vô hiệu hóa.',
      );
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Tài khoản đang bị khóa tạm thời.');
    }
    return payload;
  }
}
