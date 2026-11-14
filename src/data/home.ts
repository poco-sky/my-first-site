// ホームの写真・見出し・リンク先をここで変更できます。
export const homePanels = [
    {
        title: 'Profile',
        description: '何が嫌いかより何が好きかで自分を語ろう',
        image: '/images/profile1.png',
        alt: 'オーロラが降り注ぐ幻想的な風景',
        href: '/about/',
        linkLabel: 'Soraのプロフィールを見る',
        kind: 'profile',

        slides: [
            {
                src: '/images/profile1.png',
                alt: 'オーロラが降り注ぐ幻想的な風景',
            },
            {
                src: '/images/profile3.png',
                alt: '空を映す海',
            },
            {
                src: '/images/profile4.png',
                alt: '青い光が差し込む神秘的な洞窟',
            },
        ],
    },
    { title: 'POCO DI TINI', description: 'オリジナルのファッションデザイン', image: '/images/fashion.png', alt: 'pcco-di-tini', href: '/fashion/', linkLabel: 'コレクションを見る', kind: 'fashion' },
    { title: 'Music', description: '洋楽 & Instrumental', image: '/images/music.jpg', alt: '窓辺のレコードプレーヤー', href: '/music/', linkLabel: '音楽を聴く', kind: 'music' },
    { title: 'Blog', description: 'サイトのアップデート内容や思い出など', image: '/images/blog.webp', alt: '光が差し込む机の上のノートとコーヒー', href: '/blog/', linkLabel: 'ブログを読む', kind: 'blog' },
];

