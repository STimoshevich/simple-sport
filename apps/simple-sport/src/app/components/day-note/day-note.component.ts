import {TextFieldModule} from '@angular/cdk/text-field';
import {
    afterNextRender,
    afterRenderEffect,
    Component,
    ElementRef,
    inject,
    Injector,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {NOTE_MAX_LENGTH} from '@simple-sport/shared';
import {TranslatePipe} from '../../pipes/translate.pipe';

@Component({
    selector: 'app-day-note',
    standalone: true,
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        TextFieldModule,
        TranslatePipe,
    ],
    templateUrl: './day-note.component.html',
    styleUrls: ['./day-note.component.css'],
    host: {'[attr.data-date]': 'date()'},
})
export class DayNoteComponent {
    readonly date = input.required<string>();
    readonly text = input<string | undefined>();
    readonly saved = output<string>();

    readonly editing = signal(false);
    readonly expanded = signal(false);
    readonly overflows = signal(false);
    readonly draft = signal('');
    readonly maxLength = NOTE_MAX_LENGTH;

    private readonly noteText = viewChild<ElementRef<HTMLElement>>('noteText');
    private readonly noteInput = viewChild<ElementRef<HTMLTextAreaElement>>('noteInput');
    private readonly injector = inject(Injector);

    constructor() {
        afterRenderEffect(() => {
            this.text();
            this.expanded();
            this.editing();

            if (this.editing() || this.expanded()) {
                return;
            }

            const el = this.noteText()?.nativeElement;

            if (!el) {
                if (this.overflows()) {
                    this.overflows.set(false);
                }

                return;
            }

            const next = el.scrollHeight > el.clientHeight + 1;

            if (next !== this.overflows()) {
                this.overflows.set(next);
            }
        });
    }

    startEdit(): void {
        this.draft.set(this.text() ?? '');
        this.editing.set(true);
        this.expanded.set(false);
        afterNextRender(() => this.noteInput()?.nativeElement.focus(), {
            injector: this.injector,
        });
    }

    cancelEdit(): void {
        this.editing.set(false);
    }

    commit(): void {
        if (!this.editing()) {
            return;
        }

        const next = this.draft().trim();
        this.editing.set(false);

        if (next === (this.text() ?? '').trim()) {
            return;
        }

        this.saved.emit(next);
    }

    toggleExpanded(event: Event): void {
        event.stopPropagation();
        this.expanded.update((value) => !value);
    }
}
