import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components and plugins
Chart.register(...registerables, ChartDataLabels);

// Более «горизонтальный» формат
const WIDTH = 900;
const HEIGHT = 650;

export interface PieChartOptions {
    backgroundColor?: string[];
    borderColor?: string;
}

const DEFAULT_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71',
    '#F1C40F', '#E74C3C', '#34495E', '#1ABC9C', '#95A5A6',
];

export async function renderPieChart(
    labels: string[],
    values: number[],
    title: string,
    options?: PieChartOptions,
): Promise<Buffer> {
    const chart = new ChartJSNodeCanvas({
        width: WIDTH,
        height: HEIGHT,
        backgroundColour: 'transparent',
    });

    const total = values.reduce((acc, val) => acc + val, 0);

    const config: ChartConfiguration<'pie'> = {
        type: 'pie',
        data: {
            labels,
            datasets: [
                {
                    data: values,
                    backgroundColor:
                        options?.backgroundColor || DEFAULT_COLORS.slice(0, values.length),
                    borderColor: options?.borderColor || '#ffffff',
                    borderWidth: 2,
                },
            ],
        },
        options: {
            responsive: false,           // у нас фиксированный размер канвы
            maintainAspectRatio: false,  // управляем сами
            devicePixelRatio: 2,
            layout: {
                padding: {
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 20,
                },
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'right',       // легенда справа, не снизу
                    align: 'center',
                    labels: {
                        font: {
                            size: 16,
                            family:
                                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        },
                        padding: 12,
                        color: '#2C3E50',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 12,
                    },
                },
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 26,
                        weight: 'bold',
                        family:
                            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    },
                    padding: {
                        top: 0,
                        bottom: 10,
                    },
                    color: '#2C3E50',
                },
                datalabels: {
                    color: '#fff',
                    textStrokeColor: '#333',
                    textStrokeWidth: 2,
                    textShadowBlur: 4,
                    textShadowColor: '#000',
                    font: {
                        size: 18,
                        weight: 'bold',
                    },
                    formatter: (value: number) => {
                        if (value === 0 || !isFinite(value)) return '';
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${percentage}%`;
                    },
                    align: 'center',
                    anchor: 'center',
                    // Вместо 'auto', чтобы ничего не пропадало даже при перекрытии
                    display: (ctx) => {
                        const val = ctx.dataset.data[ctx.dataIndex] as number;
                        return val > 0;
                    },
                    clamp: true,
                    clip: false,
                },
            },
        },
        plugins: [
            {
                id: 'customCanvasBackgroundColor',
                beforeDraw: (c: any) => {
                    const ctx = c.canvas.getContext('2d');
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = 'transparent';
                    ctx.fillRect(0, 0, c.width, c.height);
                    ctx.restore();
                },
            },
        ],
    };

    return await chart.renderToBuffer(config as any);
}
