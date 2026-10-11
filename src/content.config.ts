import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    date: z.coerce.date(),
    platform: z.string().optional(),
    status: z.enum(['completed', 'in-progress']),
    progress: z.number().min(0).max(100).optional(),
    tags: z.array(z.string()).default([]),
    track: z.enum(['agent', 'blockchain']),
  }),
});

export const collections = { posts };
