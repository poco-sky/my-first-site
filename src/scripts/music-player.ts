import type { Track } from '../data/music';
import { shuffledIds } from './music-queue';

let playerOwner: SoraMusicPlayer | undefined;

// ひとつのaudio要素を全ページで共有する。再生位置がUIと回転の唯一の基準。
class SoraMusicPlayer extends HTMLElement {
    private initialized = false;
    private tracks: Track[] = [];
    private queue: string[] = [];
    private queueIndex = -1;
    private continuousMode = false;
    private lastShuffles = new Map<string, string[]>();
    private audio!: HTMLAudioElement;
    private active: Track | null = null;
    private panelOpen = false;
    private language: 'original' | 'translation' = 'original';
    private genre = '洋楽';
    private sortOrder: 'oldest' | 'newest' = 'newest';
    private genreSortOrders = new Map<string, 'oldest' | 'newest'>();
    private request = 0;
    private frame = 0;
    private mobile = window.matchMedia('(max-width: 700px)');
    private error = '';
    private get bar() { return this.querySelector<HTMLElement>('.music-bar')!; }
    private get panel() { return this.querySelector<HTMLElement>('.music-details')!; }
    private get playing() { return !this.audio.paused && !this.audio.ended; }
    private text(selector: string, value: string) { this.querySelector(selector)!.textContent = value; }

    connectedCallback() {
        if (this.initialized || (playerOwner && playerOwner !== this)) return;
        playerOwner = this;
        this.initialized = true;
        this.audio = this.querySelector('audio')!;
        this.tracks = JSON.parse(this.querySelector('[data-music-catalog]')!.textContent || '[]');
        this.addEventListener('click', event => {
            const target = (event.target as Element).closest<HTMLElement>('[data-player-action], [data-lyric]');
            if (!target) return;
            if (target.dataset.lyric) { this.setLanguage(target.dataset.lyric as 'original' | 'translation'); return; }
            switch (target.dataset.playerAction) {
                case 'toggle': this.toggle(); break;
                case 'previous': this.moveTrack(-1); break;
                case 'next': this.moveTrack(1); break;
                case 'close': this.closePlayer(); break;
                case 'details':
                    if (this.panelOpen) {
                        this.closePanel();
                    } else {
                        this.openPanel();
                    }
                    break;
                case 'hide-details': this.closePanel(); break;
            }
        });
        document.addEventListener('click', event => {
            const target = (event.target as Element).closest<HTMLElement>(
                '[data-track-play], [data-music-filter], [data-music-sort], [data-music-shuffle], [data-music-sequence]'
            );
            if (!target) return;
            if (target.hasAttribute('data-music-shuffle')) this.startShuffle();
            if (target.hasAttribute('data-music-sequence')) this.startSequence();
            if (target.dataset.trackPlay) this.select(target.dataset.trackPlay);
            if (target.dataset.musicFilter) {
                const nextGenre = target.dataset.musicFilter;

                if (nextGenre !== this.genre) {
                    // 切り替え前のジャンルの並び順を記憶。
                    this.genreSortOrders.set(this.genre, this.sortOrder);

                    this.genre = nextGenre;

                    // 保存済みの並び順を復元。初めてなら新着順。
                    this.sortOrder =
                        this.genreSortOrders.get(nextGenre) ?? 'newest';

                    this.filter();
                    this.sortCards();
                }
            }
            if (target.hasAttribute('data-music-sort')) {
                this.sortOrder =
                    this.sortOrder === 'oldest' ? 'newest' : 'oldest';

                this.genreSortOrders.set(this.genre, this.sortOrder);
                this.sortCards();
            }
        });
        this.querySelector<HTMLInputElement>('.player-seek')!.addEventListener('input', event => {
            if (!Number.isFinite(this.audio.duration)) return;
            this.audio.currentTime = Number((event.target as HTMLInputElement).value);
            this.drawProgress();
        });
        for (const type of ['play', 'playing', 'pause', 'ended', 'loadedmetadata', 'durationchange', 'seeking', 'seeked', 'timeupdate', 'emptied']) {
            this.audio.addEventListener(type, () => { this.updatePlayback(); });
        }
        this.audio.addEventListener('ended', () => {
            if (this.continuousMode && this.audio.ended) this.moveTrack(1);
        });
        this.audio.addEventListener('error', () => {
            if (this.active) { this.error = '音声を読み込めませんでした。ファイルの場所を確認してください。'; this.updatePlayback(); }
        });
        document.addEventListener('astro:after-swap', () => this.restorePage());
        document.addEventListener('astro:page-load', () => this.restorePage());
        this.mobile.addEventListener('change', () => this.layout());
        document.addEventListener('keydown', event => this.onKeydown(event));
        this.restorePage();
    }

    private select(id: string) {
        const track = this.tracks.find(item => item.id === id);
        if (!track) return;
        if (this.active?.id === id) { this.toggle(); return; }
        this.continuousMode = false;
        this.queue = this.tracks.filter(item => item.genre === track.genre).map(item => item.id);
        if (this.sortOrder === 'newest') this.queue.reverse();
        this.queueIndex = this.queue.indexOf(id);
        this.startTrack(id);
    }
    private startSequence() {
        // 現在表示されているカードを、画面に並んでいる順に取得。
        const cards = document.querySelectorAll<HTMLElement>(
            '.music-grid [data-track-card]:not([hidden])',
        );

        const ids = Array.from(cards)
            .map(card => card.dataset.trackCard!)
            .filter(id => this.tracks.some(track => track.id === id));

        if (!ids.length) return;

        this.queue = ids;
        this.queueIndex = 0;
        this.continuousMode = true;
        this.startTrack(this.queue[0]);
    }
    private startShuffle() {
        const ids = this.tracks.filter(track => track.genre === this.genre).map(track => track.id);
        if (!ids.length) return;
        this.queue = shuffledIds(ids, this.lastShuffles.get(this.genre));
        this.lastShuffles.set(this.genre, [...this.queue]);
        this.queueIndex = 0;
        this.continuousMode = true;
        this.startTrack(this.queue[0]);
    }

    private moveTrack(direction: -1 | 1) {
        const index = this.queueIndex + direction;
        if (!this.active || index < 0 || index >= this.queue.length) return;
        this.queueIndex = index;
        this.startTrack(this.queue[index]);
    }

    private startTrack(id: string) {
        const track = this.tracks.find(item => item.id === id);
        if (!track) return;
        ++this.request;
        this.audio.pause();
        this.active = track;
        this.language = 'original';
        this.error = '';
        this.audio.src = track.audio;
        this.audio.load();
        this.updateTrack();
        this.layout();
        this.updatePlayback();
        this.play();
    }

    private async play() {
        if (!this.active) return;
        const token = ++this.request;
        this.error = '';
        if (this.audio.error) { this.audio.src = this.active.audio; this.audio.load(); }
        if (this.audio.ended) this.audio.currentTime = 0;
        try { await this.audio.play(); }
        catch (error) {
            if (token !== this.request) return;
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
                this.error = '再生できませんでした。もう一度再生ボタンを押してください。';
            }
        }
        if (token === this.request) this.updatePlayback();
    }

    private toggle() {
        if (!this.active) return;
        if (this.playing) { ++this.request; this.audio.pause(); }
        else this.play();
    }

    private closePlayer() {
        const id = this.active?.id;
        ++this.request;
        this.audio.pause();
        this.active = null;
        this.queue = [];
        this.queueIndex = -1;
        this.continuousMode = false;
        this.error = '';
        this.panelOpen = false;
        this.audio.removeAttribute('src');
        this.audio.load();
        this.layout();
        this.updatePlayback();
        const card = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-track-play]')).find(el => el.dataset.trackPlay === id && !el.closest('[hidden]'));
        (card ?? document.querySelector<HTMLElement>('#main'))?.focus({ preventScroll: true });
    }

    private updateTrack() {
        if (!this.active) return;
        for (const selector of ['.bar-cover', '.detail-cover']) {
            const image = this.querySelector<HTMLImageElement>(selector)!;
            image.src = this.active.cover;
            image.alt = `${this.active.title}のジャケット`;
        }
        this.text('.bar-title', this.active.title);
        this.text('.bar-artist', this.active.artist);
        this.text('#detail-title', this.active.title);
        this.text('.detail-artist', this.active.artist);
        this.text('.detail-genre', this.active.genre);
        this.setLanguage(this.language);
        this.querySelector('.detail-scroll')!.scrollTop = 0;
        this.querySelector('.detail-copy')!.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220 });
    }

    private setLanguage(language: 'original' | 'translation') {
        this.language = language;
        const value = language === 'original' ? this.active?.lyrics : this.active?.translation;
        const empty = this.active?.genre === 'Instrumental' ? 'この曲はInstrumentalです。' : '歌詞は準備中です。';
        this.text('#lyric-content', value?.trim() || empty);
        this.querySelector('#lyric-content')!.setAttribute('aria-labelledby', `lyric-${language}-tab`);
        this.querySelectorAll<HTMLButtonElement>('[data-lyric]').forEach(button => {
            const selected = button.dataset.lyric === language;
            button.setAttribute('aria-selected', String(selected));
            button.tabIndex = selected ? 0 : -1;
        });
    }

    private openPanel() {
        if (!this.active) return;
        this.panelOpen = true;
        this.layout();
        this.querySelector<HTMLButtonElement>('[data-player-action="hide-details"]')!.focus({ preventScroll: true });
    }
    private closePanel() {
        this.panelOpen = false;
        this.layout();
        this.querySelector<HTMLButtonElement>('[data-player-action="details"]')!.focus({ preventScroll: true });
    }
    private layout() {
        document.documentElement.dataset.musicActive = String(!!this.active);
        document.documentElement.dataset.musicPanel = String(this.panelOpen);
        this.bar.hidden = !this.active;
        this.panel.hidden = !this.panelOpen;
        this.querySelector('[data-player-action="details"]')!.setAttribute('aria-expanded', String(this.panelOpen));
        const modal = this.panelOpen && this.mobile.matches;
        this.panel.setAttribute('role', modal ? 'dialog' : 'complementary');
        if (modal) this.panel.setAttribute('aria-modal', 'true'); else this.panel.removeAttribute('aria-modal');
        const shell = document.querySelector<HTMLElement>('#site-shell');
        if (shell) shell.inert = modal;
        this.bar.inert = modal;
        window.dispatchEvent(new Event('resize'));
    }
    private restorePage() {
        // お知らせのリンクに指定されたジャンルを取得。
        const requestedGenre = new URLSearchParams(
            window.location.search,
        ).get('genre');

        const isMusicPage = !!document.querySelector('.music-grid');

        if (
            isMusicPage &&
            requestedGenre &&
            requestedGenre !== this.genre &&
            this.tracks.some(track => track.genre === requestedGenre)
        ) {
            // 現在のジャンルの並び順を保存。
            this.genreSortOrders.set(this.genre, this.sortOrder);

            // リンク先のジャンルと、そのジャンルの並び順を復元。
            this.genre = requestedGenre;
            this.sortOrder =
                this.genreSortOrders.get(requestedGenre) ?? 'newest';
        }

        this.layout();
        this.filter();
        this.sortCards();
        this.updatePlayback();
    }
    private sortCards() {
        const grid = document.querySelector('.music-grid');
        if (!grid) return;
        // 追加日の新旧で並べる。DOM順も揃えてキーボード操作に反映。
        const cards = Array.from(grid.querySelectorAll<HTMLElement>('[data-track-card]'));
        cards.sort((a, b) => (Number(a.dataset.trackIndex) - Number(b.dataset.trackIndex)) * (this.sortOrder === 'oldest' ? 1 : -1));
        grid.append(...cards);
        const label = this.sortOrder === 'oldest' ? '古い順' : '新着順';
        const next = this.sortOrder === 'oldest' ? '新着順' : '古い順';
        const button = document.querySelector<HTMLButtonElement>('[data-music-sort]');
        if (button) {
            button.textContent = `${label}↓`;
            button.setAttribute('aria-label', `現在は${label}。${next}に切り替える`);
        }
    }
    private filter() {
        const cards = document.querySelectorAll<HTMLElement>('[data-track-card]');
        let count = 0;
        cards.forEach(card => { card.hidden = card.dataset.trackGenre !== this.genre; if (!card.hidden) count++; });
        document.querySelectorAll('[data-music-filter]').forEach(button => button.setAttribute('aria-pressed', String((button as HTMLElement).dataset.musicFilter === this.genre)));
        const label = document.querySelector('#music-count'); if (label) label.textContent = `${count} TRACK${count === 1 ? '' : 'S'}`;
        const shuffle = document.querySelector<HTMLButtonElement>('[data-music-shuffle]');
        if (shuffle) {
            shuffle.disabled = count === 0;
            shuffle.setAttribute('aria-label', `$ランダム再生`);
            shuffle.title = `ランダム再生`;
        }
        const empty = document.querySelector<HTMLElement>('#music-empty'); if (empty) empty.hidden = count !== 0;
    }
    private updatePlayback() {
        this.querySelector<HTMLButtonElement>('[data-player-action="previous"]')!.disabled = !this.active || this.queueIndex <= 0;
        this.querySelector<HTMLButtonElement>('[data-player-action="next"]')!.disabled = !this.active || this.queueIndex >= this.queue.length - 1;
        this.dataset.playing = String(!!this.active && this.playing);
        this.querySelector('[data-player-action="toggle"]')!.setAttribute('aria-label', this.playing ? '一時停止' : '再生');
        const message = this.querySelector<HTMLElement>('.player-error')!;
        message.textContent = this.error; message.hidden = !this.error;
        document.querySelectorAll<HTMLElement>('[data-track-card]').forEach(card => {
            const selected = card.dataset.trackCard === this.active?.id;
            card.classList.toggle('is-current', selected);
            card.classList.toggle('is-playing', selected && this.playing);
            const button = card.querySelector('button')!;
            const title = this.tracks.find(item => item.id === card.dataset.trackCard)?.title || '';
            button.setAttribute('aria-pressed', String(selected && this.playing));
            button.setAttribute('aria-label', `${title}を${selected && this.playing ? '一時停止' : '再生'}`);
        });
        this.drawProgress();
        cancelAnimationFrame(this.frame);
        if (this.playing && this.active) this.frame = requestAnimationFrame(() => this.tick());
    }
    private tick() {
        this.drawProgress();
        if (this.playing && this.active) this.frame = requestAnimationFrame(() => this.tick());
    }
    private drawProgress() {
        const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
        const time = this.active ? this.audio.currentTime : 0;
        const seek = this.querySelector<HTMLInputElement>('.player-seek')!;
        seek.disabled = !duration;
        seek.max = String(duration); seek.value = String(time);
        seek.style.setProperty('--progress', `${duration ? time / duration * 100 : 0}%`);
        seek.setAttribute('aria-valuetext', `${formatTime(time)} / ${formatTime(duration)}`);
        this.text('.player-elapsed', formatTime(time)); this.text('.player-duration', formatTime(duration));
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.querySelectorAll<HTMLElement>('[data-track-card]').forEach(card => {
            const image = card.querySelector<HTMLElement>('.record-image');
            if (image) image.style.transform = `rotate(${card.dataset.trackCard === this.active?.id && !reduced ? (time * 15) % 360 : 0}deg)`;
        });
    }
    private onKeydown(event: KeyboardEvent) {
        if (!this.panelOpen) return;
        if (event.key === 'Escape') { event.preventDefault(); this.closePanel(); return; }
        const target = event.target as HTMLElement;
        if (target.dataset.lyric && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            this.setLanguage(event.key === 'Home' ? 'original' : event.key === 'End' ? 'translation' : this.language === 'original' ? 'translation' : 'original');
            this.querySelector<HTMLButtonElement>(`[data-lyric="${this.language}"]`)!.focus();
        }
        if (event.key === 'Tab' && this.mobile.matches) {
            const focusable = Array.from(this.panel.querySelectorAll<HTMLElement>('button:not([tabindex="-1"]), [tabindex="0"]'));
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    }
}
function formatTime(seconds: number) {
    if (!Number.isFinite(seconds)) return '0:00';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
if (!customElements.get('sora-music-player')) customElements.define('sora-music-player', SoraMusicPlayer);
