import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, QueryList, TemplateRef, ViewChildren } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheet, MatBottomSheetModule, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { Inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-custom-list-select',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatBottomSheetModule],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ label }}</mat-label>
      <input matInput [value]="displayValue" readonly (click)="openDialog()" />
    </mat-form-field>
  `,
  styles: [`.full-width { width: 100%; }`]
})
export class CustomListSelectComponent<T> {
  @Input() label = '';
  @Input() items: T[] = [];
  @Input() selected: T[] = [];
  @Input() multiple = false;
  @Input() displayWith: (item: T) => string = (item) => String(item);
  @Input() itemTemplate?: TemplateRef<{ $implicit: T; selected: boolean }>;
  @Output() selectionChange = new EventEmitter<T[]>();

  constructor(private readonly bottomSheet: MatBottomSheet) {}

  get displayValue(): string {
    if (!this.selected.length) return '';
    return this.selected.map((item) => this.displayWith(item)).join(', ');
  }

  openDialog(): void {
    const ref = this.bottomSheet.open(CustomListSelectSheetComponent<T>, {
      data: {
        items: this.items,
        selected: this.selected,
        multiple: this.multiple,
        displayWith: this.displayWith,
        itemTemplate: this.itemTemplate
      }
    });

    ref.afterDismissed().subscribe((value?: T[]) => {
      if (!value) return;
      this.selectionChange.emit(value);
    });
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, MatBottomSheetModule, MatCheckboxModule, MatButtonModule],
  template: `
    <h3 class="title">Select</h3>
    <div class="sheet-content">
      <div class="list" #listContainer>
        @for (item of items; track $index) {
          <div class="row" #itemRow (click)="toggle(item)">
            @if (multiple) {
              <mat-checkbox [checked]="isSelected(item)"></mat-checkbox>
            }
            @if (itemTemplate) {
              <ng-container [ngTemplateOutlet]="itemTemplate" [ngTemplateOutletContext]="{ $implicit: item, selected: isSelected(item) }"></ng-container>
            } @else {
              <span>{{ displayWith(item) }}</span>
            }
          </div>
        }
      </div>
    </div>
    @if (multiple) {
      <div class="actions">
        <button mat-button (click)="close()">Cancel</button>
        <button mat-flat-button color="primary" (click)="apply()">Apply</button>
      </div>
    }
  `,
  styles: [`.title { margin: 0 0 10px; } .sheet-content { max-height: 60vh; overflow: auto; } .list { max-height: 360px; overflow: auto; } .row { display: flex; align-items: center; gap: 10px; padding: 8px; cursor: pointer; } .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }`]
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
    const row = this.itemRows.get(selectedIndex)?.nativeElement;
    row?.scrollIntoView({ block: 'center' });
  }

  isSelected(item: T): boolean {
    return this.selected.includes(item);
  }

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
