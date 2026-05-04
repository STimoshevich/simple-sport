import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, QueryList, TemplateRef, ViewChildren } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetModule, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  imports: [CommonModule, MatBottomSheetModule, MatCheckboxModule, MatButtonModule],
  templateUrl: './custom-list-select-sheet.component.html',
  styleUrls: ['./custom-list-select-sheet.component.css']
})
export class CustomListSelectSheetComponent<T> implements AfterViewInit {
  items: T[] = [];
  selected: T[] = [];
  multiple = false;
  displayWith: (item: T) => string = (item) => String(item);
  itemTemplate?: TemplateRef<{ $implicit: T; selected: boolean }>;

  @ViewChildren('itemRow', { read: ElementRef }) itemRows!: QueryList<ElementRef<HTMLElement>>;

  constructor(
    private readonly sheetRef: MatBottomSheetRef<CustomListSelectSheetComponent<T>>,
    @Inject(MAT_BOTTOM_SHEET_DATA) data: any
  ) {
    this.items = data.items;
    this.selected = [...data.selected];
    this.multiple = data.multiple;
    this.displayWith = data.displayWith;
    this.itemTemplate = data.itemTemplate;
  }

  ngAfterViewInit(): void {
    const selectedIndex = this.items.findIndex((item) => this.isSelected(item));
    if (selectedIndex < 0) return;
    this.itemRows.get(selectedIndex)?.nativeElement.scrollIntoView({ block: 'center' });
  }

  isSelected(item: T): boolean { return this.selected.includes(item); }

  toggle(item: T): void {
    if (!this.multiple) {
      this.selected = [item];
      this.sheetRef.dismiss(this.selected);
      return;
    }
    this.selected = this.isSelected(item) ? this.selected.filter((s) => s !== item) : [...this.selected, item];
  }

  close(): void { this.sheetRef.dismiss(); }
  apply(): void { this.sheetRef.dismiss(this.selected); }
}
