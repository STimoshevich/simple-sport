import {
    clampNote,
    NOTE_COUNTER_AFTER,
    NOTE_MAX_LENGTH,
    shouldShowNoteCounter,
} from './note.util';

describe('note.util', () => {
    it('clamps text to the shared note limit', () => {
        expect(clampNote('ok')).toBe('ok');
        expect(clampNote('x'.repeat(NOTE_MAX_LENGTH + 4))).toHaveLength(NOTE_MAX_LENGTH);
    });

    it('shows the counter after the training-note threshold', () => {
        expect(shouldShowNoteCounter(NOTE_COUNTER_AFTER - 1)).toBe(false);
        expect(shouldShowNoteCounter(NOTE_COUNTER_AFTER)).toBe(true);
    });
});
