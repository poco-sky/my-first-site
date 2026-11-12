const EMOJIS = ['like', 'love', 'moved'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const catalogCache = new Map();
async function catalog(env) {
    const origin = env.SITE_ORIGIN;
    const cached = catalogCache.get(origin);
    if (cached && cached.expires > Date.now()) {
        return cached.value;
    }
    const url = new URL("/reaction-catalog.json", origin);
    const response = await env.SITE.fetch(url.href, {
        signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
        throw new Error(
            `Catalog unavailable: HTTP ${response.status}`
        );
    }
    const value = await response.json();
    if (
        !Array.isArray(value.music) ||
        !Array.isArray(value.blog)
    ) {
        throw new Error("Invalid catalog");
    }
    catalogCache.set(origin, {
        value,
        expires: Date.now() + 60000,
    });
    return value;
}
async function hash(value) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
function queries(db, kind, id, visitor) {
    return [
        db.prepare('SELECT emoji, COUNT(*) AS count FROM reactions WHERE kind = ? AND content_id = ? GROUP BY emoji').bind(kind, id),
        db.prepare('SELECT emoji FROM reactions WHERE kind = ? AND content_id = ? AND visitor_hash = ?').bind(kind, id, visitor),
    ];
}
function snapshot(results) {
    const counts = Object.fromEntries(EMOJIS.map(key => [key, 0]));
    for (const row of results[0].results) counts[row.emoji] = Number(row.count);
    return { counts, selected: results[1].results.map(row => row.emoji) };
}
async function smallJson(request) {
    // Content-Lengthに依存せず、実際に読み取るバイト数を制限する。
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Empty body');
    let length = 0; const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 1024) { await reader.cancel(); throw new Error('Body too large'); }
        chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(bytes));
}
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin') || '';
        const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store', 'Vary': 'Origin',
            'X-Content-Type-Options': 'nosniff',
        };
        if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
        const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
        if (url.pathname !== '/v1/reactions') return json({ error: 'Not found' }, 404);
        if (!allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403);
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204, headers: {
                    ...headers, 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, X-Reaction-Visitor',
                    'Access-Control-Max-Age': '600',
                }
            });
        }
        if (!['GET', 'PUT'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);
        const kind = url.searchParams.get('kind');
        const id = url.searchParams.get('id');
        const visitor = request.headers.get('X-Reaction-Visitor') || '';
        if (!['music', 'blog'].includes(kind) || !id || id.length > 300 || !UUID.test(visitor)) {
            return json({ error: 'Invalid request' }, 400);
        }
        try {
            // IPはDBに保存せず、Cloudflare側の短時間の操作制限だけに使う。
            const ip = request.headers.get('CF-Connecting-IP') || visitor;
            if (!(await env.REQUEST_LIMITER.limit({ key: ip })).success ||
                (request.method === 'PUT' && !(await env.WRITE_LIMITER.limit({ key: ip })).success)) {
                headers['Retry-After'] = '60';
                return json({ error: 'Too many requests' }, 429);
            }
            let change;
            if (request.method === 'PUT') {
                if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'JSON required' }, 415);
                try { change = await smallJson(request); } catch { return json({ error: 'Invalid JSON body' }, 400); }
                if (!change || !EMOJIS.includes(change.emoji) || typeof change.selected !== 'boolean') {
                    return json({ error: 'Invalid reaction' }, 400);
                }
            }
            const contents = await catalog(env);
            if (!contents[kind].includes(id)) return json({ error: 'Content not found' }, 404);
            const visitorHash = await hash(visitor);
            const reads = queries(env.DB, kind, id, visitorHash);
            if (!change) return json(snapshot(await env.DB.batch(reads)));
            const write = change.selected
                ? env.DB.prepare('INSERT OR IGNORE INTO reactions(kind, content_id, visitor_hash, emoji) VALUES (?, ?, ?, ?)')
                : env.DB.prepare('DELETE FROM reactions WHERE kind = ? AND content_id = ? AND visitor_hash = ? AND emoji = ?');
            // 書き込みと件数取得を同じトランザクションで実行。再送でも重複加算しない。
            const results = await env.DB.batch([write.bind(kind, id, visitorHash, change.emoji), ...reads]);
            return json(snapshot(results.slice(1)));
        } catch (error) {
            console.error('Reaction API failed', error instanceof Error ? error.message : 'Unknown error');
            return json({ error: 'Service temporarily unavailable' }, 503);
        }
    },
};
