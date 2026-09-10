import {CommonModule} from '@angular/common';
import {
    AfterViewInit,
    Component,
    computed,
    ElementRef,
    Inject,
    QueryList,
    signal,
    TemplateRef,
    ViewChildren,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {
    MAT_BOTTOM_SHEET_DATA,
    MatBottomSheetModule,
    MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';

export type CustomListSelectCreate = {create: string};

export function isCreateSelectResult(value: unknown): value is CustomListSelectCreate {
    return (
        !!value && typeof value === 'object' && !Array.isArray(value) && 'create' in value
    );
}

export interface CustomListSelectSheetData<T> {
    items: T[];
    selected: T[];
    multiple: boolean;
    displayWith: (item: T) => string;
    itemTemplate?: TemplateRef<{$implicit: T; selected: boolean}> | undefined;
    title?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    allowCreate?: boolean;
    createLabel?: (query: string) => string;
}

@Component({
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatBottomSheetModule,
        MatCheckboxModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
    ],
    templateUrl: './custom-list-select-sheet.component.html',
    styleUrls: ['./custom-list-select-sheet.component.css'],
})
export class CustomListSelectSheetComponent<T> implements AfterViewInit {
    readonly items: T[];
    readonly multiple: boolean;
    readonly displayWith: (item: T) => string;
    readonly itemTemplate: TemplateRef<{$implicit: T; selected: boolean}> | undefined;
    readonly title: string;
    readonly searchable: boolean;
    readonly searchPlaceholder: string;
    readonly allowCreate: boolean;
    readonly createLabel: (query: string) => string;

    readonly query = signal('');
    readonly selected = signal<T[]>([]);

    readonly visibleItems = computed(() => {
        const needle = this.query().trim().toLowerCase();

        if (!needle) {
            return this.items;
        }

        return this.items.filter((item) =>
            this.displayWith(item).toLowerCase().includes(needle),
        );
    });

    readonly showCreate = computed(
        () =>
            this.allowCreate &&
            this.query().trim().length > 0 &&
            this.visibleItems().length === 0,
    );

    @ViewChildren('itemRow', {read: ElementRef}) itemRows!: QueryList<
        ElementRef<HTMLElement>
    >;

    constructor(
        private readonly sheetRef: MatBottomSheetRef<
            CustomListSelectSheetComponent<T>,
            T[] | CustomListSelectCreate
        >,
        @Inject(MAT_BOTTOM_SHEET_DATA) data: CustomListSelectSheetData<T>,
    ) {
        this.items = data.items;
        this.selected.set([...data.selected]);
        this.multiple = data.multiple;
        this.displayWith = data.displayWith;
        this.itemTemplate = data.itemTemplate;
        this.title = data.title ?? 'Select';
        this.searchable = data.searchable === true;
        this.searchPlaceholder = data.searchPlaceholder ?? '';
        this.allowCreate = data.allowCreate === true;
        this.createLabel = data.createLabel ?? ((query) => query);
    }

    ngAfterViewInit(): void {
        const selectedIndex = this.visibleItems().findIndex((item) =>
            this.isSelected(item),
        );

        if (selectedIndex < 0) {
            return;
        }

        this.itemRows.get(selectedIndex)?.nativeElement.scrollIntoView({block: 'center'});
    }

    isSelected(item: T): boolean {
        return this.selected().includes(item);
    }

    toggle(item: T): void {
        if (!this.multiple) {
            this.selected.set([item]);
            this.sheetRef.dismiss(this.selected());
            return;
        }

        this.selected.update((current) =>
            this.isSelected(item)
                ? current.filter((value) => value !== item)
                : [...current, item],
        );
    }

    create(): void {
        const name = this.query().trim();

        if (!name) {
            return;
        }

        this.sheetRef.dismiss({create: name});
    }

    close(): void {
        this.sheetRef.dismiss();
    }

    apply(): void {
        this.sheetRef.dismiss(this.selected());
    }
}
