import {Component} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {APP_PATHS} from '@simple-sport/shared';
import {TranslatePipe} from '../../pipes/translate.pipe';

@Component({
    standalone: true,
    selector: 'app-bottom-nav',
    imports: [RouterLink, RouterLinkActive, MatIconModule, TranslatePipe],
    templateUrl: './bottom-nav.component.html',
    styleUrl: './bottom-nav.component.css',
})
export class BottomNavComponent {
    readonly paths = APP_PATHS;
}
