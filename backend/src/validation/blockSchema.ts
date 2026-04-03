import { z } from "zod";
import { idSchema } from "./commonSchema";

export const blockUserSchema = z.object({
    body: z.object({
        targetId: idSchema("targetId"),  
    })
});


export const unblockUserSchema = z.object({
    body: z.object({
        targetId: idSchema("targetId")
    })
})