/**
 * @file Defines the Guard that activates the JwtRefreshStrategy.
 * Protects routes that require a valid Refresh Token cookie.
 */
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Extend from the base AuthGuard

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  // Specify the strategy name 'jwt-refresh'
  private readonly logger = new Logger(JwtRefreshGuard.name);

  // Optional: Override handleRequest for custom error handling or logging
  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): any {
    if (err || !user) {
      // Log details about why the guard failed (e.g., token expired, no token, signature invalid)
      const request = context.switchToHttp().getRequest();
      const token = request?.cookies?.refreshToken;
      this.logger.warn(
        `JwtRefreshGuard Denied: User=${user?.userId}, TokenExists=${!!token}, Error=${err?.message || info?.message || 'No user found'}`,
      );
      // Throw a standard UnauthorizedException
      throw (
        err ||
        new UnauthorizedException(
          'Phiên làm việc không hợp lệ hoặc đã hết hạn.',
        )
      );
    }
    // If validation is successful, Passport attaches the result of strategy.validate() to req.user
    // The base AuthGuard handles this attachment. We just return the user object here.
    this.logger.verbose(`JwtRefreshGuard Allowed for User ID: ${user.userId}`);
    return user; // Attach the user object (including refreshToken) to req.user
  }
}
