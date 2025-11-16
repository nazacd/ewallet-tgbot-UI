# Quick Start Guide

Get the E-Wallet bot running in 5 minutes!

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Telegram Bot Token from [@BotFather](https://t.me/botfather)
- ✅ OpenAI API Key
- ✅ Go Core API running (see CORE_API_SPEC.md)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
API_BASE_URL=http://localhost:8080/api
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

## Step 3: Ensure Core API is Running

Your Go Core API should be running on `http://localhost:8080`

Test it:
```bash
curl http://localhost:8080/api/categories
```

Should return categories list.

## Step 4: Start the Bot

Development mode (auto-reload):
```bash
npm run dev
```

You should see:
```
✅ Bot started successfully!
📡 API Base URL: http://localhost:8080/api
```

## Step 5: Test the Bot

1. Open Telegram
2. Search for your bot: `@your_bot_username`
3. Send `/start`
4. Follow onboarding to create first account
5. Try adding a transaction: "Coffee 5000"

## Common Issues

### Bot not responding
- Check bot token is correct
- Check bot is running (look for "Bot started successfully!")
- Make sure bot is not running in another terminal

### API errors
- Verify Core API is running: `curl http://localhost:8080/api/categories`
- Check API_BASE_URL in `.env` matches Core API address
- Check Core API logs for errors

### Transaction parsing fails
- Verify OPENAI_API_KEY is correct
- Check OpenAI account has credits
- Look at bot console for error messages

### "Authentication expired" errors
- JWT token expired (happens after 30 days)
- Just send any command - bot will re-authenticate automatically

## Production Deployment

### Build for production:
```bash
npm run build
```

### Run production build:
```bash
npm start
```

### Using PM2 (recommended):
```bash
npm install -g pm2
pm2 start dist/index.js --name e-wallet-bot
pm2 save
pm2 startup
```

### Environment variables for production:
```env
BOT_TOKEN=your_production_bot_token
API_BASE_URL=https://api.yourapp.com/api
OPENAI_API_KEY=your_openai_key
```

## Example Transaction Inputs

Once bot is running, try these:

```
Coffee 5000
Lunch with colleagues 25000
Taxi yesterday 15000
Got salary 5000000
Grocery shopping 50000
Paid rent 2000000
```

## Commands Reference

- `/start` - Initialize bot / Create first account
- `/balance` - Check balances
- `/history` - View recent transactions
- `/accounts` - Manage accounts
- `/help` - Show help

## Next Steps

- [ ] Add more categories in Core API
- [ ] Implement voice message support
- [ ] Add transaction editing
- [ ] Set up budget tracking
- [ ] Configure backup/export

## Need Help?

- Check `README.md` for detailed documentation
- Check `CORE_API_SPEC.md` for API requirements
- Review bot console logs for errors
- Check Core API logs for backend issues

---

Happy tracking! 💰
