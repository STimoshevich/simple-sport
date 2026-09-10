import {createTransactionRunner} from './sqlite-transaction';

describe('createTransactionRunner', () => {
    it('commits after successful work', async () => {
        const calls: string[] = [];
        const runner = createTransactionRunner(async (sql) => {
            calls.push(sql);
        });

        const result = await runner.run(async () => 42);

        expect(result).toBe(42);
        expect(calls).toEqual(['BEGIN', 'COMMIT']);
    });

    it('rolls back when work throws and does not leave a committed write', async () => {
        const calls: string[] = [];
        const runner = createTransactionRunner(async (sql) => {
            calls.push(sql);
        });

        await expect(
            runner.run(async () => {
                throw new Error('mid-write');
            }),
        ).rejects.toThrow('mid-write');

        expect(calls).toEqual(['BEGIN', 'ROLLBACK']);
    });

    it('nests into the outer transaction', async () => {
        const calls: string[] = [];
        const runner = createTransactionRunner(async (sql) => {
            calls.push(sql);
        });

        await runner.run(async () => {
            await runner.run(async () => 'inner');
            return 'outer';
        });

        expect(calls).toEqual(['BEGIN', 'COMMIT']);
    });
});
