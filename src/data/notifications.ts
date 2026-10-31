export interface Notice {
    text: string;
    emphasis?: string;
    suffix?: string;
    href: string;
    date: string;
}

// Favoritesを追加した日付だけを記入。
const favoriteDates = [
    '2026-10-27', //クサフグ
    '2026-10-31', //野良猫
];

export const notifications: Notice[] = favoriteDates.map(date => ({
    text: 'PROFILEに新たな',
    emphasis: 'Favorites',
    suffix: 'を追加しました.',
    href: '/about/',
    date,
}));