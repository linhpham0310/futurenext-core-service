import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  private readonly logger = new Logger(JwtRefreshGuard.name);

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      const token = request?.cookies?.refreshToken;
      this.logger.warn(
        `JwtRefreshGuard Denied: TokenExists=${!!token}, Error=${err?.message || info?.message}`,
      );
      throw (
        err ||
        new UnauthorizedException(
          'Phiên làm việc không hợp lệ hoặc đã hết hạn.',
        )
      );
    }
    return user;
  }
}
