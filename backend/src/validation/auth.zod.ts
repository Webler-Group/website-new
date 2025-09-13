import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email." }),
    password: z.string().min(6, { message: "Password is required and must be atleast 6 characters long." }),
  }),
  headers: z.object({
    "x-device-id": z.string().min(1, { message: "Device ID is required" }),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email." }),
    name: z.string().min(3, { message: "Name should be atleast 3 characters." }).max(20, { message: "Name must be at most 20 characters" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    solution: z.string().min(1, { message: "Captcha solution is required" }),
    captchaId: z.string().min(1, { message: "Captcha ID is required" }),
  }),
  headers: z.object({
    "x-device-id": z.string().min(1, { message: "Device ID is required" }),
  }),
});

export const sendPasswordResetCodeSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email." }),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, { message: "Token is required" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    resetId: z.string().min(1, { message: "User ID is required" }),
  })
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, { message: "Token is required" }),
    userId: z.string().min(1, { message: "User ID is required" }),
  })
})