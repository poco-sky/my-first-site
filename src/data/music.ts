import { getCollection } from "astro:content";

export type MusicGenre = string;
export interface Track {
    id: string;
    title: string;
    artist: string;
    genre: MusicGenre;
    audio: string;
    cover: string;
    lyrics: string;
    translation: string;
}

// 曲情報は src/music/*.md から取得。ファイル名が曲のIDになる。
// 古い順を基準に保持し、画面側の並び替えボタンで反転する。
const entries = await getCollection('music');
export const tracks: Track[] = entries
    .sort((a, b) => a.data.addedAt.getTime() - b.data.addedAt.getTime() || a.id.localeCompare(b.id))
    .map(entry => {
        const sections = (entry.body ?? '').split(/^<!-- translation -->\s*$/m);
        if (sections.length > 2) throw new Error(`${entry.id}: 日本語訳の区切りは1つだけにしてください。`);
        return {
            id: entry.id,
            title: entry.data.title,
            artist: entry.data.artist,
            genre: entry.data.genre,
            audio: entry.data.audio,
            cover: entry.data.cover,
            lyrics: sections[0].trim(),
            translation: (sections[1] ?? '').trim(),
        };
    });
