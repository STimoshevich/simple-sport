import {Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {TranslatePipe} from '../../pipes/translate.pipe';
import {CaloriesStore} from '../../stores/calories.store';

@Component({
    standalone: true,
    selector: 'app-calories-page',
    imports: [
        FormsModule,
        MatButtonModule,
        MatCardModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        TranslatePipe,
    ],
    templateUrl: './calories.page.html',
    styleUrl: './calories.page.css',
    providers: [CaloriesStore],
})
export class CaloriesPageComponent {
    readonly store = inject(CaloriesStore);
    readonly foodName = signal('');
    readonly calories = signal<number | undefined>(undefined);

    addEntry(): void {
        const name = this.foodName().trim();
        const value = this.calories();

        if (!name || !value || value <= 0) {
            return;
        }

        this.store.addEntry(name, value).subscribe(() => {
            this.foodName.set('');
            this.calories.set(undefined);
        });
    }

    removeEntry(id: string): void {
        this.store.removeEntry(id).subscribe();
    }
}
