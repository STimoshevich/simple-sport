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
  template: `
    <h3>{{ 'APP.PAGES.HISTORY.FILTERS' | translate }}</h3>
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ 'APP.PAGES.PROGRESS.DATE_RANGE' | translate }}</mat-label>
      <mat-date-range-input [rangePicker]="picker">
        <input matStartDate [(ngModel)]="state.startDate" readonly />
        <input matEndDate [(ngModel)]="state.endDate" readonly />
      </mat-date-range-input>
      <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
      <mat-date-range-picker #picker [touchUi]="true"></mat-date-range-picker>
    </mat-form-field>

    <mat-checkbox [(ngModel)]="state.showArcived">{{ 'APP.PAGES.HISTORY.SHOW_ARCIVED' | translate }}</mat-checkbox>

    <app-custom-list-select
      [label]="'APP.PAGES.HISTORY.EXERCISES' | translate"
      [items]="exerciseOptions"
      [selected]="state.exerciseNames"
      [multiple]="true"
      [displayWith]="displayName"
      (selectionChange)="state.exerciseNames = $event"
    ></app-custom-list-select>

    <div class="actions">
      <button mat-button (click)="close()">{{ 'APP.PAGES.WORKOUT_DETAIL.CANCEL' | translate }}</button>
      <button mat-flat-button color="primary" (click)="apply()">{{ 'APP.PAGES.WORKOUT_DETAIL.SAVE' | translate }}</button>
    </div>
  `,
  styles: ['.full-width{width:100%}.actions{display:flex;justify-content:flex-end;gap:10px;margin-top:12px;}']
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
