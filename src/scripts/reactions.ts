type Kind = 'music' | 'blog';
type Emoji = 'like' | 'love' | 'moved' ;
type Snapshot = { counts: Record<Emoji, number>; selected: Emoji[] };
type State = { snapshot?: Snapshot; pending: boolean; loading: boolean; error: string; version: number; updated: number; message?: string };
const keys: Emoji[] = ['like', 'love', 'moved'];
const storageKey = 'sora-reaction-visitor-v1';
const states = new Map<string, State>();
const changes = new EventTarget();
// 共通のリアクション演出。サイズと表示時間はここで調節できます。
const reactionEffectSize = 'clamp(160px, 36vw, 280px)';
const reactionEffectDuration = 850;
const reactionSymbols: Record<Emoji, string> = { like: '👍', love: '❤️', moved: '🥹' };
let clearReactionEffect: (() => void) | undefined;
function showReactionEffect(emoji: Emoji) {
    clearReactionEffect?.();
    const effect = document.createElement('div');
    effect.className = 'reaction-celebration';
    effect.setAttribute('aria-hidden', 'true');
    effect.textContent = reactionSymbols[emoji];
    // body直下に置き、曲ページの幅やスクロール位置から独立させる。
    Object.assign(effect.style, {
        position: 'fixed', left: '50%', top: '45%', zIndex: '2147483647',
        pointerEvents: 'none', userSelect: 'none', lineHeight: '1',
        fontSize: reactionEffectSize, fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        transform: 'translate(-50%, -50%)', filter: 'drop-shadow(0 8px 16px rgb(0 0 0 / 18%))',
    });
    document.body.append(effect);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 350 : reactionEffectDuration;
    const animation = effect.animate(reduced ? [
        { opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 },
    ] : [
        { opacity: 0, transform: 'translate(-50%, calc(-50% + 36px)) scale(0.35) rotate(-12deg)' },
        { opacity: 1, transform: 'translate(-50%, calc(-50% - 16px)) scale(1.18) rotate(7deg)', offset: 0.3 },
        { opacity: 1, transform: 'translate(-50%, calc(-50% + 5px)) scale(0.94) rotate(-3deg)', offset: 0.48 },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', offset: 0.64 },
        { opacity: 0, transform: 'translate(-50%, calc(-50% - 48px)) scale(1.05) rotate(0deg)' },
    ], { duration, easing: 'ease-out', fill: 'forwards' });
    const cleanup = () => {
        clearTimeout(timer);
        animation.cancel();
        effect.remove();
        if (clearReactionEffect === cleanup) clearReactionEffect = undefined;
    };
    const timer = window.setTimeout(cleanup, duration + 100);
    animation.onfinish = cleanup;
    clearReactionEffect = cleanup;
}
document.addEventListener('astro:before-swap', () => clearReactionEffect?.());
let visitor: string | undefined;
let channel: BroadcastChannel | undefined;
try { channel = new BroadcastChannel('sora-reactions-v1'); } catch { /* 複数タブ同期非対応 */ }
function identity() {
    const saved = localStorage.getItem(storageKey);
    if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved)) return visitor = saved;
    if (!visitor) visitor = crypto.randomUUID();
    localStorage.setItem(storageKey, visitor);
    return visitor;
}
function state(key: string): State {
    if (!states.has(key)) states.set(key, { pending: false, loading: false, error: '', version: 0, updated: 0 });
    return states.get(key)!;
}
function notify(key: string) { changes.dispatchEvent(new CustomEvent('change', { detail: key })); }
function validate(data: Snapshot): Snapshot {
    if (!data || !data.counts || !Array.isArray(data.selected) ||
        !keys.every(k => Number.isSafeInteger(data.counts[k]) && data.counts[k] >= 0) ||
        !data.selected.every(k => keys.includes(k))) throw new Error('リアクションを読み込めませんでした。');
    return data;
}
async function request(api: string, kind: Kind, id: string, change?: { emoji: Emoji; selected: boolean }): Promise<Snapshot> {
    let token: string;
    try { token = identity(); } catch { throw new Error('ブラウザの保存機能を有効にして再試行してください。'); }
    const url = new URL(api.replace(/\/$/, '') + '/v1/reactions');
    url.searchParams.set('kind', kind); url.searchParams.set('id', id);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch(url, {
            method: change ? 'PUT' : 'GET', cache: 'no-store', credentials: 'omit', signal: controller.signal,
            headers: { 'X-Reaction-Visitor': token, ...(change ? { 'Content-Type': 'application/json' } : {}) },
            body: change ? JSON.stringify(change) : undefined,
        });
        if (!response.ok) {
            if (response.status === 429) throw new Error('操作が続いています。少し待って再試行してください。');
            throw new Error('通信できませんでした。再試行してください。');
        }
        return validate(await response.json());
    } finally { clearTimeout(timer); }
}
async function load(key: string, api: string, kind: Kind, id: string, force = false) {
    const s = state(key);
    if (s.pending || s.loading || (!force && s.snapshot && Date.now() - s.updated < 30000)) return;
    s.loading = true; s.error = ''; s.message = ''; const version = ++s.version; notify(key);
    try { const result = await request(api, kind, id); if (s.version === version) { s.snapshot = result; s.updated = Date.now(); } }
    catch (error) { if (s.version === version) s.error = error instanceof Error ? error.message : '通信できませんでした。'; }
    finally { if (s.version === version) { s.loading = false; notify(key); } }
}
async function toggle(key: string, api: string, kind: Kind, id: string, emoji: Emoji, source: HTMLElement) {
    const s = state(key);
    if (s.pending || s.loading || !s.snapshot || s.error) return;
    const selected = !s.snapshot.selected.includes(emoji);
    s.pending = true; s.error = ''; s.message = ''; const version = ++s.version; notify(key);
    try {
        const result = await request(api, kind, id, { emoji, selected });
        if (s.version !== version) return;
        s.snapshot = result;
        s.message = selected ? 'リアクションを送りました。' : 'リアクションを取り消しました。';
        s.updated = Date.now();
        // 保存成功時のみ表示。取り消し・別ページへの移動・曲変更後には出さない。
        if (selected && result.selected.includes(emoji) && source.isConnected &&
            source.dataset.contentId === id && !document.hidden) showReactionEffect(emoji);
        channel?.postMessage({ key });
    } catch (error) {
        // 成否不明でも件数を増やしたふりをしない。再取得してから再操作。
        if (s.version === version) s.error = error instanceof Error ? error.message : '保存できませんでした。再試行してください。';
    } finally { if (s.version === version) { s.pending = false; notify(key); } }
}
let serial = 0;
class SoraReactions extends HTMLElement {
    static observedAttributes = ['data-content-id'];
    private controller?: AbortController;
    private opened = false;
    private mobile = window.matchMedia('(max-width: 700px)');
    private observer?: ResizeObserver;
    private key = '';
    private get compact() { return this.dataset.compact === 'true'; }
    private get kind() { return this.dataset.kind as Kind; }
    private get contentId() { return this.dataset.contentId || ''; }
    private get api() { return this.dataset.api || ''; }
    private get box() { return this.querySelector<HTMLElement>('[data-reaction-box]')!; }
    private get trigger() { return this.querySelector<HTMLButtonElement>('[data-reaction-trigger]'); }
    connectedCallback() {
        this.controller?.abort(); this.controller = new AbortController();
        const { signal } = this.controller;
        if (!this.box.id) this.box.id = `reactions-${++serial}`;
        this.trigger?.setAttribute('aria-controls', this.box.id);
        this.addEventListener('click', event => {
            if (!(event.target instanceof Element)) return;
            if (event.target.closest('[data-reaction-trigger]')) { this.opened ? this.close() : this.open(); return; }
            if (event.target.closest('.reaction-retry')) { this.refresh(true); return; }
            const button = event.target.closest<HTMLButtonElement>('[data-emoji]');
            if (button && !button.disabled && this.key) void toggle(this.key, this.api, this.kind, this.contentId, button.dataset.emoji as Emoji, this);
        }, { signal });
        changes.addEventListener('change', e => { if ((e as CustomEvent).detail === this.key) this.draw(); }, { signal });
        document.addEventListener('pointerdown', e => { if (e.target instanceof Node && !this.contains(e.target)) this.close(); }, { signal });
        document.addEventListener('focusin', e => { if (e.target instanceof Node && !this.contains(e.target)) this.close(); }, { signal });
        document.addEventListener('keydown', e => {
            if (this.opened && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.close(true); }
        }, { capture: true, signal });
        document.addEventListener('astro:before-swap', () => this.close(), { signal });
        document.addEventListener('visibilitychange', () => { if (!document.hidden) this.refresh(true); }, { signal });
        this.mobile.addEventListener('change', () => {
            const hadFocus = this.contains(document.activeElement);
            this.close();
            if (this.compact && hadFocus) {
                const target = this.mobile.matches ? this.trigger : this.querySelector<HTMLButtonElement>('[data-emoji]:not(:disabled)');
                target?.focus({ preventScroll: true });
            }
        }, { signal });
        window.addEventListener('resize', () => { if (this.opened) this.position(); }, { signal });
        window.visualViewport?.addEventListener('resize', () => { if (this.opened) this.position(); }, { signal });
        this.observer = new ResizeObserver(() => { if (this.opened) this.position(); });
        this.observer.observe(this.box);
        this.bind();
    }
    disconnectedCallback() { this.close(); this.controller?.abort(); this.observer?.disconnect(); }
    attributeChangedCallback() { if (this.isConnected && this.controller) this.bind(); }
    private bind() {
        this.close();
        this.key = this.contentId ? JSON.stringify([this.api, this.kind, this.contentId]) : '';
        this.draw(); this.refresh();
    }
    private refresh(force = false) {
        if (this.key) void load(this.key, this.api, this.kind, this.contentId, force);
    }
    private draw() {
        const s = this.key ? state(this.key) : undefined;
        this.dataset.error = String(!!s?.error);
        if (this.trigger) {
            this.trigger.disabled = !this.key;
            this.trigger.dataset.selected = String(!!s?.snapshot?.selected.length);
        }
        this.querySelectorAll<HTMLButtonElement>('[data-emoji]').forEach(button => {
            const emoji = button.dataset.emoji as Emoji;
            const count = s?.snapshot?.counts[emoji];
            const selected = !!s?.snapshot?.selected.includes(emoji);
            button.disabled = !s?.snapshot || s.pending || s.loading || !!s.error;
            button.setAttribute('aria-pressed', String(selected));
            button.setAttribute('aria-label', `${button.dataset.label}${count === undefined ? '' : `：${count}件`}${selected ? '、選択済み。押すと取り消し' : ''}`);
            button.querySelector('.reaction-count')!.textContent = count === undefined ? '—' : count.toLocaleString('ja-JP');
        });
        this.box.setAttribute('aria-busy', String(!!s?.pending || !!s?.loading));
        this.querySelector('.reaction-status')!.textContent = s?.error || (s?.pending ? '保存中…' : s?.loading ? '読み込み中…' : s?.message || '');
        this.querySelector<HTMLButtonElement>('.reaction-retry')!.hidden = !s?.error;
    }
    private open() {
        if (!this.key || !this.compact || !this.mobile.matches) return;
        document.querySelectorAll<SoraReactions>('sora-reactions').forEach(el => { if (el !== this) el.close(); });
        this.opened = true; this.box.hidden = false;
        this.trigger?.setAttribute('aria-expanded', 'true');
        this.position(); this.refresh(true);
        this.box.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], {
            duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160, easing: 'ease-out',
        });
        // ローディング中もキーボードでパネルへ移動できる。
        this.box.tabIndex = -1; this.box.focus({ preventScroll: true });
    }
    close(restoreFocus = false) {
        this.opened = false;
        if (this.compact && this.box) {
            this.box.hidden = this.mobile.matches;
            this.box.style.removeProperty('width');
            this.box.style.removeProperty('left');
            this.box.style.removeProperty('top');
            this.box.removeAttribute('tabindex');
        }
        this.trigger?.setAttribute('aria-expanded', 'false');
        if (restoreFocus) this.trigger?.focus({ preventScroll: true });
    }
    private position() {
        const trigger = this.trigger;
        if (!trigger) return;
        const r = trigger.getBoundingClientRect();
        const bar = this.closest('.music-bar')?.getBoundingClientRect();
        const right = Math.min(document.documentElement.clientWidth, bar?.right ?? innerWidth) - 10;
        this.box.style.width = `${Math.max(0, Math.min(330, right - 10))}px`;
        const width = this.box.getBoundingClientRect().width;
        const left = Math.max(10, Math.min(r.left + r.width / 2 - width / 2, right - width));
        this.box.style.left = `${left}px`;
        this.box.style.top = `${Math.max(10, r.top - this.box.getBoundingClientRect().height - 12)}px`;
        this.box.style.setProperty('--reaction-tail', `${Math.max(16, Math.min(width - 16, r.left + r.width / 2 - left))}px`);
    }
}
if (!customElements.get('sora-reactions')) customElements.define('sora-reactions', SoraReactions);
channel?.addEventListener('message', event => {
    const key = event.data?.key;
    if (typeof key !== 'string' || !states.has(key)) return;
    const [api, kind, id] = JSON.parse(key);
    void load(key, api, kind, id, true);
});
window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    visitor = undefined;
    for (const [key, s] of states) {
        ++s.version; s.snapshot = undefined; s.updated = 0; s.loading = false; s.pending = false;
        const [api, kind, id] = JSON.parse(key); void load(key, api, kind, id, true);
    }
});
export {};
