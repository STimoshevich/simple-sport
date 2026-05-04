import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { connect, disconnect, ECharts, init, use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { EChartsOption } from 'echarts';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractService } from '../../services/training-contract.service';
import { TranslateService } from '../../services/translate.service';

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
  standalone: true,
  selector: 'app-progress-detail-page',
  imports: [FormsModule, TranslatePipe, MatDatepickerModule, MatFormFieldModule, MatInputModule, MatNativeDateModule],
  templateUrl: './progress-detail.page.html',
  styleUrls: ['./progress-detail.page.css']
})
export class ProgressDetailPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('repsChartContainer', { static: true }) repsChartContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('weightChartContainer', { static: true }) weightChartContainer!: ElementRef<HTMLDivElement>;

  trainingName = '';
  selectedRange = { start: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000), end: new Date() };
  private repsChart?: ECharts;
  private weightChart?: ECharts;
  private readonly chartGroupId = 'progress-detail-sync-group';
  private readonly onWindowResize = (): void => {
    this.repsChart?.resize();
    this.weightChart?.resize();
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly trainingService: TrainingContractService,
    private readonly translateService: TranslateService
  ) {
    this.trainingName = this.route.snapshot.paramMap.get('name') ?? '';
  }

  ngAfterViewInit(): void {
    this.repsChart = init(this.repsChartContainer.nativeElement);
    this.weightChart = init(this.weightChartContainer.nativeElement);
    this.bindChartsGroupSync();
    this.bindChartsInteractionSync();
    this.renderSeriesForSelectedRange();
    window.addEventListener('resize', this.onWindowResize, { passive: true });
  }

  ngOnDestroy(): void {
    disconnect(this.chartGroupId);
    window.removeEventListener('resize', this.onWindowResize);
    this.repsChart?.dispose();
    this.weightChart?.dispose();
  }

  onRangeUpdated(): void {
    this.renderSeriesForSelectedRange();
  }



  private bindChartsInteractionSync(): void {
    if (!this.repsChart || !this.weightChart) return;

    let syncing = false;
    const syncHover = (source: ECharts, target: ECharts, dataIndex: number): void => {
      if (syncing) return;
      syncing = true;
      this.syncDataPointSelection(source, dataIndex);
      this.syncDataPointSelection(target, dataIndex);
      syncing = false;
    };

    this.repsChart.on('click', (params: { dataIndex?: number }) => {
      if (typeof params.dataIndex !== 'number') return;
      syncHover(this.repsChart as ECharts, this.weightChart as ECharts, params.dataIndex);
    });

    this.weightChart.on('click', (params: { dataIndex?: number }) => {
      if (typeof params.dataIndex !== 'number') return;
      syncHover(this.weightChart as ECharts, this.repsChart as ECharts, params.dataIndex);
    });
  }

  private renderSeriesForSelectedRange(): void {
    const start = new Date(this.selectedRange.start ?? new Date());
    const end = new Date(this.selectedRange.end ?? new Date());
    const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);

    const series = this.trainingService.getProgressSeriesByName(this.trainingName, days);
    this.repsChart?.setOption(this.buildChartOption(series.dates, series.reps, series.plannedReps));
    this.weightChart?.setOption(this.buildChartOption(series.dates, series.weights, series.plannedWeights));
  }
  private bindChartsGroupSync(): void {
    if (!this.repsChart || !this.weightChart) return;

    this.repsChart.group = this.chartGroupId;
    this.weightChart.group = this.chartGroupId;
    connect(this.chartGroupId);
  }

  private buildChartOption(dates: string[], doneValues: number[], plannedValues: number[]): EChartsOption {
    return {
      grid: { left: 16, right: 16, top: 24, bottom: 24, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value' },
      series: [
        { name: this.translateService.translate('APP.PAGES.PROGRESS.SERIES_DONE'), data: doneValues, type: 'line', smooth: true },
        { name: this.translateService.translate('APP.PAGES.PROGRESS.SERIES_PLANNED'), data: plannedValues, type: 'line', smooth: true, lineStyle: { type: 'dashed' } }
      ]
    };
  }

  private syncDataPointSelection(chart: ECharts, dataIndex: number): void {
    [0, 1].forEach((seriesIndex) => {
      chart.dispatchAction({ type: 'showTip', seriesIndex, dataIndex });
      chart.dispatchAction({ type: 'highlight', seriesIndex, dataIndex });
    });
  }
}
