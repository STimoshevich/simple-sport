import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractService, TrainingDayRecord } from '../../services/training-contract.service';
import { HistoryFiltersSheetComponent, HistoryFiltersState } from './history-filters-sheet.component';

@Component({
  standalone: true,
  selector: 'app-history-page',
  imports: [TranslatePipe, CommonModule, DatePipe, RouterLink, MatButtonModule, MatCardModule],
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.css']
})
export class HistoryPageComponent {
  private readonly pageSize = 5;
  private allDays = this.trainingContractService.getTrainingDays();

  visibleDays: TrainingDayRecord[] = [];
  filteredDays: TrainingDayRecord[] = [];
  hasMore = true;
  filters: HistoryFiltersState = { showArcived: false, exerciseNames: [] };

  constructor(private readonly trainingContractService: TrainingContractService, private readonly bottomSheet: MatBottomSheet) {
    this.loadMore();
  }

  onScroll(event: Event): void {
    if (!this.hasMore) return;
    const element = event.target as HTMLElement;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 80) this.loadMore();
  }

  addTraining(): void {
    this.trainingContractService.addEmptyForToday();
    this.allDays = this.trainingContractService.getTrainingDays();
    this.visibleDays = this.allDays.slice(0, Math.max(this.pageSize, this.visibleDays.length));
    this.rebuildFilteredDays();
    this.hasMore = this.visibleDays.length < this.allDays.length;
  }

  openFilters(): void {
    const exerciseOptions = this.trainingContractService.getTrainingNames();
    this.bottomSheet.open(HistoryFiltersSheetComponent, { data: { state: this.filters, exerciseOptions } })
      .afterDismissed()
      .subscribe((value?: HistoryFiltersState) => {
        if (!value) return;
        this.filters = value;
        this.rebuildFilteredDays();
      });
  }

  private isInSelectedDateRange(date: string): boolean {
    const day = new Date(date);
    if (this.filters.startDate && day < new Date(this.filters.startDate)) return false;
    if (this.filters.endDate && day > new Date(this.filters.endDate)) return false;
    return true;
  }

  private hasSelectedExercise(name: string): boolean {
    if (!this.filters.exerciseNames.length) return true;
    return this.filters.exerciseNames.includes(name);
  }

  private rebuildFilteredDays(): void {
    this.filteredDays = this.visibleDays
      .filter((day) => this.isInSelectedDateRange(day.date))
      .map((day) => ({
        ...day,
        trainings: day.trainings.filter((training) =>
          (this.filters.showArcived || !training.arcived) && this.hasSelectedExercise(training.name)
        )
      }))
      .filter((day) => day.trainings.length > 0);
  }

  private loadMore(): void {
    const next = this.allDays.slice(this.visibleDays.length, this.visibleDays.length + this.pageSize);
    this.visibleDays = [...this.visibleDays, ...next];
    this.rebuildFilteredDays();
    this.hasMore = this.visibleDays.length < this.allDays.length;
  }
}
