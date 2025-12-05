"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailSchema = exports.resetPasswordSchema = exports.sendPasswordResetCodeSchema = exports.refreshSchema = exports.registerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
const commonSchema_1 = require("./commonSchema");
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: commonSchema_1.emailSchema,
        password: commonSchema_1.passwordSchema,
    }),
    headers: zod_1.z.object({
        "x-device-id": commonSchema_1.deviceIdSchema
    })
});
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: commonSchema_1.emailSchema,
        name: commonSchema_1.usernameSchema,
        password: commonSchema_1.passwordSchema,
        solution: zod_1.z.string(),
        captchaId: (0, commonSchema_1.idSchema)("captchaId"),
    }),
    headers: zod_1.z.object({
        "x-device-id": commonSchema_1.deviceIdSchema
    })
});
exports.refreshSchema = zod_1.z.object({
    headers: zod_1.z.object({
        "x-device-id": commonSchema_1.deviceIdSchema
    }),
    cookies: zod_1.z.object({
        refreshToken: zod_1.z.string()
    })
});
exports.sendPasswordResetCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: commonSchema_1.emailSchema,
    }),
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string(),
        password: commonSchema_1.passwordSchema,
        resetId: (0, commonSchema_1.idSchema)("resetId"),
    })
});
exports.verifyEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string(),
        userId: (0, commonSchema_1.idSchema)("userId"),
    })
});
