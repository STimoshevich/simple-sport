import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ECharts, init, use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractService } from '../../services/training-contract.service';

declare const $: any;
declare const moment: any;

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
  standalone: true,
  selector: 'app-progress-detail-page',
  imports: [TranslatePipe],
  template: `
    <section class="page">
      <h2>{{ trainingName }}</h2>
      <p>{{ 'APP.PAGES.PROGRESS.CHART_PLACEHOLDER' | translate }}</p>

      <input #rangeInput class="range-input" type="text" readonly />
      <div #chartContainer class="progress-chart" [attr.aria-label]="'APP.PAGES.PROGRESS.CHART_ARIA' | translate"></div>
    </section>
  `,
  styles: [
    `.range-input { width: 100%; max-width: 260px; margin: 8px 0 12px; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(148,163,184,.45); background: #0f172a; color: #e2e8f0; }
     .progress-chart { width: 100%; height: 280px; margin-top: 8px; }`
  ]
})
export class ProgressDetailPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('rangeInput', { static: true }) rangeInput!: ElementRef<HTMLInputElement>;

  trainingName = '';
  private chart?: ECharts;

  constructor(private readonly route: ActivatedRoute, private readonly trainingService: TrainingContractService) {
    this.trainingName = this.route.snapshot.paramMap.get('name') ?? '';
  }

  ngAfterViewInit(): void {
    this.chart = init(this.chartContainer.nativeElement);
    this.renderSeries(20);

    const start = moment().subtract(19, 'days');
    const end = moment();

    $(this.rangeInput.nativeElement).daterangepicker({
      startDate: start,
      endDate: end,
      locale: { format: 'YYYY-MM-DD' }
    });

    $(this.rangeInput.nativeElement).on('apply.daterangepicker', (_: unknown, picker: any) => {
      const days = picker.endDate.diff(picker.startDate, 'days') + 1;
      this.renderSeries(days);
    });
  }

  ngOnDestroy(): void {
    this.chart?.dispose();
  }

  private renderSeries(days: number): void {
    const series = this.trainingService.getProgressSeriesByName(this.trainingName, days);
    this.chart?.setOption({
      grid: { left: 16, right: 16, top: 24, bottom: 24, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: series.dates },
      yAxis: { type: 'value' },
      series: [{ data: series.reps, type: 'line', smooth: true }]
    });
  }
}
