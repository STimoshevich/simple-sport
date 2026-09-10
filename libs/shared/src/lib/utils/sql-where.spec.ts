import {sqlWhere} from './sql-where';

describe('sqlWhere', () => {
    it('builds AND clauses with bound params', () => {
        const {sql, params} = sqlWhere()
            .add('tr.deleted = 0')
            .addIf('2026-01-01', 'tr.date >= ?', '2026-01-01')
            .addIn('te.exercise_id', ['a', 'b'])
            .build();

        expect(sql).toBe('tr.deleted = 0 AND tr.date >= ? AND te.exercise_id IN (?, ?)');
        expect(params).toEqual(['2026-01-01', 'a', 'b']);
    });

    it('skips empty addIf and addIn', () => {
        const {sql, params} = sqlWhere()
            .addIf(undefined, 'tr.date >= ?', 'x')
            .addIf('', 'tr.date <= ?', 'y')
            .addIn('id', [])
            .build();

        expect(sql).toBe('1 = 1');
        expect(params).toEqual([]);
    });
});
