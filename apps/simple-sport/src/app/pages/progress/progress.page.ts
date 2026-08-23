import {CommonModule} from '@angular/common';
import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {APP_PATHS} from '@simple-sport/shared';
import {TranslatePipe} from '../../pipes/translate.pipe';
import {ProgressStore} from '../../stores/progress.store';

@Component({
    standalone: true,
    selector: 'app-progress-page',
    imports: [TranslatePipe, CommonModule, RouterLink, MatIconModule],
    templateUrl: './progress.page.html',
    styleUrls: ['./progress.page.css'],
    providers: [ProgressStore],
})
export class ProgressPageComponent {
    readonly paths = APP_PATHS;
    readonly store = inject(ProgressStore);
}
