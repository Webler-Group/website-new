
import { z } from "zod";
import countryCodes from "../config/countryCodes";

export const emailSchema = z.email("Invalid email").max(120, "Invalid email");
export const passwordSchema = z.string("Password is required").min(6, "Password is required and must be atleast 6 characters long").max(60, "Password cannot exceed 60 characters");
export const usernameSchema = z.string("Username is required").min(3, "Username should be atleast 3 characters").max(20, "Username must be at most 20 characters");
export const deviceIdSchema = z.string("Device ID is required");
export const idSchema = (propName: string) => z.string().regex(/^[0-9a-fA-F]{24}$/, propName + ": Invalid ID format. Must be a 24-character hex string");
export const countryCodeSchema = z.string("Country code is required").refine((val) => countryCodes.includes(val), "Invalid country code");
export const pageSchema = z.number().int().min(1);
export const countPerPageSchema = z.number().int().min(1).max(100);
export const searchQuerySchema = z.string().max(50).optional();