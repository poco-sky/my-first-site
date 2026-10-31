// プロフィールの文章・画像・資格・SNSはここで編集します。
export const profile = {
    name: 'Sora', birthYear: '2004', pronoun: 'He, Him', mbti: 'INTJ-A (建築家)',
    introduction: '好きなものを，好きなように，好きなだけ．\n趣味の一環でAIを用いて服をデザインしたり，音楽を作ったりしています．\nそれらの作品はこのサイトで閲覧できるのでぜひ見てみてください！\nまた，来年からの社会人生活に向けてNISAやふるさと納税などの様々な事柄を勉強中です．\nこのページには、自分らしいものを少しずつ集めていきます．',
    image: '/images/pro.png', imageAlt: 'フグ',
};
// 記入例です。実際の資格と取得日に変更してください。日付順に表示されます。
export const qualifications = [
    { date: '2023-10', name: 'ITパスポート', note: '2023-10' },
    { date: '2024-05', name: '情報セキュリティマネジメント', note: '2024-05' },
    { date: '2024-09', name: 'G検定', note: '2024-09' },
    { date: '2025-02', name: 'TOEIC L&R test score 745', note: '2025-02' },
];
export const skills = [
    {
        name: 'Astro', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/astro/astro-original.svg',
    },
    {
        name: 'C言語', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/c/c-original.svg',
    },
    {
        name: 'Canva', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/canva/canva-original.svg',
    },
    {
        name: 'ChatGPT', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
    },
    {
        name: 'C++', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/cplusplus/cplusplus-original.svg',
    },
    {
        name: 'Python', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/python/python-original.svg',
    },
];

export const favorites = [ //新しい写真は一番上に追加する
    { title: '堤防の野良猫', category: 'SCENERY', image: '/images/cat.jpg', alt: '猫', description: '釣行中に足元に忍び寄っていた野良猫の1枚．\n野良猫にしては太っている？と感じたあなたの感覚は鋭い．\nこの子のような堤防に住み着く野良猫は，我々釣り人が魚を釣り上げるのをじっと待ち，釣れるとそっと近づいてきてこの眼差しでおねだりするのだ．\n結果，天然のデブ猫が完成する．すごくかわいい．' },
    { title: '釣り上げたクサフグ', category: 'SCENERY', image: '/images/fugu.jpg', alt: 'クサフグ', description: '趣味の釣行にて撮影したクサフグの1枚．。\n釣り人の間では「餌を取られるわ，ハリスは切られるわ，食べられないわ」の三拍子で嫌われがちなこの魚だが，私はぷくぷくしていて「ｷｭｯ，ｷｭｯ」と鳴くのが可愛いので好きである．' },
];
// 自分のURLを入力するとSNSボタンが有効になります。
export const socials = [
    { name: 'Instagram', url: 'https://www.instagram.com/in_the_sky.04?obrf=MW16cHRteG41M3hoeQ%3D%3D&utm_source=qr' },
    { name: 'GitHub', url: 'https://github.com/poco-sky' },
    { name: 'Suno', url: 'https://suno.com/@in_the_sky' },
];
