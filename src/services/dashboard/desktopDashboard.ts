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
    displayValue = (amount / 1_000).toFixed(2) + 'K';
  } else {
    displayValue = amount.toFixed(2);
  }

  return `${displayValue} ${currency}`;
}

export async function generateDesktopDashboard(data: DashboardData): Promise<Buffer> {
  const expImg = data.expensesChart ? data.expensesChart.toString('base64') : null;
  const incImg = data.incomeChart ? data.incomeChart.toString('base64') : null;

  const html = `
  <html>
  <head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1920px;
        height: 1080px;
        font-family: 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        background: #f0f2f5;
        padding: 30px;
        color: #2C3E50;
      }

      .container {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 30px;
      }

      .header {
        background: white;
        border-radius: 20px;
        padding: 20px 32px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      }

      .header-title h1 {
        font-size: 32px;
        font-weight: 800;
        color: #2C3E50;
        margin-bottom: 5px;
      }

      .header-subtitle {
        font-size: 18px;
        color: #7F8C8D;
        font-weight: 500;
      }

      .stats-summary {
        display: flex;
        gap: 40px;
      }

      .summary-item {
        text-align: right;
      }

      .summary-label {
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #95A5A6;
        font-weight: 700;
        margin-bottom: 5px;
      }

      .summary-value {
        font-size: 28px;
        font-weight: 800;
        color: #2C3E50;
      }

      .summary-value.expense { color: #E74C3C; }
      .summary-value.income { color: #27AE60; }

      .content-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        flex: 1;
        min-height: 0; /* allows flex item to shrink properly */
      }

      .card {
        background: white;
        border-radius: 24px;
        padding: 24px;
        box-shadow: 0 4px 25px rgba(0,0,0,0.05);
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
      }

      .card-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
      }

      .card-title {
        font-size: 24px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .card-title.expense { color: #E74C3C; }
      .card-title.income { color: #27AE60; }

      .card-total {
        font-size: 28px;
        font-weight: 800;
      }

      .icon-bg {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }

      .icon-bg.expense { background: #FDEDEC; }
      .icon-bg.income { background: #EAFAF1; }

      .chart-container {
        flex: 1;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 10px 20px;
      }

      .chart-container img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .chart-container img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .no-data {
        color: #BDC3C7;
        font-size: 24px;
        font-weight: 500;
      }

    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="header-title">
          <h1>Финансовый дашборд</h1>
          <div class="header-subtitle">
            ${data.period ? data.period : 'Весь период'} ${data.accountName ? ' | ' + data.accountName : ''}
          </div>
        </div>
        <div class="stats-summary">
            <div class="summary-item">
                <div class="summary-label">Расходы</div>
                <div class="summary-value expense">${formatAmount(data.totalExpense, data.currencyCode)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Доходы</div>
                <div class="summary-value income">${formatAmount(data.totalIncome, data.currencyCode)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Баланс</div>
                <div class="summary-value">${formatAmount(data.totalIncome - data.totalExpense, data.currencyCode)}</div>
            </div>
        </div>
      </div>

      <div class="content-grid">
        <!-- Expenses Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title expense">
                <div class="icon-bg expense">💸</div>
                Расходы
            </div>
            <div class="card-total">${formatAmount(data.totalExpense, data.currencyCode)}</div>
          </div>
          <div class="chart-container">
            ${expImg ? `<img src="data:image/png;base64,${expImg}"/>` : '<div class="no-data">Нет данных</div>'}
          </div>
        </div>

        <!-- Income Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title income">
                 <div class="icon-bg income">💰</div>
                Доходы
            </div>
            <div class="card-total">${formatAmount(data.totalIncome, data.currencyCode)}</div>
          </div>
          <div class="chart-container">
            ${incImg ? `<img src="data:image/png;base64,${incImg}"/>` : '<div class="no-data">Нет данных</div>'}
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>`;

  return (await nodeHtmlToImage({
    html,
    type: 'png',
    encoding: 'binary',
    quality: 100,
    puppeteerArgs: {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
      defaultViewport: { width: 1920, height: 1080 },
    },
  })) as Buffer;
}
