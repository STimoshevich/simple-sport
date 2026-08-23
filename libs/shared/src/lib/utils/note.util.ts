export const NOTE_MAX_LENGTH = 1000;
export const NOTE_COUNTER_AFTER = 800;

export function clampNote(text: string, max = NOTE_MAX_LENGTH): string {
    return text.length <= max ? text : text.slice(0, max);
}

export function shouldShowNoteCounter(
    length: number,
    after = NOTE_COUNTER_AFTER,
): boolean {
    return length >= after;
}
