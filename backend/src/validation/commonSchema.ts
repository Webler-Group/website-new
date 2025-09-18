
import { z } from "zod";
import countryCodes from "../config/countryCodes";
import compilerLanguages from "../config/compilerLanguages";

export const emailSchema = z.email("Invalid email").max(120, "Invalid email");
export const passwordSchema = z.string("Password is required").min(6, "Password is required and must be atleast 6 characters long").max(120, "Password cannot exceed 60 characters");
export const usernameSchema = z.string("Username is required").min(3, "Username should be atleast 3 characters").max(20, "Username must be at most 20 characters");
export const deviceIdSchema = z.string("Device ID is required");
export const idSchema = (propName: string) => z.string().regex(/^[0-9a-fA-F]{24}$/, propName + ": Invalid ID format. Must be a 24-character hex string");
export const countryCodeSchema = z.string("Country code is required").refine((val) => countryCodes.includes(val), "Invalid country code");
export const pageSchema = z.number().int().min(1);
export const countPerPageSchema = z.number().int().min(1).max(100);
export const searchQuerySchema = z.string().optional();
export const messageSchema = z.string().min(1, "Message is required").max(4096, "Message cannot exceed 4096 characters");
export const commentMessageSchema = z.string().min(1, "Comment message is required").max(1024, "Comment message cannot exceed 1024 characters");
export const indexSchema = z.number().int("Index must be an integer").min(0, "Index must be at least 0");
export const filterSchema = (nums: number[]) => z.number().refine((val) => nums.includes(val), "Invalid filter number");
export const questionTitleSchema = z.string().min(1, "Title is required").max(120, "Title cannot exceed 120 characters");
export const titleSchema = z.string().min(1, "Title is required").max(60, "Title cannot exceed 60 characters");
export const tagNameSchema = z.string().min(1, "Tag name is required").max(64, "Tag name cannot exceed 64 characters");
export const compilerLanguageSchema = z.enum(compilerLanguages, "Invalid language");
export const voteSchema = z.number().int("Vote must be an integer").min(0, "Vote must be 0 or 1").max(1, "Vote must be 0 or 1");