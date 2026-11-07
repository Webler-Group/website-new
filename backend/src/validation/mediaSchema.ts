import z from "zod";
import { idSchema } from "./commonSchema";

export const getFileByHashSchema = z.object({
    params: z.object({
        hash: z.string()
    })
});
export const getFileByHashWithNameSchema = z.object({
    params: z.object({
        hash: z.string(),
        filename: z.string().max(40).regex(/^[a-zA-Z0-9._-]+$/)
    })
});
