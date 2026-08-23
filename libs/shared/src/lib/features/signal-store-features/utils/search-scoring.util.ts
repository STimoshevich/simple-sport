/**
 * Нечёткий поиск по коротким текстам (названия упражнений, блюд и т.п.).
 *
 * Скоринг многоуровневый, от точного совпадения к триграммам:
 * - 1000 — точное совпадение после нормализации;
 * - 800+ — текст начинается с запроса (чем длиннее запрос, тем выше);
 * - 600+ — текст содержит запрос;
 * - 550  — запрос содержит весь текст;
 * - 300–700 — совпадение по токенам (порядок слов не важен, префиксы учитывают морфологию);
 * - 0–280 — пересечение символьных триграмм (Жаккар) — опечатки и окончания.
 *
 * Плюс нормализация: lowercase, `ё → е`, пунктуация → пробелы, схлопывание
 * пробелов; запрос дополнительно сравнивается в варианте, набранном в латинской
 * раскладке (ЙЦУКЕН), — «ghbctlfybz» находит «Приседания».
 */

/** Порог по умолчанию: ниже — совпадение считается шумом. */
export const DEFAULT_SEARCH_MIN_SCORE = 200;

const SCORE_EXACT = 1000;
const SCORE_PREFIX = 800;
const SCORE_SUBSTRING = 600;
const SCORE_CONTAINS_NAME = 550;
const SCORE_TOKENS_ALL = 500;
const SCORE_TOKENS_PARTIAL = 300;
const SCORE_NGRAM_MAX = 280;
const SCORE_LENGTH_BONUS = 200;

/** Соответствие клавиш латинской раскладки ЙЦУКЕН. */
const LAYOUT_MAP: Record<string, string> = {
    q: 'й',
    w: 'ц',
    e: 'у',
    r: 'к',
    t: 'е',
    y: 'н',
    u: 'г',
    i: 'ш',
    o: 'щ',
    p: 'з',
    a: 'ф',
    s: 'ы',
    d: 'в',
    f: 'а',
    g: 'п',
    h: 'р',
    j: 'о',
    k: 'л',
    l: 'д',
    z: 'я',
    x: 'ч',
    c: 'с',
    v: 'м',
    b: 'и',
    n: 'т',
    m: 'ь',
};

/** Приводит текст к каноническому виду для сравнения. */
export function normalizeSearchText(text: string): string {
    return text
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^a-zа-я0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Переводит латиницу в кириллицу по раскладке ЙЦУКЕН (остальное как есть). */
export function remapKeyboardLayout(text: string): string {
    return text.replace(/[a-z]/g, (ch) => LAYOUT_MAP[ch] ?? ch);
}

function tokenize(text: string): string[] {
    return text.split(' ').filter(Boolean);
}

/** Скор пары токенов: каждому токену запроса ищем лучший матч среди токенов текста. */
function tokenScore(queryTokens: string[], textTokens: string[]): number {
    if (!queryTokens.length || !textTokens.length) {
        return 0;
    }

    let matched = 0;
    let qualitySum = 0;

    for (const q of queryTokens) {
        let best = 0;

        for (const t of textTokens) {
            if (t === q) {
                best = 1;
            } else if (t.startsWith(q)) {
                best = Math.max(best, 0.8);
            } else if (t.includes(q)) {
                best = Math.max(best, 0.6);
            }
        }

        if (best > 0) {
            matched++;
            qualitySum += best;
        }
    }

    if (!matched) {
        return 0;
    }

    const quality = qualitySum / queryTokens.length;

    if (matched === queryTokens.length) {
        return SCORE_TOKENS_ALL + quality * SCORE_LENGTH_BONUS;
    }

    return (
        SCORE_TOKENS_PARTIAL +
        quality * SCORE_LENGTH_BONUS * (matched / queryTokens.length)
    );
}

/** Множество символьных триграмм с паддингом краёв слова. */
function trigrams(text: string): Set<string> {
    const padded = ` ${text} `;
    const set = new Set<string>();

    for (let i = 0; i + 3 <= padded.length; i++) {
        set.add(padded.slice(i, i + 3));
    }

    return set;
}

/** Скор по Жаккару на триграммах — ловит опечатки и склонения. */
function ngramScore(query: string, text: string): number {
    const q = trigrams(query);
    const t = trigrams(text);

    if (!q.size || !t.size) {
        return 0;
    }

    let shared = 0;

    for (const gram of q) {
        if (t.has(gram)) {
            shared++;
        }
    }

    return (shared / (q.size + t.size - shared)) * SCORE_NGRAM_MAX;
}

function scorePair(query: string, text: string): number {
    if (query === text) {
        return SCORE_EXACT;
    }

    if (text.startsWith(query)) {
        return SCORE_PREFIX + SCORE_LENGTH_BONUS * (query.length / text.length);
    }

    if (text.includes(query)) {
        return SCORE_SUBSTRING + SCORE_LENGTH_BONUS * (query.length / text.length);
    }

    if (query.includes(text)) {
        return SCORE_CONTAINS_NAME;
    }

    const token = tokenScore(tokenize(query), tokenize(text));

    if (token > 0) {
        return token;
    }

    return ngramScore(query, text);
}

/**
 * Скор совпадения запроса с текстом: 0 (нет ничего общего) … 1000 (точное).
 * Запрос дополнительно сравнивается в варианте, набранном в неверной раскладке.
 */
export function scoreSearchText(query: string, text: string): number {
    const q = normalizeSearchText(query);

    if (!q) {
        return 0;
    }

    const t = normalizeSearchText(text);

    if (!t) {
        return 0;
    }

    const direct = scorePair(q, t);
    const remapped = scorePair(remapKeyboardLayout(q), t);

    return Math.max(direct, remapped);
}

export interface RankedSearchResult<T> {
    item: T;
    score: number;
}

export interface SearchRankOptions<T> {
    /** Тексты, по которым ищем совпадение для элемента (берётся лучший скор). */
    texts: (item: T) => string[];
    /** Вес популярности: финальный скор = текстовый × (1 + log(1 + вес)). */
    weight?: (item: T) => number;
    /** Минимальный текстовый скор (до буста весом), ниже — элемент отбрасывается. */
    minScore?: number;
}

/**
 * Ранжирует элементы по нечёткому совпадению с запросом: скор убывает,
 * при равном скоре сохраняется исходный порядок. Пустой запрос — пустой результат.
 */
export function rankBySearchQuery<T>(
    items: readonly T[],
    query: string,
    opts: SearchRankOptions<T>,
): RankedSearchResult<T>[] {
    const q = normalizeSearchText(query);

    if (!q) {
        return [];
    }

    const minScore = opts.minScore ?? DEFAULT_SEARCH_MIN_SCORE;
    const results: RankedSearchResult<T>[] = [];

    for (const item of items) {
        let textScore = 0;

        for (const text of opts.texts(item)) {
            textScore = Math.max(textScore, scoreSearchText(query, text));

            if (textScore >= SCORE_EXACT) {
                break;
            }
        }

        if (textScore < minScore) {
            continue;
        }

        const boost = 1 + Math.log1p(opts.weight?.(item) ?? 0);
        results.push({item, score: textScore * boost});
    }

    results.sort((a, b) => b.score - a.score);
    return results;
}
