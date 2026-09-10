/**
 * Nested calls share the outer BEGIN/COMMIT.
 * Concurrent callers are serialized on one connection.
 */
export function createTransactionRunner(exec: (sql: string) => Promise<void>): {
    run<T>(work: () => Promise<T>): Promise<T>;
} {
    let depth = 0;
    let tail: Promise<unknown> = Promise.resolve();

    const runInner = async <T>(work: () => Promise<T>): Promise<T> => {
        if (depth > 0) {
            return work();
        }

        await exec('BEGIN');
        depth += 1;

        try {
            const result = await work();
            await exec('COMMIT');
            return result;
        } catch (error) {
            try {
                await exec('ROLLBACK');
            } catch {
                // connection may already be rolled back
            }

            throw error;
        } finally {
            depth -= 1;
        }
    };

    return {
        run<T>(work: () => Promise<T>): Promise<T> {
            if (depth > 0) {
                return runInner(work);
            }

            const next = tail.then(
                () => runInner(work),
                () => runInner(work),
            );
            tail = next.then(
                () => undefined,
                () => undefined,
            );
            return next;
        },
    };
}
