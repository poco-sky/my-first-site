const noticeStorageKey = "sora-notices-seen-v1";

// 保存が使えない場合も、同じタブ内では確認済みを保持
const sessionSeen = new Set<string>();

function readSeenNotices(): Set<string> {
    const seen = new Set(sessionSeen);

    try {
        const saved: unknown = JSON.parse(
            localStorage.getItem(noticeStorageKey) || "[]",
        );

        if (Array.isArray(saved)) {
            saved.forEach((key) => {
                if (typeof key === "string") seen.add(key);
            });
        }
    } catch {
        // 保存機能が使えなくても、お知らせ自体は利用可能
    }

    return seen;
}

class SiteNotifications extends HTMLElement {
    private controller?: AbortController;
    private observer?: MutationObserver;
    private frame = 0;

    connectedCallback() {
        this.controller?.abort();
        this.observer?.disconnect();
        cancelAnimationFrame(this.frame);
        this.frame = 0;

        const button =
            this.querySelector<HTMLButtonElement>(".notice-toggle");
        const panel =
            this.querySelector<HTMLElement>(".notice-panel");
        const bubble =
            this.querySelector<HTMLElement>(".notice-unread-bubble");

        if (!button || !panel || !bubble) return;

        const keys = JSON.parse(
            this.dataset.noticeKeys || "[]",
        ) as string[];

        this.controller = new AbortController();
        const { signal } = this.controller;

        const position = () => {
            this.frame = 0;
            const rect = button.getBoundingClientRect();

            if (!panel.hidden) {
                panel.style.setProperty(
                    "--notice-top",
                    `${Math.max(0, rect.bottom) + 8}px`,
                );
            }

            if (bubble.hidden) return;

            // ベル自体が画面外にある間は吹き出しも見せない
            const visible =
                rect.width > 0 &&
                rect.height > 0 &&
                rect.bottom > 0 &&
                rect.top < window.innerHeight;

            bubble.style.visibility = visible ? "visible" : "hidden";
            if (!visible) return;

            const width = bubble.getBoundingClientRect().width;
            const viewportWidth = document.documentElement.clientWidth;

            // ベルの中央を基準に配置し、画面端からはみ出さないようにする
            const center = rect.left + rect.width / 2;
            const left = Math.max(
                12,
                Math.min(center - width / 2, viewportWidth - width - 12),
            );

            bubble.style.left = `${left}px`;
            bubble.style.top = `${rect.bottom + 12}px`;

            // 吹き出しの先端はベルの方向へ向ける
            bubble.style.setProperty(
                "--notice-bubble-tail",
                `${Math.max(16, Math.min(width - 16, center - left))}px`,
            );
        };

        const schedule = () => {
            if (!this.frame) {
                this.frame = requestAnimationFrame(position);
            }
        };

        const updateUnread = () => {
            const seen = readSeenNotices();

            // このブラウザで未確認のお知らせの件数
            const unreadCount = keys.filter((key) => !seen.has(key)).length;

            const message =
                unreadCount > 10
                    ? "10件以上の新しいお知らせがあります"
                    : `${unreadCount}件の新しいお知らせがあります`;

            bubble.textContent = message;
            bubble.hidden = unreadCount === 0 || !panel.hidden;

            button.setAttribute(
                "aria-label",
                unreadCount > 0 ? `お知らせ：${message}` : "お知らせ",
            );

            // 文章の長さが変わるので、吹き出しの位置を再計算
            position();
        };

        const markAsSeen = () => {
            const seen = readSeenNotices();

            keys.forEach((key) => {
                seen.add(key);
                sessionSeen.add(key);
            });

            try {
                localStorage.setItem(
                    noticeStorageKey,
                    JSON.stringify([...seen]),
                );
            } catch {
                // 保存できない場合は、このタブ内の記憶を使用
            }

            updateUnread();
        };

        const close = (focus = false) => {
            panel.hidden = true;
            button.setAttribute("aria-expanded", "false");
            button.title = "お知らせを開く";

            updateUnread();

            if (focus) button.focus({ preventScroll: true });
        };

        button.addEventListener(
            "click",
            () => {
                if (!panel.hidden) {
                    close();
                    return;
                }

                document
                    .querySelector(".menu-toggle")
                    ?.setAttribute("aria-expanded", "false");

                panel.hidden = false;
                button.setAttribute("aria-expanded", "true");
                button.title = "お知らせを閉じる";

                // 開いた時点で確認済みにする
                markAsSeen();
                position();
            },
            { signal },
        );
        bubble.addEventListener(
            "click",
            (event) => {
                // 外側クリックの処理で即座に閉じるのを防ぐ
                event.stopPropagation();

                if (panel.hidden) {
                    button.click();

                    // 消える吹き出しからベルへフォーカスを移す
                    button.focus({ preventScroll: true });
                }
            },
            { signal },
        );

        document.addEventListener(
            "keydown",
            (event) => {
                if (event.key === "Escape" && !panel.hidden) close(true);
            },
            { signal },
        );

        document.addEventListener(
            "click",
            (event) => {
                if (panel.hidden || !(event.target instanceof Node)) return;

                if (
                    !panel.contains(event.target) &&
                    !button.contains(event.target)
                ) {
                    close();
                }
            },
            { signal },
        );

        // 別タブで確認した場合も反映
        window.addEventListener(
            "storage",
            (event) => {
                if (
                    event.key === noticeStorageKey ||
                    event.key === null
                ) {
                    updateUnread();
                }
            },
            { signal },
        );

        document.addEventListener(
            "astro:before-swap",
            () => close(),
            { signal },
        );

        window.addEventListener("scroll", schedule, {
            passive: true,
            signal,
        });
        window.addEventListener("resize", schedule, { signal });
        window.addEventListener("pageshow", updateUnread, { signal });

        this.observer = new MutationObserver(schedule);

        const nav = document.querySelector("#main-menu");
        if (nav) {
            this.observer.observe(nav, {
                attributes: true,
                attributeFilter: ["class"],
            });
        }

        // 1/3曲ページの開閉によるベルの位置変更にも対応
        this.observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-music-panel", "data-theme"],
        });

        updateUnread();
    }

    disconnectedCallback() {
        this.controller?.abort();
        this.observer?.disconnect();
        cancelAnimationFrame(this.frame);
        this.frame = 0;
    }
}

if (!customElements.get("site-notifications")) {
    customElements.define("site-notifications", SiteNotifications);
}