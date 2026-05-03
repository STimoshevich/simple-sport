import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ECharts, init } from 'echarts/core';

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
  standalone: true,
  selector: 'app-progress-page',
  imports: [TranslatePipe],
  template: `
    <section class="page">
      <h2>{{ 'APP.PAGES.PROGRESS.TITLE' | translate }}</h2>
      <p>{{ 'APP.PAGES.PROGRESS.DESCRIPTION' | translate }}</p>

      <div #chartContainer class="progress-chart" [attr.aria-label]="'APP.PAGES.PROGRESS.CHART_ARIA' | translate"></div>
    </section>
  `,
  styles: [
    `
      .progress-chart { width: 100%; height: 280px; margin-top: 16px; }
    `
  ]
})
export class ProgressPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef<HTMLDivElement>;
  private chart?: ECharts;
  ngAfterViewInit(): void { this.chart = init(this.chartContainer.nativeElement); this.chart.setOption({grid:{left:16,right:16,top:24,bottom:24,containLabel:true},tooltip:{trigger:'axis'},xAxis:{type:'category',data:['Mon','Tue','Wed','Thu','Fri','Sat','Sun']},yAxis:{type:'value'},series:[{data:[5,6,7,8,7,9,10],type:'line',smooth:true}]}); }
  ngOnDestroy(): void { this.chart?.dispose(); }
}
