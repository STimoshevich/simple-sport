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
      <h2>{{ 'APP.PAGES.HISTORY.TITLE' | translate }}</h2>
      <p>{{ 'APP.PAGES.HISTORY.DESCRIPTION' | translate }}</p>

      <div class="day-card" *ngFor="let day of visibleDays">
        <h3>{{ day.date | date: 'dd.MM.yyyy' }}</h3>

        <a
          class="workout-card"
          *ngFor="let workout of day.trainings"
          [routerLink]="['/history/workout', buildWorkoutId(day.date, workout.name)]"
        >
          <strong>{{ workout.name }}</strong>
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
    `.day-card { background: #0f172a; border: 1px solid rgba(148,163,184,.35); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
     .day-card h3 { margin: 0 0 10px; }
     .workout-card { display: flex; gap: 10px; align-items: center; justify-content: space-between; text-decoration: none; color: #e2e8f0; background: rgba(30,41,59,.7); border: 1px solid rgba(148,163,184,.25); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
     .workout-card:hover { border-color: rgba(56,189,248,.7); background: rgba(15,23,42,.95); }
     .workout-card:last-child { margin-bottom: 0; }`
  ]
})
export class HistoryPageComponent {
  private readonly pageSize = 5;
  private readonly allDays = this.trainingContractService.getTrainingDays();

  visibleDays: TrainingDayRecord[] = [];
  hasMore = true;

  constructor(private readonly trainingContractService: TrainingContractService) {
    this.loadMore();
  }

  onScroll(event: Event): void {
    if (!this.hasMore) return;
    const element = event.target as HTMLElement;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 80) this.loadMore();
  }

  buildWorkoutId(date: string, name: string): string {
    return encodeURIComponent(`${date}::${name}`);
  }

  private loadMore(): void {
    const next = this.allDays.slice(this.visibleDays.length, this.visibleDays.length + this.pageSize);
    this.visibleDays = [...this.visibleDays, ...next];
    this.hasMore = this.visibleDays.length < this.allDays.length;
  }
}
