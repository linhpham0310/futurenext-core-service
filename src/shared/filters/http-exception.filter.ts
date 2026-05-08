// src/shared/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException) // Chỉ bắt các lỗi là HttpException hoặc kế thừa từ nó
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Lấy response gốc từ HttpException (có thể là string hoặc object { message: [...] })
    const exceptionResponse = exception.getResponse();
    let errorMessage: string | string[] | object; // Có thể là object nếu response gốc là object phức tạp

    if (typeof exceptionResponse === 'string') {
      errorMessage = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      errorMessage = (exceptionResponse as any).message || exceptionResponse; // Ưu tiên key 'message' nếu có
    } else {
      errorMessage = exception.message || 'Internal server error';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage, // Giữ nguyên message gốc (có thể là array string từ validation)
      error: exception.name, // Tên của Exception (vd: BadRequestException, UnauthorizedException)
    };

    // Log lỗi chi tiết hơn ở server-side (bao gồm cả stack trace)
    this.logger.error(
      `[${request.method}] ${request.url} >> Status: ${status} Response: ${JSON.stringify(errorResponse)}`,
      exception.stack, // Log stack trace để debug
    );

    response.status(status).json(errorResponse);
  }
}
