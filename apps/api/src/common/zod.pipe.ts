import type { PipeTransform } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodTypeAny) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
