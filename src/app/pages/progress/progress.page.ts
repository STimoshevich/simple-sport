import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingNameService } from '../../services/training-name.service';

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
      .name-list { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .name-list a { display: block; padding: 10px 12px; border-radius: 8px; color: #e2e8f0; text-decoration: none; background: rgba(148, 163, 184, 0.2); }
    `
  ]
})
export class ProgressPageComponent {
  readonly names = this.trainingNameService.getAllNames();

  constructor(private readonly trainingNameService: TrainingNameService) {}
}
