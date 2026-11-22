// 空白・大文字小文字・全角半角を揃えて曲名を部分一致で検索する。
export const normalizeMusicSearch = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\s+/gu, '');
export const matchesMusicTitle = (title: string, query: string) => normalizeMusicSearch(title).includes(normalizeMusicSearch(query));
