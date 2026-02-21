import z from "zod";
import { idSchema, multerFileSchema } from "./commonSchema";

const pathSchema = z.string().max(200).regex(/^[a-zA-Z0-9._-]+(\/[a-zA-Z0-9._-]+)*$/, "path can contain only alphanumeric characters and _");
const fileNameSchema = z.string().min(1, "Filename is required").max(80, "Filename is too long").regex(/^[a-zA-Z0-9._-]+$/, "Filename can contain only alphanumeric characters and _");

export const uploadImageSchema = z.object({
    body: z.object({
        name: fileNameSchema,
        subPath: pathSchema.optional()
    }),
    file: multerFileSchema
});

export const getImageListSchema = z.object({
    body: z.object({
        userId: z.string().optional(),
        subPath: pathSchema.optional()
    })
});

export const deleteImageSchema = z.object({
    body: z.object({
        fileId: idSchema("fileId"),
    }),
});

export const createImageFolderSchema = z.object({
    body: z.object({
        name: fileNameSchema,
        subPath: pathSchema.optional()
    })
});

export const moveImageSchema = z.object({
    body: z.object({
        fileId: idSchema("fileId"),
        newName: fileNameSchema.optional(),
        newSubPath: pathSchema.optional()
    })
});
