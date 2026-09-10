import {
    AfterViewInit,
    Component,
    effect,
    ElementRef,
    inject,
    Injector,
    OnDestroy,
    signal,
    untracked,
    ViewChild,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ECharts, init, use} from 'echarts/core';
import {LineChart} from 'echarts/charts';
import {GridComponent, TooltipComponent} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';
import {MatDatepickerInputEvent, MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatNativeDateModule} from '@angular/material/core';
import {TranslatePipe} from '../../pipes/translate.pipe';
import {ThemeStore} from '../../stores/theme.store';
import {TranslateService} from '../../services/translate.service';
import {buildLineChartOption, readChartTheme} from '../../utils/chart-theme';
import {FoodChartStore} from '../../stores/food-chart.store';

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
    standalone: true,
    selector: 'app-food-progress-page',
    imports: [
        FormsModule,
        TranslatePipe,
        MatDatepickerModule,
        MatFormFieldModule,
        MatInputModule,
        MatNativeDateModule,
    ],
    templateUrl: './food-progress.page.html',
    styleUrl: './food-progress.page.css',
    providers: [FoodChartStore],
})
export class FoodProgressPageComponent implements AfterViewInit, OnDestroy {
    @ViewChild('caloriesChartContainer', {static: true})
    caloriesChartContainer!: ElementRef<HTMLDivElement>;

    readonly store = inject(FoodChartStore);
    readonly selectedRange = signal<{start: Date | undefined; end: Date | undefined}>({
        start: this.store.rangeStart(),
        end: this.store.rangeEnd(),
    });
    private chart?: ECharts;
    private readonly injector = inject(Injector);
    private readonly themeStore = inject(ThemeStore);
    private readonly translateService = inject(TranslateService);
    private readonly onWindowResize = (): void => {
        this.chart?.resize();
    };

    ngAfterViewInit(): void {
        this.chart = init(this.caloriesChartContainer.nativeElement);
        this.renderSeries();
        effect(
            () => {
                this.store.series();
                this.themeStore.theme();
                this.translateService.translations();
                untracked(() => {
                    requestAnimationFrame(() => this.renderSeries());
                });
            },
            {injector: this.injector},
        );
        window.addEventListener('resize', this.onWindowResize, {passive: true});
    }

    ngOnDestroy(): void {
        window.removeEventListener('resize', this.onWindowResize);
        this.chart?.dispose();
    }

    onStartDate(event: MatDatepickerInputEvent<Date>): void {
        this.selectedRange.update((range) => ({
            ...range,
            start: event.value ?? undefined,
        }));
        this.onRangeUpdated();
    }

    onEndDate(event: MatDatepickerInputEvent<Date>): void {
        this.selectedRange.update((range) => ({...range, end: event.value ?? undefined}));
        this.onRangeUpdated();
    }

    onRangeUpdated(): void {
        const range = this.selectedRange();
        this.store.setRange(
            range.start ?? this.store.rangeStart(),
            range.end ?? this.store.rangeEnd(),
        );
    }

    private renderSeries(): void {
        const series = this.store.series();

        if (!series || !this.caloriesChartContainer) {
            return;
        }

        const theme = readChartTheme(this.caloriesChartContainer.nativeElement);
        this.chart?.setOption(
            buildLineChartOption(series.dates, series.calories, series.planned, theme, {
                done: this.translateService.translate('APP.PAGES.PROGRESS.SERIES_DONE'),
                planned: this.translateService.translate(
                    'APP.PAGES.PROGRESS.SERIES_PLANNED',
                ),
            }),
            true,
        );
    }
}
