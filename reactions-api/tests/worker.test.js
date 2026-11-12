import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../worker.js';

const schema = readFileSync(new URL('../migrations/0001_reactions.sql', import.meta.url), 'utf8');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const ORIGIN = 'https://sora.sky-me.workers.dev';
// D1のprepare/bind/batchインターフェースを実際のSQLiteで検証。
function database() {
    const sql = new DatabaseSync(':memory:'); sql.exec(schema);
    return {
        sql,
        prepare(text) { return { bind(...values) { return { text, values }; } }; },
        async batch(statements) {
            sql.exec('BEGIN');
            try {
                const result = statements.map(({ text, values }) => {
                    const stmt = sql.prepare(text);
                    if (text.startsWith('SELECT')) return { results: stmt.all(...values) };
                    stmt.run(...values); return { results: [] };
                });
                sql.exec('COMMIT'); return result;
            } catch (e) { sql.exec('ROLLBACK'); throw e; }
        },
    };
}
globalThis.fetch = async () => Response.json({ music: ['song-a', 'song-b', '日本語の曲'], blog: ['post-2', 'song-a'] });
function env() { return { DB: database(), SITE_ORIGIN: ORIGIN, ALLOWED_ORIGINS: ORIGIN, REQUEST_LIMITER: { limit: async () => ({ success: true }) }, WRITE_LIMITER: { limit: async () => ({ success: true }) } }; }
async function call(e, { kind = 'music', id = 'song-a', visitor = A, method = 'GET', body, origin = ORIGIN } = {}) {
    const url = new URL('https://api.example/v1/reactions');
    url.searchParams.set('kind', kind); url.searchParams.set('id', id);
    return worker.fetch(new Request(url, { method, headers: { Origin: origin, 'X-Reaction-Visitor': visitor, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }), e);
}
const set = (e, emoji, selected, options = {}) => call(e, { ...options, method: 'PUT', body: { emoji, selected } });

test('initial counts are zero, CORS and no-store are returned', async () => {
    const response = await call(env()); assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), { counts: { like: 0, love: 0, fire: 0, moved: 0, sparkles: 0 }, selected: [] });
});
test('PUT is idempotent, removal is idempotent, several emojis are allowed', async () => {
    const e = env(); await set(e, 'love', true); await set(e, 'love', true);
    let data = await (await set(e, 'fire', true)).json();
    assert.equal(data.counts.love, 1); assert.equal(data.counts.fire, 1); assert.equal(data.selected.length, 2);
    await set(e, 'love', false); data = await (await set(e, 'love', false)).json();
    assert.equal(data.counts.love, 0); assert.deepEqual(data.selected, ['fire']);
});
test('counts are shared, own choices and content types stay separate', async () => {
    const e = env(); await set(e, 'like', true);
    let data = await (await call(e, { visitor: B })).json();
    assert.equal(data.counts.like, 1); assert.deepEqual(data.selected, []);
    data = await (await set(e, 'like', true, { visitor: B })).json(); assert.equal(data.counts.like, 2);
    await set(e, 'like', false); data = await (await call(e, { visitor: B })).json();
    assert.equal(data.counts.like, 1); assert.deepEqual(data.selected, ['like']);
    for (const options of [{ id: 'song-b' }, { kind: 'blog', id: 'song-a' }]) {
        assert.equal((await (await call(e, options)).json()).counts.like, 0);
    }
});
test('reload keeps own selection and supports non-ASCII ids', async () => {
    const e = env(); await set(e, 'sparkles', true, { id: '日本語の曲' });
    assert.deepEqual((await (await call(e, { id: '日本語の曲' })).json()).selected, ['sparkles']);
});
test('invalid origin, visitor, content, kind and emoji are rejected', async () => {
    const e = env();
    assert.equal((await call(e, { origin: 'https://evil.example' })).status, 403);
    assert.equal((await call(e, { visitor: 'bad' })).status, 400);
    assert.equal((await call(e, { kind: 'fashion' })).status, 400);
    assert.equal((await call(e, { id: "x' OR 1=1--" })).status, 404);
    assert.equal((await set(e, 'bad', true)).status, 400);
    assert.equal((await set(e, 'love', 'true')).status, 400);
    assert.equal((await call(e, { method: 'PUT', body: { emoji: 'love', selected: true, extra: 'x'.repeat(1100) } })).status, 400);
    assert.equal(e.DB.sql.prepare('SELECT COUNT(*) AS n FROM reactions').get().n, 0);
});
test('rate limits block writes without changing counts', async () => {
    const e = env(); e.WRITE_LIMITER.limit = async () => ({ success: false });
    const result = await set(e, 'love', true); assert.equal(result.status, 429);
    assert.equal(result.headers.get('Retry-After'), '60');
    assert.equal((await (await call(e)).json()).counts.love, 0);
});
test('database failure returns 503 rather than success', async () => {
    const e = env(); e.DB.batch = async () => { throw new Error('test failure'); };
    assert.equal((await set(e, 'love', true)).status, 503);
});
test('preflight works without a visitor id', async () => {
    const result = await call(env(), { method: 'OPTIONS', visitor: '' });
    assert.equal(result.status, 204);
    assert.match(result.headers.get('Access-Control-Allow-Methods'), /PUT/);
});
test('concurrent duplicate requests never duplicate a reaction', async () => {
    const e = env(); await Promise.all(Array.from({ length: 10 }, () => set(e, 'love', true)));
    assert.equal((await (await call(e)).json()).counts.love, 1);
});
