import type { z } from "zod";
import type {
  socialPostSchema,
  socialPostsResponseSchema,
  generateSocialPostsRequestSchema,
} from "./schemas";

/** A single generated social media post for a specific platform. */
export type SocialPost = z.infer<typeof socialPostSchema>;

/** All three platform posts (payload) returned from the generation endpoint. */
export type SocialPostsResult = z.infer<typeof socialPostsResponseSchema>;

/** Request body for the POST /api/social/generate endpoint. */
export type GenerateSocialPostsRequest = z.infer<
  typeof generateSocialPostsRequestSchema
>;

/** Supported social media platforms. */
export type SocialPlatform = "threads" | "x" | "linkedin";
