import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractService } from '../../services/training-contract.service';

@Component({
  standalone: true,
  selector: 'app-progress-page',
  imports: [TranslatePipe, CommonModule, RouterLink],
  template: `
    <section class="page">
      <h2>{{ 'APP.PAGES.PROGRESS.TITLE' | translate }}</h2>
      <p>{{ 'APP.PAGES.PROGRESS.DESCRIPTION' | translate }}</p>

      <ul class="name-list" *ngIf="names.length; else emptyState">
        <li *ngFor="let name of names">
          <a [routerLink]="['/progress', name]">{{ name }}</a>
        </li>
      </ul>

      <ng-template #emptyState>
        <p>{{ 'APP.PAGES.PROGRESS.EMPTY_NAMES' | translate }}</p>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .name-list { list-style: none; margin: 16px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
      .name-list a { display: block; padding: 12px 14px; border-radius: 12px; color: #e2e8f0; text-decoration: none; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(148, 163, 184, 0.25); transition: transform .15s ease, background .15s ease; }
      .name-list a:hover { background: rgba(51, 65, 85, 0.95); transform: translateY(-1px); }
    `
  ]
})
export class ProgressPageComponent {
  readonly names = this.trainingContractService.getTrainingNames();
  constructor(private readonly trainingContractService: TrainingContractService) {}
}
