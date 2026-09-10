import {inclusiveDayCount, shiftDayKey} from './date.util';

export const FEED_PAGE_DAYS = 20;

export function minDayKey(left: string, right: string): string {
    return left < right ? left : right;
}

export function maxDayKey(left: string, right: string): string {
    return left > right ? left : right;
}

/** Inclusive past window for one feed page, newest day = `to`. Uses `offset`, not `page`. */
export function resolvePastWindow(input: {
    today: string;
    offset: number;
    itemsPerPage: number;
    earliestDate?: string;
    filterFrom?: string;
    filterTo?: string;
}): {from: string; to: string; totalCount: number} | null {
    const pastEnd = input.filterTo ? minDayKey(input.today, input.filterTo) : input.today;
    const firstPageStart = shiftDayKey(pastEnd, -(FEED_PAGE_DAYS - 1));
    let historyStart = input.earliestDate
        ? minDayKey(input.earliestDate, firstPageStart)
        : firstPageStart;

    if (input.filterFrom) {
        historyStart = maxDayKey(historyStart, input.filterFrom);
    }

    if (historyStart > pastEnd) {
        return null;
    }

    const totalCount = inclusiveDayCount(historyStart, pastEnd);
    const offset = Math.max(0, input.offset);
    const to = shiftDayKey(pastEnd, -offset);

    if (to < historyStart) {
        return null;
    }

    const from = maxDayKey(historyStart, shiftDayKey(to, -(input.itemsPerPage - 1)));
    return {from, to, totalCount};
}

/** Pages of `itemsPerPage` days needed so `dayKey` is in the loaded past window. */
export function pastPagesToCoverDay(
    today: string,
    dayKey: string,
    itemsPerPage = FEED_PAGE_DAYS,
): number {
    if (!dayKey || dayKey > today) {
        return 1;
    }

    return Math.max(1, Math.ceil(inclusiveDayCount(dayKey, today) / itemsPerPage));
}

/** Calendar span after today up to the last planned training. */
export function resolveFutureWindow(input: {
    today: string;
    latestDate?: string;
    filterFrom?: string;
    filterTo?: string;
}): {from: string; to: string} | null {
    if (!input.latestDate || input.latestDate <= input.today) {
        return null;
    }

    let from = shiftDayKey(input.today, 1);
    let to = input.latestDate;

    if (input.filterFrom) {
        from = maxDayKey(from, input.filterFrom);
    }

    if (input.filterTo) {
        to = minDayKey(to, input.filterTo);
    }

    if (from > to) {
        return null;
    }

    return {from, to};
}
