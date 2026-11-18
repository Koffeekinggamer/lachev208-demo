import { defineCollection } from "astro:content";
import { glob, file } from "astro/loaders";
import { z } from "astro/zod";

const price = z.object({ amount: z.string(), unit: z.string().default("") });
const item = z.object({
  name: z.string(),
  description: z.string().default(""),
  prices: z.array(price).default([]),
});

const menus = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/menus" }),
  schema: z.object({
    page: z.enum(["food", "drink"]),
    title: z.string(),
    order: z.number(),
    note: z.string().default(""),
    sections: z.array(
      z.object({ title: z.string(), note: z.string().default(""), items: z.array(item) }),
    ),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/events" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      start: z.string(),
      end: z.string(),
      summary: z.string(),
      image: image().optional(),
      imageAlt: z.string().default(""),
      published: z.boolean().default(true),
    }),
});

const specials = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/specials" }),
  schema: z.object({
    title: z.string(),
    when: z.string(),
    price: z.string().default(""),
    description: z.string().default(""),
    active: z.boolean().default(false),
    order: z.number().default(1),
  }),
});

const gallery = defineCollection({
  loader: file("./src/content/gallery.json", { parser: (text) => JSON.parse(text).photos }),
  schema: ({ image }) => z.object({ image: image(), alt: z.string(), order: z.number() }),
});

export const collections = { menus, events, specials, gallery };
