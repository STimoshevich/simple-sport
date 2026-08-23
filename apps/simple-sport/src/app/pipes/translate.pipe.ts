import {Pipe, PipeTransform} from '@angular/core';
import {TranslateService} from '../services/translate.service';

@Pipe({
    name: 'translate',
    standalone: true,
    pure: false,
})
export class TranslatePipe implements PipeTransform {
    constructor(private readonly translateService: TranslateService) {}

    transform(value: string): string {
        return this.translateService.translate(value);
    }
}
