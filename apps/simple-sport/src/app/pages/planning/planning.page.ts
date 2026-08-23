import {Component} from '@angular/core';
import {TranslatePipe} from '../../pipes/translate.pipe';

@Component({
    standalone: true,
    selector: 'app-planning-page',
    imports: [TranslatePipe],
    templateUrl: './planning.page.html',
})
export class PlanningPageComponent {}
