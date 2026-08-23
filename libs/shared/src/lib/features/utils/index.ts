export function diffArrays<TPrev, TNext>(
    prev: TPrev[],
    next: TNext[],
    selectPrevId: (item: TPrev) => string,
    selectNextId: (item: TNext) => string,
): {added: TNext[]; removed: TPrev[]} {
    const prevIds = new Set(prev.map(selectPrevId));
    const nextIds = new Set(next.map(selectNextId));

    return {
        added: next.filter((item) => !prevIds.has(selectNextId(item))),
        removed: prev.filter((item) => !nextIds.has(selectPrevId(item))),
    };
}
