import { z } from "zod";
import { deviceIdSchema, emailSchema, passwordSchema, idSchema, usernameSchema } from "./commonSchema";

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
  }),
  headers: z.object({
    "x-device-id": deviceIdSchema
  })
});

export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    name: usernameSchema,
    password: passwordSchema,
    solution: z.string(),
    captchaId: idSchema("captchaId"),
  }),
  headers: z.object({
    "x-device-id": deviceIdSchema
  })
});

export const refreshSchema = z.object({
  headers: z.object({
    "x-device-id": deviceIdSchema
  }),
  cookies: z.object({
    refreshToken: z.string()
  })
});

export const sendPasswordResetCodeSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string(),
    password: passwordSchema,
    resetId: idSchema("resetId"),
  })
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string(),
    userId: idSchema("userId"),
  })
})