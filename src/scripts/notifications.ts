class SiteNotifications extends HTMLElement {
    private controller?: AbortController;
    private observer?: MutationObserver;
    private frame = 0;

    connectedCallback() {
        const button = this.querySelector<HTMLButtonElement>('.notice-toggle')!;
        const panel = this.querySelector<HTMLElement>('.notice-panel')!;
        this.controller = new AbortController();
        const { signal } = this.controller;
        const position = () => {
            this.frame = 0;
            if (panel.hidden) return;
            const rect = button.getBoundingClientRect();
            panel.style.setProperty('--notice-top', `${Math.max(0, rect.bottom) + 8}px`);
        };
        const schedule = () => {
            if (!this.frame) this.frame = requestAnimationFrame(position);
        };
        const close = (focus = false) => {
            panel.hidden = true;
            button.setAttribute('aria-expanded', 'false');
            button.title = 'お知らせを開く';
            if (focus) button.focus();
        };
        button.addEventListener('click', () => {
            if (!panel.hidden) { close(); return; }
            // スマホのメニューと重ねない。本文操作・スクロールは制限しない。
            document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
            panel.hidden = false;
            button.setAttribute('aria-expanded', 'true');
            button.title = 'お知らせを閉じる';
            position();
        }, { signal });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !panel.hidden) close(true);
        }, { signal });
        document.addEventListener('click', event => {
            if (panel.hidden || !(event.target instanceof Node)) return;

            if (
                !panel.contains(event.target) &&
                !button.contains(event.target)
            ) {
                close();
            }
        }, { signal });
        document.addEventListener('astro:before-swap', () => close(), { signal });
        window.addEventListener('scroll', schedule, { passive: true, signal });
        window.addEventListener('resize', schedule, { signal });
        const nav = document.querySelector('#main-menu');
        this.observer = new MutationObserver(schedule);
        if (nav) this.observer.observe(nav, { attributes: true, attributeFilter: ['class'] });
    }

    disconnectedCallback() {
        this.controller?.abort();
        this.observer?.disconnect();
        cancelAnimationFrame(this.frame);
    }
}

if (!customElements.get('site-notifications')) {
    customElements.define('site-notifications', SiteNotifications);
}
