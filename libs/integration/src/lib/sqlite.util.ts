import type {ExerciseType} from '@simple-sport/shared';
import {SqliteRow, SqliteValue} from './sqlite-storage.service';

export function cell(row: SqliteRow, key: string): unknown {
    return row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()];
}

export function asString(value: unknown, fallback = ''): string {
    return value == null ? fallback : String(value);
}

export function asOptionalString(value: unknown): string | undefined {
    if (value == null || value === '') {
        return undefined;
    }

    return String(value);
}

export function asNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function asOptionalNumber(value: unknown): number | undefined {
    if (value == null || value === '') {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function asBool(value: unknown): boolean {
    return Number(value) === 1;
}

export function toSqlBool(value: boolean): number {
    return value ? 1 : 0;
}

export function toSqlText(value: string | undefined): string | null {
    return value === undefined ? null : value;
}

export function toSqlNumber(value: number | undefined): number | null {
    return value === undefined ? null : value;
}

export function asExerciseType(value: unknown): ExerciseType {
    if (value === 'cardio' || value === 'stretching') {
        return value;
    }

    return 'strength';
}

export function placeholders(count: number): string {
    return Array.from({length: count}, () => '?').join(', ');
}

export function firstRow(rows: SqliteRow[]): SqliteRow | undefined {
    return rows[0];
}

export type ListOptions = {
    includeDeleted?: boolean;
};

export function deletedClause(
    alias: string | undefined,
    includeDeleted: boolean | undefined,
): string {
    if (includeDeleted) {
        return '1 = 1';
    }

    const column = alias ? `${alias}.deleted` : 'deleted';
    return `${column} = 0`;
}

export type SqlParams = SqliteValue[];
