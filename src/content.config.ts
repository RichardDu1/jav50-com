import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const generatorsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/generators" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    videoType: z.string(), // e.g., "Text-to-Video"
    maxResolution: z.string(),
    pricing: z.string(),
    rank: z.number(),
    keyFeatures: z.array(z.string()),
    publishedAt: z.date()
  }),
});

export const collections = {
  'generators': generatorsCollection,
};
