// services/charts/barChart.ts
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components and plugins
Chart.register(...registerables, ChartDataLabels);

const WIDTH = 1000;
const HEIGHT = 600;

export interface BarChartOptions {
  backgroundColor?: string;
  borderColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
}

export async function renderBarChart(
  labels: string[],
  values: number[],
  title: string,
  options?: BarChartOptions
): Promise<Buffer> {
  const chart = new ChartJSNodeCanvas({
    width: WIDTH,
    height: HEIGHT,
    backgroundColour: 'white',
  });

  // Determine color scheme
  const isExpense = title.toLowerCase().includes('расход');
  const defaultGradientStart = isExpense ? '#FF6B6B' : '#51CF66';
  const defaultGradientEnd = isExpense ? '#EE5A6F' : '#37B24D';

  const gradientStart = options?.gradientStart || defaultGradientStart;
  const gradientEnd = options?.gradientEnd || defaultGradientEnd;

  // Calculate scaling for large numbers (K/M/B suffixes)
  // Use smarter thresholds to maintain precision
  const maxVal = Math.max(...values, 1);
  let scale = 1;
  let suffix = '';

  if (maxVal >= 1_000_000_000) {
    scale = 1_000_000_000;
    suffix = 'B';
  } else if (maxVal >= 10_000_000) {
    // Only use M for values >= 10M to avoid "0.2M"
    scale = 1_000_000;
    suffix = 'M';
  } else if (maxVal >= 1_000) {
    scale = 1_000;
    suffix = 'K';
  }

  const scaledValues = values.map(v => v / scale);

  const config = {
    type: 'bar' as const,
    data: {
      labels,
      datasets: [
        {
          label: title,
          data: scaledValues,
          backgroundColor: gradientStart,
          borderRadius: 12,
          maxBarThickness: 70,
          barThickness: 'flex' as const,
        },
      ],
    },
    options: {
      indexAxis: 'y' as const,
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: 2,
      layout: {
        padding: {
          top: 20,
          bottom: 20,
          left: 10,
          right: 60,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: title,
          font: {
            size: 24,
            weight: 'bold' as const,
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          },
          padding: {
            top: 10,
            bottom: 20,
          },
          color: '#2C3E50',
        },
        datalabels: {
          anchor: 'end' as const,
          align: 'right' as const,
          clamp: true,
          offset: 6,
          color: '#2C3E50',
          font: {
            size: 13,
            weight: 'bold' as const,
          },
          formatter: (value: number) => {
            if (value === 0) return '';
            return value.toFixed(1) + suffix;
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 12,
            },
            color: '#7F8C8D',
            callback: function(value: any) {
              return value + suffix;
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.06)',
            drawBorder: false,
          },
        },
        y: {
          ticks: {
            font: {
              size: 14,
              weight: 'bold' as const,
            },
            color: '#2C3E50',
            autoSkip: false,
            padding: 8,
          },
          grid: {
            display: false},
        },
      },
    },
    plugins: [{
      id: 'customCanvasBackgroundColor',
      beforeDraw: (chart: any) => {
        const ctx = chart.canvas.getContext('2d');
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
      }
    }],
  };

  return await chart.renderToBuffer(config as any);
}
