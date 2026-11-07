import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { z } from "zod";

/**
 * Validates and parses a request part with a zod schema from @ighub/shared:
 *   @Body(new ZodPipe(createAccountSchema)) body: CreateAccountInput
 * (We don't use nestjs-zod: it doesn't support Nest 12 yet.)
 */
export class ZodPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw new BadRequestException({
      code: "validation_failed",
      message: "Some fields are invalid.",
      errors: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
}
