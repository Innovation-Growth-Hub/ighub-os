import { Catch, HttpException, HttpStatus, Logger, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";

/** RFC 9457 problem details. `code` is a stable machine-readable string for the frontend. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code?: string;
  errors?: Array<{ path: string; message: string }>;
  instance?: string;
}

/** Better Auth's APIError (from better-call) without importing its class. */
function isBetterAuthError(e: unknown): e is { statusCode: number; body?: { message?: string; code?: string } } {
  return typeof e === "object" && e !== null && "statusCode" in e && typeof (e as { statusCode: unknown }).statusCode === "number";
}

@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger("Http");

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest<Request>();
    const problem = this.toProblem(exception);
    problem.instance = req.originalUrl;

    if (problem.status >= 500) this.logger.error(exception instanceof Error ? exception.stack : exception);

    res.status(problem.status).type("application/problem+json").json(problem);
  }

  private toProblem(e: unknown): Problem {
    if (e instanceof HttpException) {
      const status = e.getStatus();
      const body = e.getResponse();
      const obj = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
      const message = typeof body === "string" ? body : (obj.message as string | undefined);
      return {
        type: "about:blank",
        title: HttpStatus[status]?.replaceAll("_", " ").toLowerCase() ?? "error",
        status,
        detail: Array.isArray(message) ? message.join("; ") : message,
        code: obj.code as string | undefined,
        errors: obj.errors as Problem["errors"],
      };
    }
    if (isBetterAuthError(e)) {
      return {
        type: "about:blank",
        title: HttpStatus[e.statusCode]?.replaceAll("_", " ").toLowerCase() ?? "error",
        status: e.statusCode,
        detail: e.body?.message,
        code: e.body?.code?.toLowerCase(),
      };
    }
    return { type: "about:blank", title: "internal server error", status: 500, detail: "Something went wrong." };
  }
}
