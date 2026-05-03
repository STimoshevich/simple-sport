import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractService, TrainingDayRecord } from '../../services/training-contract.service';

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
            <span> — {{ workout.reps_count }} {{ 'APP.PAGES.HISTORY.REPS' | translate }}</span>
            <span *ngIf="workout.weeight"> / {{ workout.weeight }} {{ 'APP.PAGES.HISTORY.KG' | translate }}</span>
          </li>
        </ul>
      </div>

      <p class="loading" *ngIf="hasMore">{{ 'APP.PAGES.HISTORY.LOADING_MORE' | translate }}</p>
      <p class="loading" *ngIf="!hasMore">{{ 'APP.PAGES.HISTORY.NO_MORE' | translate }}</p>
    </section>
  `
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

  private loadMore(): void {
    const next = this.allDays.slice(this.visibleDays.length, this.visibleDays.length + this.pageSize);
    this.visibleDays = [...this.visibleDays, ...next];
    this.hasMore = this.visibleDays.length < this.allDays.length;
  }
}
