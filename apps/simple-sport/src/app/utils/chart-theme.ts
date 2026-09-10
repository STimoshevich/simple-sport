import {EChartsOption} from 'echarts';

export interface ChartTheme {
    text: string;
    muted: string;
    primary: string;
    tertiary: string;
    outline: string;
    surface: string;
    fontFamily: string;
}

export function readChartTheme(host: HTMLElement): ChartTheme {
    return {
        text: resolveColor(host, '--chart-text'),
        muted: resolveColor(host, '--chart-muted'),
        primary: resolveColor(host, '--chart-primary'),
        tertiary: resolveColor(host, '--chart-tertiary'),
        outline: resolveColor(host, '--chart-outline'),
        surface: resolveColor(host, '--chart-surface'),
        fontFamily: getComputedStyle(host).fontFamily,
    };
}

export function buildLineChartOption(
    dates: string[],
    doneValues: number[],
    plannedValues: number[],
    theme: ChartTheme,
    labels: {done: string; planned: string},
): EChartsOption {
    return {
        backgroundColor: 'transparent',
        textStyle: {color: theme.text, fontFamily: theme.fontFamily},
        grid: {left: 16, right: 16, top: 24, bottom: 24, containLabel: true},
        tooltip: {
            trigger: 'axis',
            backgroundColor: theme.surface,
            borderColor: theme.outline,
            textStyle: {color: theme.text, fontFamily: theme.fontFamily},
        },
        xAxis: {
            type: 'category',
            data: dates,
            axisLine: {lineStyle: {color: theme.outline}},
            axisTick: {lineStyle: {color: theme.outline}},
            axisLabel: {color: theme.muted, fontFamily: theme.fontFamily},
        },
        yAxis: {
            type: 'value',
            splitLine: {lineStyle: {color: theme.outline}},
            axisLine: {lineStyle: {color: theme.outline}},
            axisTick: {lineStyle: {color: theme.outline}},
            axisLabel: {color: theme.muted, fontFamily: theme.fontFamily},
        },
        series: [
            {
                name: labels.done,
                data: doneValues,
                type: 'line',
                smooth: true,
                itemStyle: {color: theme.primary},
                lineStyle: {color: theme.primary, width: 2.5},
                symbol: 'circle',
                symbolSize: 6,
                areaStyle: {color: theme.primary, opacity: 0.12},
            },
            {
                name: labels.planned,
                data: plannedValues,
                type: 'line',
                smooth: true,
                itemStyle: {color: theme.tertiary},
                lineStyle: {color: theme.tertiary, width: 2, type: 'dashed'},
                symbol: 'circle',
                symbolSize: 5,
            },
        ],
    };
}

function resolveColor(host: HTMLElement, variable: string): string {
    const probe = document.createElement('span');
    probe.style.color = `var(${variable})`;
    host.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}
