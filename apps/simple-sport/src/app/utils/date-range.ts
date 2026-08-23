export function daysBetween(start: Date, end: Date): number {
    return Math.max(
        1,
        Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    );
}
