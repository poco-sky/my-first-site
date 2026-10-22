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
        }),
        tags: z.array(z.string())
    })
});
// コレクションを登録するため、collections オブジェクトをエクスポートする
export const collections = { blog };