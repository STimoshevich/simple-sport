import {TextFieldModule} from '@angular/cdk/text-field';
import {Component, computed, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {clampNote, NOTE_MAX_LENGTH, shouldShowNoteCounter} from '@simple-sport/shared';

@Component({
    selector: 'app-note-field',
    standalone: true,
    imports: [FormsModule, MatFormFieldModule, MatInputModule, TextFieldModule],
    templateUrl: './note-field.component.html',
    styleUrls: ['./note-field.component.css'],
})
export class NoteFieldComponent {
    readonly label = input('');
    readonly value = input('');
    readonly hint = input('');
    readonly maxLength = input(NOTE_MAX_LENGTH);
    readonly minRows = input(2);
    readonly valueChange = output<string>();

    readonly showCounter = computed(() => shouldShowNoteCounter(this.value().length));

    onInput(raw: string): void {
        const next = clampNote(raw, this.maxLength());
        this.valueChange.emit(next);
    }
}
