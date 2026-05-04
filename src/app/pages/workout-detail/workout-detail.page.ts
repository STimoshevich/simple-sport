import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractRecord } from '../../models/training-contract.model';
import { TrainingContractService } from '../../services/training-contract.service';
import { TrainingNameService } from '../../services/training-name.service';
import { CustomListSelectComponent } from '../../components/custom-list-select/custom-list-select.component';

@Component({
  standalone: true,
  selector: 'app-workout-detail-page',
  imports: [TranslatePipe, CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, CustomListSelectComponent],
  templateUrl: './workout-detail.page.html',
  styleUrls: ['./workout-detail.page.css']
})
export class WorkoutDetailPageComponent {
  workouts: TrainingContractRecord[] = [];
  availableNames: string[] = [];
  validationErrorById: Record<string, boolean> = {};
  hasUnsavedChanges = false;
  readonly displayName = (value: string): string => value;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly trainingContractService: TrainingContractService,
    private readonly trainingNameService: TrainingNameService,
    private readonly location: Location
  ) {
    const groupId = this.route.snapshot.paramMap.get('id') ?? '';
    this.workouts = this.trainingContractService.getByGroupId(groupId);
    this.availableNames = this.trainingNameService.getAllNames();
  }

  onNameChange(workout: TrainingContractRecord): void {
    this.hasUnsavedChanges = true;
  }

  onExerciseSelected(workout: TrainingContractRecord, selected: string[]): void {
    workout.name = selected[0] ?? workout.name;
    this.onNameChange(workout);
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
}
