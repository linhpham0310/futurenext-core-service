/**
 * @file Defines the Passport strategy for validating JWT Access Tokens.
 */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt'; // Use Strategy from passport-jwt
import { ConfigService } from '@nestjs/config';
import {
  User,
  UserRole,
  UserStatus,
} from '@/modules/users/entities/user.entity'; // Import User if needed for DB check
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Payload structure expected within a valid Access Token JWT.
 */
export interface JwtAccessPayload {
  sub: string; // User ID (subject)
  role: UserRole; // User's role
  iat: number; // Issued At timestamp
  exp: number; // Expiration timestamp
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  // Strategy name: 'jwt' (default)
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    // (Optional but Recommended for Security) Inject UserRepository to perform a lightweight DB check
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      // How to extract the token from the request: from 'Authorization: Bearer <token>' header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Use the dedicated JWT_SECRET for verification
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      // Ensure expired tokens are rejected by the strategy
      ignoreExpiration: false,
    });
    this.logger.log('JwtStrategy initialized.');
  }

  /**
   * Validation function executed by Passport AFTER successfully verifying the token's signature and expiry.
   * This method allows for additional payload validation or enriching the user object.
   * @param payload - The decoded JWT payload.
   * @returns The payload itself, which will be attached to the request object as `req.user`.
   * @throws UnauthorizedException if the user in the payload is not valid (e.g., not found, inactive).
   */
  async validate(payload: JwtAccessPayload): Promise<JwtAccessPayload> {
    this.logger.verbose(
      `Validating access token payload for user ID: ${payload.sub}`,
    );

    // Security Best Practice: Although the token is valid, perform a quick check
    // to ensure the user still exists and is active in the database.
    // This prevents a user who has been deactivated or deleted from using a still-valid token.
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, status: UserStatus.ACTIVE }, // Check for 'active' status
      select: ['id'], // Only select the 'id' field for a minimal, fast query
    });

    if (!user) {
      this.logger.warn(
        `JWT validation failed: User ${payload.sub} not found or not active.`,
      );
      throw new UnauthorizedException(
        'Người dùng không hợp lệ hoặc đã bị vô hiệu hóa.',
      );
    }

    // If validation passes, the payload is returned.
    // Passport will attach this payload to the `request.user` object.
    return payload;
  }
}
