import { defineCollection, z } from 'astro:content';

export const directoryCollection = defineCollection({
    type: 'data', // YAML or JSON data
    schema: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      domain: z.string(),
      theme: z.string().default('default'),
      logo: z.string().optional(),
      primaryColor: z.string().default('#3366cc'),
      secondaryColor: z.string().default('#ff9900'),
      categories: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional()
      })),
      metaTags: z.object({
        title: z.string(),
        description: z.string(),
        keywords: z.array(z.string())
      }),
      socialLinks: z.array(z.object({
        platform: z.string(),
        url: z.string()
      })).optional()
    })
  });

  export const listingCollection = defineCollection({
    type: 'content', // Markdown content
    schema: z.object({
      title: z.string(),
      description: z.string(),
      directory: z.string(), // Which directory this belongs to
      category: z.string().optional(),
      featured: z.boolean().default(false),
      images: z.array(z.string()).optional(),
      address: z.string().optional(),
      website: z.string().optional(),
      phone: z.string().optional(),
      rating: z.number().min(0).max(5).optional(),
      tags: z.array(z.string()).optional(),
      openingHours: z.array(z.object({
        day: z.string(),
        hours: z.string()
      })).optional(),
      customFields: z.record(z.string(), z.any()).optional() // For directory-specific fields
    })
  });
  
  export const collections = {
    'directories': directoryCollection,
    'listings': listingCollection,
  };