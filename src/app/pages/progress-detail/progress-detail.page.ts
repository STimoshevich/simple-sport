import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ECharts, init, use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TrainingContractService } from '../../services/training-contract.service';

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
  standalone: true,
  selector: 'app-progress-detail-page',
  imports: [TranslatePipe],
  template: `
    <section class="page">
      <h2>{{ trainingName }}</h2>
      <p>{{ 'APP.PAGES.PROGRESS.CHART_PLACEHOLDER' | translate }}</p>
      <div #chartContainer class="progress-chart" [attr.aria-label]="'APP.PAGES.PROGRESS.CHART_ARIA' | translate"></div>
    </section>
  `,
  styles: [`.progress-chart { width: 100%; height: 280px; margin-top: 16px; }`]
})
export class ProgressDetailPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef<HTMLDivElement>;
  trainingName = '';
  private chart?: ECharts;

  constructor(private readonly route: ActivatedRoute, private readonly trainingService: TrainingContractService) {
    this.trainingName = this.route.snapshot.paramMap.get('name') ?? '';
  }

  ngAfterViewInit(): void {
    const series = this.trainingService.getProgressSeriesByName(this.trainingName, 20);
    this.chart = init(this.chartContainer.nativeElement);
    this.chart.setOption({
      grid: { left: 16, right: 16, top: 24, bottom: 24, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: series.dates },
      yAxis: { type: 'value' },
      series: [{ data: series.reps, type: 'line', smooth: true }]
    });
  }

  ngOnDestroy(): void { this.chart?.dispose(); }
}
