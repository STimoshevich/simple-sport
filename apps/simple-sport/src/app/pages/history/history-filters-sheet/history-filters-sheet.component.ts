import {
    AfterViewInit,
    Component,
    computed,
    Inject,
    OnDestroy,
    signal,
    ViewChild,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {
    MAT_BOTTOM_SHEET_DATA,
    MatBottomSheetModule,
    MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButtonModule} from '@angular/material/button';
import {MatDatepickerModule, MatDateRangePicker} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {EXERCISE_TYPE, ExerciseType} from '@simple-sport/shared';
import {TranslatePipe} from '../../../pipes/translate.pipe';
import {CustomListSelectComponent} from '../../../components/custom-list-select/custom-list-select.component';
import {
    copyHistoryFilters,
    emptyHistoryFilters,
    HistoryFiltersState,
} from '@simple-sport/integration';
import {toDateOrUndefined} from '../../../utils/date-value';
import {Subscription} from 'rxjs';

export type HistoryFilterExerciseOption = {
    id: string;
    name: string;
};

export type HistoryFiltersSheetData = {
    state: HistoryFiltersState;
    exerciseOptions: HistoryFilterExerciseOption[];
};

@Component({
    standalone: true,
    imports: [
        FormsModule,
        MatBottomSheetModule,
        MatCheckboxModule,
        MatButtonModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatInputModule,
        TranslatePipe,
        CustomListSelectComponent,
    ],
    templateUrl: './history-filters-sheet.component.html',
    styleUrls: ['./history-filters-sheet.component.css'],
    host: {
        class: 'filters-sheet',
    },
})
export class HistoryFiltersSheetComponent implements AfterViewInit, OnDestroy {
    @ViewChild('picker') private readonly picker?: MatDateRangePicker<Date>;

    readonly typeOptions = [
        {value: EXERCISE_TYPE.Strength, label: 'APP.PAGES.EXERCISES.STRENGTH'},
        {value: EXERCISE_TYPE.Cardio, label: 'APP.PAGES.EXERCISES.CARDIO'},
        {value: EXERCISE_TYPE.Stretching, label: 'APP.PAGES.EXERCISES.STRETCHING'},
    ];

    readonly state = signal<HistoryFiltersState>(emptyHistoryFilters());
    readonly exerciseOptions: HistoryFilterExerciseOption[];
    readonly displayName = (value: HistoryFilterExerciseOption): string => value.name;

    readonly selectedExercises = computed(() =>
        this.exerciseOptions.filter((item) => this.state().exerciseIds.includes(item.id)),
    );

    private readonly subscriptions = new Subscription();

    constructor(
        private readonly ref: MatBottomSheetRef<
            HistoryFiltersSheetComponent,
            HistoryFiltersState
        >,
        @Inject(MAT_BOTTOM_SHEET_DATA) data: HistoryFiltersSheetData,
    ) {
        this.state.set(
            copyHistoryFilters({
                ...data.state,
                startDate: toDateOrUndefined(data.state.startDate),
                endDate: toDateOrUndefined(data.state.endDate),
            }),
        );
        this.exerciseOptions = data.exerciseOptions;
    }

    ngAfterViewInit(): void {
        const picker = this.picker;

        if (!picker) {
            return;
        }

        this.subscriptions.add(
            picker.openedStream.subscribe(() => {
                this.ref.disableClose = true;
            }),
        );
        this.subscriptions.add(
            picker.closedStream.subscribe(() => {
                this.ref.disableClose = false;
            }),
        );
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.ref.disableClose = false;
    }

    openDateRange(): void {
        this.picker?.open();
    }

    clearDates(): void {
        this.state.update((state) =>
            copyHistoryFilters({...state, startDate: undefined, endDate: undefined}),
        );
    }

    hasType(type: ExerciseType): boolean {
        return this.state().exerciseTypes.includes(type);
    }

    toggleType(type: ExerciseType, checked: boolean): void {
        this.state.update((state) => {
            if (checked) {
                if (state.exerciseTypes.includes(type)) {
                    return state;
                }

                return copyHistoryFilters({
                    ...state,
                    exerciseTypes: [...state.exerciseTypes, type],
                });
            }

            return copyHistoryFilters({
                ...state,
                exerciseTypes: state.exerciseTypes.filter((item) => item !== type),
            });
        });
    }

    onExercisesChange(selected: HistoryFilterExerciseOption[]): void {
        this.state.update((state) =>
            copyHistoryFilters({...state, exerciseIds: selected.map((item) => item.id)}),
        );
    }

    setStartDate(value: Date | null): void {
        this.state.update((state) =>
            copyHistoryFilters({...state, startDate: value ?? undefined}),
        );
    }

    setEndDate(value: Date | null): void {
        this.state.update((state) =>
            copyHistoryFilters({...state, endDate: value ?? undefined}),
        );
    }

    setShowArchived(value: boolean): void {
        this.state.update((state) => copyHistoryFilters({...state, showArchived: value}));
    }

    close(): void {
        this.ref.dismiss();
    }

    resetAll(): void {
        this.ref.dismiss(emptyHistoryFilters());
    }

    apply(): void {
        const state = this.state();
        this.ref.dismiss({
            ...state,
            startDate: toDateOrUndefined(state.startDate),
            endDate: toDateOrUndefined(state.endDate),
            exerciseIds: [...state.exerciseIds],
            exerciseTypes: [...state.exerciseTypes],
            exerciseNames: [],
        });
    }
}
