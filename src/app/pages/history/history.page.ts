import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractService, TrainingDayRecord } from '../../services/training-contract.service';

@Component({
  standalone: true,
  selector: 'app-history-page',
  imports: [TranslatePipe, CommonModule, DatePipe, RouterLink],
  template: `
    <section class="page history-page" (scroll)="onScroll($event)">
      <div class="history-header">
        <h2>{{ 'APP.PAGES.HISTORY.TITLE' | translate }}</h2>
        <button class="add-button" type="button" (click)="addTraining()">+</button>
      </div>
      <label class="archive-toggle">
        <input type="checkbox" [checked]="showArcived" (change)="toggleArcived($event)" />
        {{ 'APP.PAGES.HISTORY.SHOW_ARCIVED' | translate }}
      </label>
      <p>{{ 'APP.PAGES.HISTORY.DESCRIPTION' | translate }}</p>

      <div class="day-card" *ngFor="let day of filteredDays">
        <h3>{{ day.date | date: 'dd.MM.yyyy' }}</h3>

        <a
          class="workout-card"
          [class.workout-card-arcived]="workout.arcived"
          *ngFor="let workout of day.trainings"
          [routerLink]="['/history/workout', workout.id]"
        >
          <strong>{{ workout.name || ('APP.PAGES.HISTORY.EMPTY_NAME' | translate) }}</strong>
          <span>{{ workout.reps_count }} {{ 'APP.PAGES.HISTORY.REPS' | translate }}</span>
          <span *ngIf="workout.weeight">{{ workout.weeight }} {{ 'APP.PAGES.HISTORY.KG' | translate }}</span>
        </a>
      </div>

      <p class="loading" *ngIf="hasMore">{{ 'APP.PAGES.HISTORY.LOADING_MORE' | translate }}</p>
      <p class="loading" *ngIf="!hasMore">{{ 'APP.PAGES.HISTORY.NO_MORE' | translate }}</p>
    </section>
  `
,
  styles: [
    `.history-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
     .history-header h2 { margin: 0; }
     .add-button { width: 34px; height: 34px; border-radius: 8px; border: 1px solid rgba(56,189,248,.6); background: rgba(2,132,199,.18); color: #e2e8f0; font-size: 22px; line-height: 1; }
     .archive-toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #cbd5e1; margin: 8px 0; }
     .day-card { background: #0f172a; border: 1px solid rgba(148,163,184,.35); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
     .day-card h3 { margin: 0 0 10px; }
     .workout-card { display: flex; gap: 10px; align-items: center; justify-content: space-between; text-decoration: none; color: #e2e8f0; background: rgba(30,41,59,.7); border: 1px solid rgba(148,163,184,.25); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
     .workout-card-arcived { border-style: dashed; opacity: .78; }
     .workout-card:hover { border-color: rgba(56,189,248,.7); background: rgba(15,23,42,.95); }
     .workout-card:last-child { margin-bottom: 0; }`
  ]
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

  toggleArcived(event: Event): void {
    this.showArcived = (event.target as HTMLInputElement).checked;
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
