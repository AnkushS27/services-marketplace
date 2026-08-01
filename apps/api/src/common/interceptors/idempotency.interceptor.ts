import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const idempotencyKey =
      (request.headers['idempotency-key'] as string) ||
      (request.headers['Idempotency-Key'] as string);

    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required for this operation');
    }

    // Check if key already exists
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
    });

    if (existing) {
      response.status(existing.responseStatus);
      return of(existing.responseBody);
    }

    return next.handle().pipe(
      tap(async (data) => {
        try {
          const statusCode = response.statusCode || 200;
          await this.prisma.idempotencyKey.create({
            data: {
              key: idempotencyKey,
              endpoint: request.originalUrl || request.url,
              responseStatus: statusCode,
              responseBody: data === undefined ? null : JSON.parse(JSON.stringify(data)),
            },
          });
        } catch (err) {
          // Ignore duplicate insert race condition if another thread inserted
        }
      }),
    );
  }
}
