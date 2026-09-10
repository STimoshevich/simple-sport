import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {APP_PATHS} from '@simple-sport/shared';
import {TranslatePipe} from '../../pipes/translate.pipe';

@Component({
    standalone: true,
    selector: 'app-timer-page',
    imports: [RouterLink, TranslatePipe],
    templateUrl: './timer.page.html',
})
export class TimerPageComponent {
    readonly paths = APP_PATHS;
}
