import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractRecord } from '../../models/training-contract.model';
import { TrainingContractService } from '../../services/training-contract.service';
import { TrainingNameService } from '../../services/training-name.service';
import { TranslateService } from '../../services/translate.service';

@Component({
  standalone: true,
  selector: 'app-workout-detail-page',
  imports: [TranslatePipe, CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  templateUrl: './workout-detail.page.html',
  styleUrls: ['./workout-detail.page.css']
})
export class WorkoutDetailPageComponent {
  workouts: TrainingContractRecord[] = [];
  availableNames: string[] = [];
  validationErrorById: Record<string, boolean> = {};
  hasUnsavedChanges = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly trainingContractService: TrainingContractService,
    private readonly trainingNameService: TrainingNameService,
    private readonly location: Location,
    private readonly translateService: TranslateService
  ) {
    const groupId = this.route.snapshot.paramMap.get('id') ?? '';
    this.workouts = this.trainingContractService.getByGroupId(groupId);
    this.availableNames = this.trainingNameService.getAllNames();
  }

  onNameChange(workout: TrainingContractRecord): void {
    this.hasUnsavedChanges = true;
  }

  onMetricsChange(workout: TrainingContractRecord): void {
    const hasWeight = workout.weeight !== undefined && workout.weeight !== null && workout.weeight !== 0;
    const hasReps = workout.reps_count !== undefined && workout.reps_count !== null && workout.reps_count !== 0;
    this.validationErrorById[workout.id] = !hasWeight && !hasReps;
    this.hasUnsavedChanges = true;
  }

  save(): void {
    const hasErrors = this.workouts.some((workout) => this.validationErrorById[workout.id]);
    if (hasErrors) return;
    this.workouts.forEach((workout) => {
      this.trainingContractService.update(workout.id, {
        name: workout.name,
        weeight: workout.weeight,
        reps_count: workout.reps_count,
        plannedWeight: workout.plannedWeight,
        plannedRepls: workout.plannedRepls
      });
      this.trainingNameService.ensureName(workout.name);
    });
    this.availableNames = this.trainingNameService.getAllNames();
    this.hasUnsavedChanges = false;
  }

  cancel(): void {
    this.location.back();
  }

  canLeave(): boolean {
    if (!this.hasUnsavedChanges) return true;
    return window.confirm(this.translateService.translate('APP.PAGES.WORKOUT_DETAIL.UNSAVED_CONFIRM'));
  }
}
