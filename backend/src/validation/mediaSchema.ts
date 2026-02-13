import z from "zod";
import { idSchema } from "./commonSchema";

export const getFileByIdSchema = z.object({
    params: z.object({
        fileId: idSchema("fileId")
    })
});