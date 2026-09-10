import {
    DEFAULT_SEARCH_MIN_SCORE,
    normalizeSearchText,
    rankBySearchQuery,
    remapKeyboardLayout,
    scoreSearchText,
} from './search-scoring.util';

describe('search-scoring.util', () => {
    describe('normalizeSearchText', () => {
        it('приводит к нижнему регистру и схлопывает пробелы', () => {
            expect(normalizeSearchText('  Жим   Лёжа ')).toBe('жим лежа');
        });

        it('заменяет ё на е', () => {
            expect(normalizeSearchText('Всё')).toBe('все');
        });

        it('превращает пунктуацию в пробелы', () => {
            expect(normalizeSearchText('Приседания (штанга), 3x10')).toBe(
                'приседания штанга 3x10',
            );
        });
    });

    describe('remapKeyboardLayout', () => {
        it('переводит латиницу в кириллицу по ЙЦУКЕН', () => {
            // «приседания», набранное в английской раскладке
            expect(remapKeyboardLayout('ghbctlfybz')).toBe('приседания');
        });

        it('оставляет кириллицу и цифры как есть', () => {
            expect(remapKeyboardLayout('жим 100')).toBe('жим 100');
        });
    });

    describe('scoreSearchText', () => {
        it('точное совпадение после нормализации даёт максимум', () => {
            expect(scoreSearchText('  ЖИМ ЛЁЖА ', 'жим лежа')).toBe(1000);
        });

        it('префикс оценивается выше подстроки', () => {
            const prefix = scoreSearchText('присед', 'Приседания со штангой');
            const substring = scoreSearchText('штангой', 'Приседания со штангой');

            expect(prefix).toBeGreaterThan(800);
            expect(substring).toBeGreaterThan(600);
            expect(prefix).toBeGreaterThan(substring);
        });

        it('морфология: запрос-основа находит склонённое слово', () => {
            expect(scoreSearchText('присед', 'Приседания')).toBeGreaterThan(800);
        });

        it('порядок слов не важен на токенах', () => {
            const score = scoreSearchText('штанга присед', 'Приседания со штангой');

            expect(score).toBeGreaterThanOrEqual(300);
        });

        it('опечатка ловится триграммами', () => {
            expect(scoreSearchText('жим лёжаа', 'Жим лёжа')).toBeGreaterThan(
                DEFAULT_SEARCH_MIN_SCORE,
            );
        });

        it('неверная раскладка находит кириллическое название', () => {
            expect(scoreSearchText('ghbctlfybz', 'Приседания')).toBe(1000);
        });

        it('бессвязанные тексты не проходят порог', () => {
            expect(scoreSearchText('бицепс', 'Приседания со штангой')).toBeLessThan(
                DEFAULT_SEARCH_MIN_SCORE,
            );
        });

        it('пустой запрос даёт 0', () => {
            expect(scoreSearchText('   ', 'Жим')).toBe(0);
        });
    });

    describe('rankBySearchQuery', () => {
        interface Dish {
            name: string;
            usage: number;
        }

        const DISHES: readonly Dish[] = [
            {name: 'Овсяная каша', usage: 1},
            {name: 'Каша гречневая', usage: 10},
            {name: 'Кофе', usage: 100},
        ];

        it('пустой запрос — пустой результат', () => {
            expect(rankBySearchQuery(DISHES, '  ', {texts: (d) => [d.name]})).toEqual([]);
        });

        it('сортирует по убыванию скора', () => {
            const ranked = rankBySearchQuery(DISHES, 'каша', {
                texts: (d) => [d.name],
            });

            // «Каша гречневая» — префиксное совпадение (800+), «Овсяная каша» — подстрока (600+)
            expect(ranked.map((r) => r.item.name)).toEqual([
                'Каша гречневая',
                'Овсяная каша',
            ]);
        });

        it('вес популярности поднимает часто используемое при равном текстовом скоре', () => {
            const PORRIDGE: readonly Dish[] = [
                {name: 'Каша овсяная', usage: 1},
                {name: 'Каша рисовая', usage: 10},
            ];

            const ranked = rankBySearchQuery(PORRIDGE, 'каша', {
                texts: (d) => [d.name],
                weight: (d) => d.usage,
            });

            expect(ranked[0]?.item.name).toBe('Каша рисовая');
        });

        it('отбрасывает элементы ниже порога', () => {
            const ranked = rankBySearchQuery(DISHES, 'каша', {
                texts: (d) => [d.name],
                minScore: 900,
            });

            // лучший скор — префикс 857, порог 900 не проходит
            expect(ranked).toEqual([]);
        });

        it('берёт лучший скор по нескольким полям', () => {
            const ranked = rankBySearchQuery(DISHES, 'овсян', {
                texts: (d) => [d.name, 'овсянка на завтрак'],
            });

            expect(ranked[0]?.item.name).toBe('Овсяная каша');
        });
    });
});
