import {Component, DestroyRef, effect, inject, signal, untracked} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatBottomSheet} from '@angular/material/bottom-sheet';
import {MatDialog} from '@angular/material/dialog';
import {
    MatSnackBar,
    MatSnackBarModule,
    MatSnackBarRef,
} from '@angular/material/snack-bar';
import {toLocalDayKey} from '@simple-sport/shared';
import {fromEvent} from 'rxjs';
import {TranslatePipe} from '../../pipes/translate.pipe';
import {TranslateService} from '../../services/translate.service';
import {HistoryFiltersSheetComponent} from './history-filters-sheet/history-filters-sheet.component';
import {
    emptyHistoryFilters,
    HistoryFiltersState,
    TrainingExerciseView,
} from '@simple-sport/integration';
import {FeedToggleResult, HistoryStore} from './history.store';
import {ExerciseCatalogStore} from '../../stores/global/exercise-catalog.store';
import {InfiniteScrollDirective} from '../../directives/infinite-scroll.directive';
import {HistoryFeedHeaderComponent} from './history-feed-header/history-feed-header.component';
import {HistoryDaySectionComponent} from './history-day-section/history-day-section.component';
import {
    WorkoutEditorDialogComponent,
    WorkoutEditorDialogData,
} from '../workout-detail/workout-detail.page';

@Component({
    standalone: true,
    selector: 'app-history-page',
    imports: [
        TranslatePipe,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
        HistoryFeedHeaderComponent,
        HistoryDaySectionComponent,
        InfiniteScrollDirective,
    ],
    templateUrl: './history.page.html',
    styleUrls: ['./history.page.css'],
})
export class HistoryPageComponent {
    readonly store = inject(HistoryStore);
    private readonly catalog = inject(ExerciseCatalogStore);
    private readonly translate = inject(TranslateService);
    private readonly snackBar = inject(MatSnackBar);
    private snackRef?: MatSnackBarRef<unknown>;
    private readonly bottomSheet = inject(MatBottomSheet);
    private readonly dialog = inject(MatDialog);
    private todayObserver?: IntersectionObserver;
    private viewportReady = false;
    /** Идёт восстановление сохранённой позиции скролла — дозагрузка отключена. */
    readonly restoring = signal(true);
    private pendingScrollAdjust: {height: number; top: number} | null = null;
    readonly todayOffscreen = signal(false);
    /** Порог дозагрузки: % длины скролла, которые могут остаться до верха ленты. */
    readonly loadMoreThresholdPercent = 10;

    constructor() {
        const destroyRef = inject(DestroyRef);
        destroyRef.onDestroy(() => {
            this.todayObserver?.disconnect();
        });

        fromEvent(window, 'scroll', {passive: true})
            .pipe(takeUntilDestroyed(destroyRef))
            .subscribe(() => {
                // this.feedUi.setScrollOffset(window.scrollY);

                if (!this.restoring()) {
                    this.syncAnchorFromViewport();
                }
            });

        // fromEvent(document, 'visibilitychange')
        //     .pipe(takeUntilDestroyed(destroyRef))
        //     .subscribe(() => {
        //         if (document.visibilityState !== 'visible') {
        //             return;
        //         }
        //
        //         if (!this.store.alignCalendarDay()) {
        //             return;
        //         }
        //
        //         this.feedUi.setAnchorDate(this.store.calendarToday());
        //         this.feedUi.setScrollOffset(0);
        //         this.viewportReady = false;
        //         this.restoring.set(true);
        //     });

        // effect(() => {
        //     const ready = this.feedUi.ready();
        //     const filters = this.feedUi.filters();
        //     const catalog = this.catalog.exercises();
        //     const catalogReady = this.catalog.hasLoaded();
        //     untracked(() => {
        //         if (!ready) {
        //             return;
        //         }
        //
        //         const resolved = catalogReady
        //             ? resolveLegacyExerciseFilters(filters, catalog)
        //             : filters;
        //
        //         if (catalogReady && !historyFiltersEqual(resolved, filters)) {
        //             this.feedUi.setFilters(resolved);
        //         }
        //
        //         const current =
        //             (this.store.filters() as HistoryFiltersState | null) ?? null;
        //
        //         if (current && historyFiltersEqual(current, resolved)) {
        //             return;
        //         }
        //
        //         this.store.applyFilters(resolved);
        //     });
        // });

        // effect(() => {
        //     // const ready = this.feedUi.ready();
        //     const loaded = this.store.hasLoaded();
        //     const days = this.store.pastDays();
        //     // const offset = this.feedUi.scrollOffset();
        //     const filterEmpty = this.showFilterEmpty();
        //     untracked(() => {
        //         if (this.viewportReady || !ready || !loaded) {
        //             return;
        //         }
        //
        //         if (filterEmpty) {
        //             this.finishRestore();
        //             return;
        //         }
        //
        //         if (this.pendingScrollAdjust || this.store.meta().isLoading) {
        //             return;
        //         }
        //
        //         if (offset > 0 && days.length === 0) {
        //             return;
        //         }
        //
        //         // const anchor = this.feedUi.anchorDate();
        //
        //         if (offset > 0 && !this.store.ensurePastCovered(anchor)) {
        //             return;
        //         }
        //
        //         requestAnimationFrame(() => this.restoreViewport(offset));
        //     });
        // });

        effect(() => {
            this.store.pastDays();
            untracked(() => this.applyScrollAdjust());
        });

        effect(() => {
            this.store.pastDays();
            this.store.futureDays();
            this.store.hasLoaded();
            // this.feedUi.hasActiveFilters();
            untracked(() => this.bindTodayObserver());
        });
    }

    showHint(): boolean {
        return (
            this.store.hasLoaded() && !this.store.hasEverTrained()
            // !this.feedUi.hasActiveFilters()
        );
    }

    showFilterEmpty(): boolean {
        return (
            this.store.hasLoaded() &&
            // this.feedUi.hasActiveFilters() &&
            !this.store.hasMatchingDays()
        );
    }

    onExerciseToggle(exercise: TrainingExerciseView): void {
        const previous = this.snackRef;
        this.snackRef = undefined;
        previous?.dismiss();
        this.store.toggleFeedExercise(exercise).subscribe({
            next: (result) => {
                if (!result) {
                    return;
                }

                const snapshots = result.snapshots;
                const ref = this.snackBar.open(
                    this.feedToggleMessage(result),
                    this.translate.translate('APP.PAGES.HISTORY.UNDO'),
                    {duration: 5000},
                );
                this.snackRef = ref;
                ref.afterDismissed().subscribe((info) => {
                    if (this.snackRef !== ref) {
                        return;
                    }

                    this.snackRef = undefined;

                    if (!info.dismissedByAction || !snapshots.length) {
                        return;
                    }

                    this.store.undoFeedSets(snapshots).subscribe({
                        error: () => {
                            this.snackBar.open(
                                this.translate.translate('APP.PAGES.HISTORY.MARK_ERROR'),
                                undefined,
                                {
                                    duration: 4000,
                                },
                            );
                        },
                    });
                });
            },
            error: () => {
                this.snackBar.open(
                    this.translate.translate('APP.PAGES.HISTORY.MARK_ERROR'),
                    undefined,
                    {
                        duration: 4000,
                    },
                );
            },
        });
    }

    private feedToggleMessage(result: FeedToggleResult): string {
        const name =
            result.name.trim() ||
            this.translate.translate('APP.PAGES.EXERCISES.UNTITLED');

        if (!result.done) {
            return `${this.translate.translate('APP.PAGES.HISTORY.UNMARKED')}: ${name}`;
        }

        return `${this.translate.translate('APP.PAGES.HISTORY.MARKED')}: ${name}, ${result.count} ${this.translate.translate('APP.PAGES.HISTORY.SETS_WORD')}`;
    }

    reorderTrainings(date: string, orderedIds: string[]): void {
        this.store.reorderTrainings(date, orderedIds).subscribe({
            error: () => {
                this.snackBar.open(
                    this.translate.translate('APP.PAGES.HISTORY.REORDER_ERROR'),
                    undefined,
                    {
                        duration: 4000,
                    },
                );
            },
        });
    }

    addTraining(date?: Date | string): void {
        this.openEditor({
            date:
                typeof date === 'string' ? date : date ? toLocalDayKey(date) : undefined,
        });
    }

    saveDayNote(date: string, text: string): void {
        this.store.saveDayNote(date, text).subscribe({
            error: () => {
                this.snackBar.open(
                    this.translate.translate('APP.PAGES.HISTORY.NOTE_ERROR'),
                    undefined,
                    {
                        duration: 4000,
                    },
                );
            },
        });
    }

    openWorkout(trainingId: string, date: string): void {
        this.openEditor({trainingId, date});
    }

    scrollToToday(): void {
        document
            .getElementById('feed-today')
            ?.scrollIntoView({block: 'end', behavior: 'smooth'});
    }

    loadMore(): void {
        this.captureScroll();
        this.store.nextPage();
    }

    openFilters(): void {
        const catalog = this.catalog.exercises();
        // const state = resolveLegacyExerciseFilters(this.feedUi.filters(), catalog);
        this.bottomSheet
            .open(HistoryFiltersSheetComponent, {
                data: {
                    // state,
                    exerciseOptions: catalog.map((item) => ({
                        id: item.id,
                        name: item.name,
                    })),
                },
            })
            .afterDismissed()
            .subscribe((value?: HistoryFiltersState) => {
                if (!value) {
                    return;
                }

                // this.feedUi.setFilters(value);
                this.store.applyFilters(value);
                this.resetViewport();
            });
    }

    resetFilters(): void {
        const filters = emptyHistoryFilters();
        // this.feedUi.resetFilters();
        this.store.applyFilters(filters);
        this.resetViewport();
    }

    periodLabel(): string | null {
        // const filters = this.feedUi.filters();

        return null;
        // if (!filters.startDate && !filters.endDate) {
        //     return null;
        // }
        //
        // const from = filters.startDate ? formatChipDate(filters.startDate) : '';
        // const to = filters.endDate ? formatChipDate(filters.endDate) : '';
        //
        // if (from && to) {
        //     return `${from} – ${to}`;
        // }
        //
        // if (from) {
        //     return `${this.translate.translate('APP.PAGES.HISTORY.PERIOD_FROM')} ${from}`;
        // }
        //
        // return `${this.translate.translate('APP.PAGES.HISTORY.PERIOD_UNTIL')} ${to}`;
    }

    clearPeriod(): void {
        // const next = copyHistoryFilters({
        //     ...this.feedUi.filters(),
        //     startDate: undefined,
        //     endDate: undefined,
        // });
        // // this.feedUi.setFilters(next);
        // this.store.applyFilters(next);
        // this.resetViewport();
    }

    private openEditor(data: WorkoutEditorDialogData): void {
        this.dialog
            .open(WorkoutEditorDialogComponent, {
                data: {
                    trainingId: data.trainingId,
                    date: data.date ?? this.store.calendarToday(),
                },
                width: '100vw',
                maxWidth: '100vw',
                height: '100dvh',
                maxHeight: '100dvh',
                panelClass: 'workout-editor-dialog',
                autoFocus: 'first-tabbable',
                disableClose: true,
            })
            .afterClosed()
            .subscribe(() => this.store.refresh());
    }

    private resetViewport(): void {
        // this.feedUi.setScrollOffset(0);
        // this.feedUi.setAnchorDate(this.store.calendarToday());
        this.viewportReady = false;
        this.restoring.set(true);
        window.scrollTo(0, 0);
    }

    private restoreViewport(offset: number): void {
        if (this.viewportReady) {
            return;
        }

        if (offset > 0) {
            const maxY = Math.max(
                0,
                document.documentElement.scrollHeight - window.innerHeight,
            );

            if (offset > maxY && this.store.hasMore()) {
                this.store.nextPage();
                return;
            }

            window.scrollTo(0, offset);
            this.finishRestore();
            return;
        }

        document
            .getElementById('feed-today')
            ?.scrollIntoView({block: 'end', behavior: 'instant'});
        this.finishRestore();
    }

    private finishRestore(): void {
        this.viewportReady = true;
        this.restoring.set(false);
        this.syncTodayVisibility();
    }

    private syncTodayVisibility(): void {
        const today = document.getElementById('feed-today');

        if (!today) {
            this.todayOffscreen.set(false);
            return;
        }

        const headerBottom =
            document.querySelector('.feed-header')?.getBoundingClientRect().bottom ?? 0;
        const rect = today.getBoundingClientRect();
        this.todayOffscreen.set(
            rect.bottom <= headerBottom || rect.top >= window.innerHeight,
        );
    }

    private syncAnchorFromViewport(): void {
        const sections = Array.from(
            document.querySelectorAll<HTMLElement>('.day-section[data-date]'),
        );

        if (!sections.length) {
            return;
        }

        const header = document.querySelector('.feed-header');
        const line = header?.getBoundingClientRect().bottom ?? 0;
        let current = this.store.calendarToday();

        for (const section of sections) {
            if (section.getBoundingClientRect().top <= line + 8) {
                current = section.dataset['date'] ?? current;
            } else {
                break;
            }
        }

        // this.feedUi.setAnchorDate(current);
    }

    private captureScroll(): void {
        this.pendingScrollAdjust = {
            height: document.documentElement.scrollHeight,
            top: window.scrollY,
        };
    }

    private applyScrollAdjust(): void {
        const pending = this.pendingScrollAdjust;

        if (!pending) {
            return;
        }

        if (this.restoring()) {
            this.pendingScrollAdjust = null;
            return;
        }

        const delta = document.documentElement.scrollHeight - pending.height;
        window.scrollTo(0, pending.top + delta);
        this.pendingScrollAdjust = null;
    }

    private bindTodayObserver(): void {
        this.todayObserver?.disconnect();
        this.todayObserver = undefined;
        const today = document.getElementById('feed-today');

        if (!today) {
            this.todayOffscreen.set(false);
            return;
        }

        const header = document.querySelector('.feed-header');
        const headerHeight = Math.ceil(header?.getBoundingClientRect().height ?? 0);
        this.todayObserver = new IntersectionObserver(
            ([entry]) => {
                if (this.restoring()) {
                    return;
                }

                this.todayOffscreen.set(!entry?.isIntersecting);
            },
            {root: null, rootMargin: `-${headerHeight}px 0px 0px 0px`, threshold: 0},
        );
        this.todayObserver.observe(today);
    }
}

function formatChipDate(date: Date): string {
    const [year, month, day] = toLocalDayKey(date).split('-');
    return `${day}.${month}.${year}`;
}
