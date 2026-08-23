/** Calendar day `YYYY-MM-DD` in the user's local timezone. Not a moment in time (R-8). */
export function toLocalDayKey(date: Date): string {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Today's calendar date. The only allowed way to get "today". */
export function todayLocal(): string {
    return toLocalDayKey(new Date());
}

/** Instant in UTC ISO-8601 with `Z`, for `created_at` / `updated_at` / `done_at`. */
export function nowUtc(): string {
    return new Date().toISOString();
}

export function toDateOrUndefined(
    value: Date | string | null | undefined,
): Date | undefined {
    if (value == null || value === '') {
        return undefined;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value;
    }

    if (typeof value === 'string') {
        const dayMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());

        if (dayMatch) {
            const year = Number(dayMatch[1]);
            const month = Number(dayMatch[2]) - 1;
            const day = Number(dayMatch[3]);
            const local = new Date(year, month, day);
            return Number.isNaN(local.getTime()) ? undefined : local;
        }

        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }

    return undefined;
}

/** Shift a floating `YYYY-MM-DD` by a number of calendar days. */
export function shiftDayKey(dayKey: string, deltaDays: number): string {
    const date = toDateOrUndefined(dayKey);

    if (!date) {
        return dayKey;
    }

    date.setDate(date.getDate() + deltaDays);
    return toLocalDayKey(date);
}

/** Inclusive range of floating calendar days from `from` to `to`. */
export function enumerateDayKeys(from: string, to: string): string[] {
    if (from > to) {
        return [];
    }

    const keys: string[] = [];
    let cursor = from;

    while (cursor <= to) {
        keys.push(cursor);
        cursor = shiftDayKey(cursor, 1);
    }

    return keys;
}

export function inclusiveDayCount(from: string, to: string): number {
    return enumerateDayKeys(from, to).length;
}

export function toDayKey(date: Date | string | null | undefined): string | null {
    if (typeof date === 'string') {
        const dayMatch = /^(\d{4}-\d{2}-\d{2})/.exec(date.trim());

        if (dayMatch) {
            return dayMatch[1] ?? null;
        }
    }

    const normalized = toDateOrUndefined(date);
    return normalized ? toLocalDayKey(normalized) : null;
}
