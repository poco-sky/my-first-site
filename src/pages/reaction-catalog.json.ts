import { getCollection } from 'astro:content';
// APIが実在する曲・記事だけにリアクションを受け付けるための公開カタログ。
export const prerender = true;
export async function GET() {
    const [music, blog] = await Promise.all([getCollection('music'), getCollection('blog')]);
    return new Response(JSON.stringify({
        music: music.map(entry => entry.id),
        blog: blog.map(entry => entry.id),
    }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
