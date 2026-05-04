import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractService } from '../../services/training-contract.service';

@Component({
  standalone: true,
  selector: 'app-progress-page',
  imports: [TranslatePipe, CommonModule, RouterLink],
  templateUrl: './progress.page.html',
  styleUrls: ['./progress.page.css']
})
export class ProgressPageComponent {
  readonly names = this.trainingContractService.getTrainingNames();
  constructor(private readonly trainingContractService: TrainingContractService) {}
}
