import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface CompletedWorkoutDay {
  date: Date;
  trainings: { name: string; reps: number; weight?: number }[];
}

@Component({
  standalone: true,
  selector: 'app-history-page',
  imports: [TranslatePipe, CommonModule, DatePipe],
  template: `
    <section class="page history-page" (scroll)="onScroll($event)">
      <h2>{{ 'APP.PAGES.HISTORY.TITLE' | translate }}</h2>
      <p>{{ 'APP.PAGES.HISTORY.DESCRIPTION' | translate }}</p>

      <div class="day-card" *ngFor="let day of visibleDays">
        <h3>{{ day.date | date: 'dd.MM.yyyy' }}</h3>
        <ul>
          <li *ngFor="let workout of day.trainings">
            <strong>{{ workout.name }}</strong>
            <span> — {{ workout.reps }} {{ 'APP.PAGES.HISTORY.REPS' | translate }}</span>
            <span *ngIf="workout.weight"> / {{ workout.weight }} {{ 'APP.PAGES.HISTORY.KG' | translate }}</span>
          </li>
        </ul>
      </div>

      <p class="loading" *ngIf="hasMore">{{ 'APP.PAGES.HISTORY.LOADING_MORE' | translate }}</p>
      <p class="loading" *ngIf="!hasMore">{{ 'APP.PAGES.HISTORY.NO_MORE' | translate }}</p>
    </section>
  `,
  styles: [
    `
      .history-page { height: calc(100dvh - 48px); overflow-y: auto; padding-right: 8px; }
      .day-card { background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
    `
  ]
})
export class HistoryPageComponent {
  private readonly pageSize = 5;
  private readonly allDays = this.buildMockDays(40);
  visibleDays: CompletedWorkoutDay[] = [];
  hasMore = true;

  constructor() { this.loadMore(); }

  onScroll(event: Event): void {
    if (!this.hasMore) return;
    const element = event.target as HTMLElement;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 80) this.loadMore();
  }

  private loadMore(): void {
    const next = this.allDays.slice(this.visibleDays.length, this.visibleDays.length + this.pageSize);
    this.visibleDays = [...this.visibleDays, ...next];
    this.hasMore = this.visibleDays.length < this.allDays.length;
  }

  private buildMockDays(daysCount: number): CompletedWorkoutDay[] {
    return Array.from({ length: daysCount }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - index);
      return {
        date,
        trainings: [
          { name: 'Push Ups', reps: 20 + (index % 5) * 2 },
          { name: 'Squats', reps: 30 + (index % 4) * 3 },
          { name: 'Bench Press', reps: 10 + (index % 3), weight: 40 + (index % 6) * 2 }
        ]
      };
    });
  }
}
