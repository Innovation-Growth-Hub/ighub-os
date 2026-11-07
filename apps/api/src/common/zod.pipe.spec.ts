import { BadRequestException } from "@nestjs/common";
import { createAccountSchema } from "@ighub/shared";
import { ZodPipe } from "./zod.pipe.js";

describe("ZodPipe", () => {
  const pipe = new ZodPipe(createAccountSchema);

  it("returns parsed data", () => {
    const out = pipe.transform({ name: "Ada Obi", email: "ADA@ighub.com", role: "staff", position: "Dev", staffType: "intern", officeLocation: "aba_hub" });
    expect(out.email).toBe("ada@ighub.com");
  });

  it("throws a 400 with field paths", () => {
    try {
      pipe.transform({ email: "nope" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const body = (e as BadRequestException).getResponse() as { code: string; errors: Array<{ path: string }> };
      expect(body.code).toBe("validation_failed");
      expect(body.errors.map((x) => x.path)).toEqual(expect.arrayContaining(["email", "name", "role"]));
    }
  });
});
