import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractRecord } from '../../models/training-contract.model';
import { TrainingContractService } from '../../services/training-contract.service';
import { TrainingNameService } from '../../services/training-name.service';

@Component({
  standalone: true,
  selector: 'app-workout-detail-page',
  imports: [TranslatePipe, CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './workout-detail.page.html',
  styleUrls: ['./workout-detail.page.css']
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
    this.availableNames = this.trainingNameService.getAllNames();
  }

  onNameChange(workout: TrainingContractRecord): void {
    this.trainingContractService.update(workout.id, { name: workout.name });
    this.trainingNameService.ensureName(workout.name);
    this.availableNames = this.trainingNameService.getAllNames();
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
