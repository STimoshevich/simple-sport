import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {APP_PATHS} from '@simple-sport/shared';
import {TranslatePipe} from '../../pipes/translate.pipe';

@Component({
    standalone: true,
    selector: 'app-progress-hub-page',
    imports: [RouterLink, MatIconModule, TranslatePipe],
    templateUrl: './progress-hub.page.html',
    styleUrl: './progress-hub.page.css',
})
export class ProgressHubPageComponent {
    readonly paths = APP_PATHS;
}
