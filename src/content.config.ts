// glob ローダーをインポートする
import { glob } from "astro/loaders";
// `astro:content` からユーティリティをインポートする
import { defineCollection } from "astro:content";
// Zod をインポートする
import { z } from "astro/zod";
// 各コレクションの loader と schema を定義する
const blog = defineCollection({
    loader: glob({ pattern: '**/[^_]*.md', base: "./src/blog" }),
    schema: z.object({
        title: z.string(),
        pubDate: z.date(),
        description: z.string(),
        author: z.string(),
        image: z.object({
            url: z.string(),
            alt: z.string()
        }).optional(),
        tags: z.array(z.string())
    })
});
// コレクションを登録するため、collections オブジェクトをエクスポートする
const music = defineCollection({
    loader: glob({ pattern: '**/[^_]*.md', base: './src/music' }),
    schema: z.object({
        title: z.string().min(1),
        artist: z.string().default('Sora'),
        genre: z.string().trim().min(1),
        addedAt: z.coerce.date(),
        audio: z.string().min(1),
        cover: z.string().min(1),
    }),
});
const fashion = defineCollection({
    loader: glob({ pattern: '**/[^_]*.md', base: './src/fashion' }),
    schema: z.object({
        title: z.string().min(1),
        category: z.string().min(1).default('スウェット'),
        description: z.string(),
        order: z.number().default(0),
        cover: z.string().min(1),
        coverAlt: z.string().min(1),
        images: z.array(z.object({ src: z.string().min(1), alt: z.string().min(1) })).min(1),
        pickup: z.object({ image: z.string(), alt: z.string(), title: z.string(), order: z.number() }).optional(),
        addedAt: z.coerce.date().optional(),
    }),
});
export const collections = { blog, music, fashion };