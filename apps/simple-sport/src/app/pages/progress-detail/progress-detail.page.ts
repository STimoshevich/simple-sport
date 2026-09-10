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
import {connect, disconnect, ECharts, init, use} from 'echarts/core';
import {LineChart} from 'echarts/charts';
import {GridComponent, TooltipComponent} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';
import {MatDatepickerInputEvent, MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatNativeDateModule} from '@angular/material/core';
import {TranslatePipe} from '../../pipes/translate.pipe';
import {TranslateService} from '../../services/translate.service';
import {ThemeStore} from '../../stores/theme.store';
import {UnitsStore} from '../../stores/units.store';
import {buildLineChartOption, readChartTheme} from '../../utils/chart-theme';
import {toDisplayWeight} from '../../utils/display-units';
import {TrainingChartStore} from '../../stores/training-chart.store';

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
    standalone: true,
    selector: 'app-progress-detail-page',
    imports: [
        FormsModule,
        TranslatePipe,
        MatDatepickerModule,
        MatFormFieldModule,
        MatInputModule,
        MatNativeDateModule,
    ],
    templateUrl: './progress-detail.page.html',
    styleUrls: ['./progress-detail.page.css'],
    providers: [TrainingChartStore],
})
export class ProgressDetailPageComponent implements AfterViewInit, OnDestroy {
    @ViewChild('repsChartContainer', {static: true})
    repsChartContainer!: ElementRef<HTMLDivElement>;
    @ViewChild('weightChartContainer', {static: true})
    weightChartContainer!: ElementRef<HTMLDivElement>;

    readonly store = inject(TrainingChartStore);
    trainingName = this.store.trainingName;
    readonly selectedRange = signal<{start: Date | undefined; end: Date | undefined}>({
        start: this.store.rangeStart(),
        end: this.store.rangeEnd(),
    });
    private repsChart?: ECharts;
    private weightChart?: ECharts;
    private readonly injector = inject(Injector);
    private readonly themeStore = inject(ThemeStore);
    readonly unitsStore = inject(UnitsStore);
    private readonly translateService = inject(TranslateService);
    private readonly chartGroupId = 'progress-detail-sync-group';
    private readonly onWindowResize = (): void => {
        this.repsChart?.resize();
        this.weightChart?.resize();
    };

    ngAfterViewInit(): void {
        this.repsChart = init(this.repsChartContainer.nativeElement);
        this.weightChart = init(this.weightChartContainer.nativeElement);
        this.bindChartsGroupSync();
        this.bindChartsInteractionSync();
        this.renderSeries();
        effect(
            () => {
                this.store.series();
                this.themeStore.theme();
                this.unitsStore.weightUnit();
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
        disconnect(this.chartGroupId);
        window.removeEventListener('resize', this.onWindowResize);
        this.repsChart?.dispose();
        this.weightChart?.dispose();
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

    private bindChartsInteractionSync(): void {
        if (!this.repsChart || !this.weightChart) {
            return;
        }

        let syncing = false;

        const syncHover = (source: ECharts, target: ECharts, dataIndex: number): void => {
            if (syncing) {
                return;
            }

            syncing = true;
            this.syncDataPointSelection(source, dataIndex);
            this.syncDataPointSelection(target, dataIndex);
            syncing = false;
        };

        this.repsChart.on('click', (params: {dataIndex?: number}) => {
            if (typeof params.dataIndex !== 'number') {
                return;
            }

            syncHover(
                this.repsChart as ECharts,
                this.weightChart as ECharts,
                params.dataIndex,
            );
        });

        this.weightChart.on('click', (params: {dataIndex?: number}) => {
            if (typeof params.dataIndex !== 'number') {
                return;
            }

            syncHover(
                this.weightChart as ECharts,
                this.repsChart as ECharts,
                params.dataIndex,
            );
        });
    }

    private renderSeries(): void {
        const series = this.store.series();

        if (!series || !this.repsChartContainer) {
            return;
        }

        const theme = readChartTheme(this.repsChartContainer.nativeElement);
        const labels = {
            done: this.translateService.translate('APP.PAGES.PROGRESS.SERIES_DONE'),
            planned: this.translateService.translate('APP.PAGES.PROGRESS.SERIES_PLANNED'),
        };
        const weightUnit = this.unitsStore.weightUnit();
        this.repsChart?.setOption(
            buildLineChartOption(
                series.dates,
                series.reps,
                series.plannedReps,
                theme,
                labels,
            ),
            true,
        );
        this.weightChart?.setOption(
            buildLineChartOption(
                series.dates,
                series.weights.map((value) => toDisplayWeight(value, weightUnit) ?? 0),
                series.plannedWeights.map(
                    (value) => toDisplayWeight(value, weightUnit) ?? 0,
                ),
                theme,
                labels,
            ),
            true,
        );
    }

    private bindChartsGroupSync(): void {
        if (!this.repsChart || !this.weightChart) {
            return;
        }

        this.repsChart.group = this.chartGroupId;
        this.weightChart.group = this.chartGroupId;
        connect(this.chartGroupId);
    }

    private syncDataPointSelection(chart: ECharts, dataIndex: number): void {
        [0, 1].forEach((seriesIndex) => {
            chart.dispatchAction({type: 'showTip', seriesIndex, dataIndex});
            chart.dispatchAction({type: 'highlight', seriesIndex, dataIndex});
        });
    }
}
