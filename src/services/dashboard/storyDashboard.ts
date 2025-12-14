// services/dashboard/storyDashboard.ts
import nodeHtmlToImage from 'node-html-to-image';
import { BotContext, DashboardData } from '../../core/types';

function formatAmount(amount: number, currency: string): string {
  const absAmount = Math.abs(amount);
  let displayValue: string;

  if (absAmount >= 1_000_000_000) {
    displayValue = (amount / 1_000_000_000).toFixed(2) + 'B';
  } else if (absAmount >= 10_000_000) {
    // Only use M for values >= 10M to avoid "0.2M"
    displayValue = (amount / 1_000_000).toFixed(2) + 'M';
  } else if (absAmount >= 1_000) {
    displayValue = (amount / 1_000).toFixed(1) + 'K';
  } else {
    displayValue = amount.toFixed(2);
  }

  return `${displayValue} ${currency}`;
}

export async function generateStoryDashboard(data: DashboardData): Promise<Buffer> {
  const expImg = data.expensesChart ? data.expensesChart.toString('base64') : null;
  const incImg = data.incomeChart ? data.incomeChart.toString('base64') : null;

  const html = `
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1080px;
        min-height: 1920px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px;
      }

      .container {
        background: white;
        border-radius: 32px;
        padding: 50px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }

      .header {
        text-align: center;
        margin-bottom: 40px;
      }

      .header h1 {
        font-size: 56px;
        font-weight: 800;
        color: #2C3E50;
        margin-bottom: 12px;
      }

      .period {
        font-size: 32px;
        color: #7F8C8D;
        font-weight: 500;
      }

      .account-name {
        font-size: 28px;
        color: #95A5A6;
        margin-top: 8px;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 30px;
        margin-bottom: 50px;
      }

      .stat-card {
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        border-radius: 20px;
        padding: 35px;
        text-align: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      }

      .stat-card.expense {
        background: linear-gradient(135deg, #FFE5E5 0%, #FFCCCC 100%);
      }

      .stat-card.income {
        background: linear-gradient(135deg, #E5F9E5 0%, #CCF2CC 100%);
      }

      .stat-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }

      .stat-label {
        font-size: 22px;
        color: #7F8C8D;
        font-weight: 600;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .stat-value {
        font-size: 36px;
        font-weight: 800;
        color: #2C3E50;
      }

      .chart-section {
        margin-bottom: 40px;
      }

      .chart-section:last-child {
        margin-bottom: 0;
      }

      .chart-section img {
        width: 100%;
        border-radius: 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      }

      .no-data {
        text-align: center;
        padding: 60px;
        color: #95A5A6;
        font-size: 28px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📊 Финансовый отчёт</h1>
        ${data.period ? `<div class="period">${data.period}</div>` : ''}
        ${data.accountName ? `<div class="account-name">${data.accountName}</div>` : ''}
      </div>

      <div class="stats-grid">
        <div class="stat-card expense">
          <div class="stat-icon">💸</div>
          <div class="stat-label">Расходы</div>
          <div class="stat-value">${formatAmount(data.totalExpense, data.currencyCode)}</div>
        </div>

        <div class="stat-card income">
          <div class="stat-icon">💰</div>
          <div class="stat-label">Доходы</div>
          <div class="stat-value">${formatAmount(data.totalIncome, data.currencyCode)}</div>
        </div>
      </div>

      ${
        expImg
          ? `
      <div class="chart-section">
        <img src="data:image/png;base64,${expImg}"/>
      </div>
      `
          : ''
      }

      ${
        incImg
          ? `
      <div class="chart-section">
        <img src="data:image/png;base64,${incImg}"/>
      </div>
      `
          : ''
      }

      ${!expImg && !incImg ? '<div class="no-data">Нет данных для отображения</div>' : ''}
    </div>
  </body>
  </html>`;

  return (await nodeHtmlToImage({
    html,
    type: 'png',
    encoding: 'binary',
    quality: 100,
    puppeteerArgs: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  })) as Buffer;
}
