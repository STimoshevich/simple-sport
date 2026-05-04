import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractService, TrainingDayRecord } from '../../services/training-contract.service';

@Component({
  standalone: true,
  selector: 'app-history-page',
  imports: [TranslatePipe, CommonModule, DatePipe, RouterLink, MatButtonModule, MatCheckboxModule, MatCardModule],
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.css']
})
export class HistoryPageComponent {
  private readonly pageSize = 5;
  private allDays = this.trainingContractService.getTrainingDays();

  visibleDays: TrainingDayRecord[] = [];
  filteredDays: TrainingDayRecord[] = [];
  hasMore = true;
  showArcived = false;

  constructor(private readonly trainingContractService: TrainingContractService) {
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

  toggleArcived(event: MatCheckboxChange): void {
    this.showArcived = event.checked;
    this.rebuildFilteredDays();
  }

  private loadMore(): void {
    const next = this.allDays.slice(this.visibleDays.length, this.visibleDays.length + this.pageSize);
    this.visibleDays = [...this.visibleDays, ...next];
    this.rebuildFilteredDays();
    this.hasMore = this.visibleDays.length < this.allDays.length;
  }

  private rebuildFilteredDays(): void {
    this.filteredDays = this.visibleDays
      .map((day) => ({
        ...day,
        trainings: day.trainings.filter((training) => this.showArcived || !training.arcived)
      }))
      .filter((day) => day.trainings.length > 0);
  }
}
