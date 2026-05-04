import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractRecord } from '../../models/training-contract.model';
import { TrainingContractService } from '../../services/training-contract.service';
import { TrainingNameService } from '../../services/training-name.service';

@Component({
  standalone: true,
  selector: 'app-workout-detail-page',
  imports: [TranslatePipe, CommonModule, FormsModule],
  template: `
    <section class="page">
      <h2>{{ 'APP.PAGES.WORKOUT_DETAIL.TITLE' | translate }}</h2>
      <p>{{ 'APP.PAGES.WORKOUT_DETAIL.DESCRIPTION' | translate }}</p>

      <article class="exercise-card" *ngFor="let workout of workouts">
        <select [(ngModel)]="workout.name" (ngModelChange)="onNameChange(workout)">
          <option *ngFor="let name of availableNames" [ngValue]="name">{{ name }}</option>
        </select>

        <input
          type="number"
          placeholder="Weight"
          [(ngModel)]="workout.weeight"
          (ngModelChange)="onMetricsChange(workout)"
        />
        <input
          type="number"
          placeholder="Reps"
          [(ngModel)]="workout.reps_count"
          (ngModelChange)="onMetricsChange(workout)"
        />

        <small class="error" *ngIf="validationErrorById[workout.id]">
          {{ 'APP.PAGES.WORKOUT_DETAIL.VALIDATION' | translate }}
        </small>
      </article>
    </section>
  `,
  styles: [`.exercise-card { background: #0f172a; border: 1px solid rgba(148,163,184,.3); border-radius: 10px; padding: 10px; margin-bottom: 10px; display: grid; gap: 8px; }
            .exercise-card select, .exercise-card input { background: #1e293b; border: 1px solid rgba(148,163,184,.35); color: #e2e8f0; border-radius: 8px; padding: 8px; width: 100%; }
            .error { color: #fca5a5; }`]
})
export class WorkoutDetailPageComponent {
  workouts: TrainingContractRecord[] = [];
  availableNames: string[] = [];
  validationErrorById: Record<string, boolean> = {};

  constructor(
    private readonly route: ActivatedRoute,
    private readonly trainingContractService: TrainingContractService,
    private readonly trainingNameService: TrainingNameService
  ) {
    const groupId = this.route.snapshot.paramMap.get('id') ?? '';
    this.workouts = this.trainingContractService.getByGroupId(groupId);
    this.availableNames = this.trainingNameService.getAll();
  }

  onNameChange(workout: TrainingContractRecord): void {
    this.trainingContractService.update(workout.id, { name: workout.name });
    this.trainingNameService.ensureName(workout.name);
    this.availableNames = this.trainingNameService.getAll();
  }

  onMetricsChange(workout: TrainingContractRecord): void {
    const hasWeight = workout.weeight !== undefined && workout.weeight !== null && workout.weeight !== 0;
    const hasReps = workout.reps_count !== undefined && workout.reps_count !== null && workout.reps_count !== 0;
    this.validationErrorById[workout.id] = !hasWeight && !hasReps;
    if (this.validationErrorById[workout.id]) return;

    this.trainingContractService.update(workout.id, {
      weeight: workout.weeight,
      reps_count: workout.reps_count
    });
  }
}
