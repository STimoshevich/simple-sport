import {Component, input, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {APP_PATHS} from '@simple-sport/shared';
import {TranslatePipe} from '../../../pipes/translate.pipe';

@Component({
    standalone: true,
    selector: 'app-history-feed-header',
    imports: [TranslatePipe, RouterLink, MatButtonModule, MatIconModule],
    templateUrl: './history-feed-header.component.html',
    styleUrls: ['./history-feed-header.component.css'],
})
export class HistoryFeedHeaderComponent {
    readonly paths = APP_PATHS;
    readonly periodLabel = input<string | null>(null);

    readonly openFilters = output<void>();
    readonly clearPeriod = output<void>();

}
