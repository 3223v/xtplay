import { z } from "zod";

export const marketArticleSchema = z.object({
  id: z.string().default(""),
  title: z.string().min(1).max(200).default("Untitled Article"),
  description: z.string().default(""),
  text: z.string().default(""),
  jsonContent: z.string().default(""),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().default(() => new Date().toISOString().slice(0, 10)),
  updatedAt: z.string().default(() => new Date().toISOString().slice(0, 10)),
});

export type MarketArticle = z.infer<typeof marketArticleSchema>;
