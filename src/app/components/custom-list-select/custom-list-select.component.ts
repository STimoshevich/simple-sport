import { CommonModule } from '@angular/common';
import { Component, TemplateRef, input, output } from '@angular/core';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CustomListSelectSheetComponent } from './custom-list-select-sheet.component';

@Component({
  selector: 'app-custom-list-select',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatBottomSheetModule],
  templateUrl: './custom-list-select.component.html',
  styleUrls: ['./custom-list-select.component.css']
})
export class CustomListSelectComponent<T> {
  label = input<string>('');
  items = input<T[]>([]);
  selected = input<T[]>([]);
  multiple = input<boolean>(false);
  displayWith = input<(item: T) => string>((item: T) => String(item));
  itemTemplate = input<TemplateRef<{ $implicit: T; selected: boolean }> | undefined>(undefined);
  selectionChange = output<T[]>();

  constructor(private readonly bottomSheet: MatBottomSheet) {}

  get displayValue(): string {
    if (!this.selected().length) return '';
    return this.selected().map((item) => this.displayWith()(item)).join(', ');
  }

  openDialog(): void {
    const ref = this.bottomSheet.open(CustomListSelectSheetComponent<T>, {
      data: {
        items: this.items(),
        selected: this.selected(),
        multiple: this.multiple(),
        displayWith: this.displayWith(),
        itemTemplate: this.itemTemplate()
      }
    });

    ref.afterDismissed().subscribe((value?: T[]) => {
      if (!value) return;
      this.selectionChange.emit(value);
    });
  }
}
