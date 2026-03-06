import z from "zod";
import { idSchema } from "./commonSchema";

export const getFileByHashSchema = z.object({
    params: z.object({
        hash: z.string()
    })
});