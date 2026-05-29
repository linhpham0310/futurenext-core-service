/**
 * @file Defines the Guard that activates the JwtStrategy to protect routes.
 * It ensures a valid Access Token is present and valid.
 */
import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Extend from the base AuthGuard

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Specify the strategy name 'jwt'
  // Optional: Override canActivate for logging or custom logic before strategy runs
  // canActivate(context: ExecutionContext) {
  //   // Add your custom authentication logic here
  //   // for example, call super.logIn(request) to establish a session.
  //   return super.canActivate(context);
  // }

  // Optional: Override handleRequest for custom error handling after strategy runs
  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    // user will be false if the token is invalid (expired, wrong signature, or validate() failed)
    if (err || !user) {
      // You can throw an exception based on either `info` or `err` arguments
      // info can be TokenExpiredError, JsonWebTokenError, etc.
      throw (
        err ||
        new UnauthorizedException(
          'Yêu cầu xác thực không hợp lệ hoặc đã hết hạn.',
        )
      );
    }
    // If validation is successful, return the user payload
    return user; // This attaches the user object to req.user
  }
}
