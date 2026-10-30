// 剰余の偏りを避けた乱数でFisher–Yatesシャッフルする。
function randomIndex(max: number): number {
    const range = 0x100000000;
    const limit = range - range % max;
    const value = new Uint32Array(1);
    do { crypto.getRandomValues(value); } while (value[0] >= limit);
    return value[0] % max;
}

export function shuffledIds(ids: readonly string[], previous?: readonly string[]): string[] {
    if (ids.length < 2) return [...ids];
    let result: string[];
    do {
        result = [...ids];
        for (let i = result.length - 1; i > 0; i--) {
            const j = randomIndex(i + 1);
            [result[i], result[j]] = [result[j], result[i]];
        }
        // 前回と完全一致した場合だけ再抽選。先頭曲が同じになることはある。
    } while (previous?.length === result.length && result.every((id, i) => id === previous[i]));
    return result;
}
