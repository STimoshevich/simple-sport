import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetModule, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CustomListSelectComponent } from '../../components/custom-list-select/custom-list-select.component';

export interface HistoryFiltersState {
  showArcived: boolean;
  startDate?: Date;
  endDate?: Date;
  exerciseNames: string[];
}

@Component({
  standalone: true,
  imports: [FormsModule, MatBottomSheetModule, MatCheckboxModule, MatButtonModule, MatDatepickerModule, MatFormFieldModule, MatInputModule, MatNativeDateModule, TranslatePipe, CustomListSelectComponent],
  templateUrl: './history-filters-sheet.component.html',
  styleUrls: ['./history-filters-sheet.component.css']
})
export class HistoryFiltersSheetComponent {
  state: HistoryFiltersState;
  exerciseOptions: string[] = [];
  readonly displayName = (value: string): string => value;

  constructor(
    private readonly ref: MatBottomSheetRef<HistoryFiltersSheetComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) data: { state: HistoryFiltersState; exerciseOptions: string[] }
  ) {
    this.state = { ...data.state, exerciseNames: [...data.state.exerciseNames] };
    this.exerciseOptions = data.exerciseOptions;
  }

  close(): void { this.ref.dismiss(); }
  apply(): void { this.ref.dismiss(this.state); }
}
