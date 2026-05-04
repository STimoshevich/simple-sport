import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { connect, disconnect, ECharts, init, use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxDaterangepickerBootstrapDirective } from 'ngx-daterangepicker-bootstrap';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractService } from '../../services/training-contract.service';

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
  standalone: true,
  selector: 'app-progress-detail-page',
  imports: [FormsModule, TranslatePipe, NgxDaterangepickerBootstrapDirective],
  template: `
    <section class="page">
      <h2>{{ trainingName }}</h2>
      <p>{{ 'APP.PAGES.PROGRESS.CHART_PLACEHOLDER' | translate }}</p>

      <input
        class="range-input"
        type="text"
        ngxDaterangepickerBootstrap
        [(ngModel)]="selectedRange"
        [locale]="{ format: 'YYYY-MM-DD' }"
        (datesUpdated)="onRangeUpdated()"
        readonly
      />

      <h3>{{ 'APP.PAGES.PROGRESS.REPS_CHART' | translate }}</h3>
      <div #repsChartContainer class="progress-chart" [attr.aria-label]="'APP.PAGES.PROGRESS.CHART_ARIA' | translate"></div>

      <h3>{{ 'APP.PAGES.PROGRESS.WEIGHT_CHART' | translate }}</h3>
      <div #weightChartContainer class="progress-chart"></div>
    </section>
  `,
  styles: [
    `.range-input { width: 100%; max-width: 260px; margin: 8px 0 12px; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(148,163,184,.45); background: #0f172a; color: #e2e8f0; }
     .progress-chart { width: 100%; height: 280px; margin-top: 8px; }`
  ]
})
export class ProgressDetailPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('repsChartContainer', { static: true }) repsChartContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('weightChartContainer', { static: true }) weightChartContainer!: ElementRef<HTMLDivElement>;

  trainingName = '';
  selectedRange = { startDate: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000), endDate: new Date() };
  private repsChart?: ECharts;
  private weightChart?: ECharts;
  private readonly chartGroupId = 'progress-detail-sync-group';
  private readonly onWindowResize = (): void => {
    this.repsChart?.resize();
    this.weightChart?.resize();
  };

  constructor(private readonly route: ActivatedRoute, private readonly trainingService: TrainingContractService) {
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
      source.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex });
      source.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex });
      target.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex });
      target.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex });
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
    const start = new Date(this.selectedRange.startDate);
    const end = new Date(this.selectedRange.endDate);
    const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);

    const series = this.trainingService.getProgressSeriesByName(this.trainingName, days);
    this.repsChart?.setOption({
      grid: { left: 16, right: 16, top: 24, bottom: 24, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: series.dates },
      yAxis: { type: 'value' },
      series: [{ data: series.reps, type: 'line', smooth: true }]
    });

    this.weightChart?.setOption({
      grid: { left: 16, right: 16, top: 24, bottom: 24, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: series.dates },
      yAxis: { type: 'value' },
      series: [{ data: series.weights, type: 'line', smooth: true }]
    });
  }
  private bindChartsGroupSync(): void {
    if (!this.repsChart || !this.weightChart) return;

    this.repsChart.group = this.chartGroupId;
    this.weightChart.group = this.chartGroupId;
    connect(this.chartGroupId);
  }
}
