# E-Wallet Telegram Bot

A Telegram bot for personal finance management with natural language transaction parsing.

## 🚀 Features

- **Natural Language Input**: "Coffee 5000" or "Got salary 5000000"
- **Voice Messages**: (Coming soon) Speak your transactions
- **Multi-Account Support**: Manage multiple wallets/cards
- **AI-Powered Parsing**: Automatic transaction categorization
- **Transaction History**: View and filter past transactions
- **Balance Tracking**: Real-time balance updates
- **Confirmation Flow**: Review before saving

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- OpenAI API Key (for transaction parsing)
- Running Core API (Go service)

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
BOT_TOKEN=your_telegram_bot_token
API_BASE_URL=http://localhost:8080/api
OPENAI_API_KEY=your_openai_api_key
```

### 3. Start the Bot

Development mode (with auto-reload):
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── config/
│   └── env.ts              # Environment configuration
├── handlers/
│   ├── start.handler.ts    # Onboarding & /start
│   ├── transaction.handler.ts  # Transaction parsing & saving
│   ├── balance.handler.ts  # /balance command
│   ├── history.handler.ts  # /history command
│   ├── accounts.handler.ts # /accounts management
│   └── help.handler.ts     # /help command
├── services/
│   ├── auth.service.ts     # JWT token management
│   └── api.client.ts       # Core API communication
├── state/
│   └── state.manager.ts    # Conversation state management
├── types/
│   └── index.ts            # TypeScript type definitions
├── utils/
│   └── format.ts           # Formatting utilities
└── index.ts                # Main bot entry point
```

## 🔌 Core API Contract

The bot expects the following API endpoints from the Core service:

### Authentication

#### POST `/api/auth/telegram`
Authenticate/register user and get JWT token.

**Request:**
```json
{
  "tg_user_id": 123456789,
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe",
  "language_code": "en"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "tg_user_id": 123456789,
    "first_name": "John",
    "currency_code": "USD",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### User Endpoints

All subsequent endpoints require `Authorization: Bearer <token>` header.

#### GET `/api/users/me`
Get current user info.

**Response:**
```json
{
  "id": "uuid",
  "tg_user_id": 123456789,
  "first_name": "John",
  "currency_code": "USD",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### PUT `/api/users/me`
Update user settings.

**Request:**
```json
{
  "currency_code": "EUR",
  "language_code": "ru"
}
```

### Account Endpoints

#### GET `/api/accounts`
List user's accounts.

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Cash",
    "balance": 500000,
    "is_default": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

#### POST `/api/accounts`
Create new account.

**Request:**
```json
{
  "name": "Savings",
  "balance": 1000000,
  "currency_code": "USD",
  "is_default": false
}
```

**Response:** Account object

#### PUT `/api/accounts/:id`
Update account.

**Request:**
```json
{
  "name": "Updated Name",
  "is_default": true
}
```

#### DELETE `/api/accounts/:id`
Delete account and its transactions.

### Transaction Endpoints

#### POST `/api/transactions/parse`
Parse natural language transaction text using AI.

**Request:**
```json
{
  "text": "Coffee 5000",
  "language_code": "en"
}
```

**Response:**
```json
{
  "type": "expense",
  "amount": 5000,
  "category_id": 1,
  "note": "Coffee",
  "confidence": 0.95,
  "performed_at": "2025-01-01T10:30:00Z"
}
```

#### POST `/api/transactions`
Create transaction.

**Request:**
```json
{
  "account_id": "uuid",
  "category_id": 1,
  "type": "expense",
  "amount": 5000,
  "currency_code": "USD",
  "note": "Coffee",
  "performed_at": "2025-01-01T10:30:00Z"
}
```

**Response:** Transaction object

#### GET `/api/transactions`
List transactions with filters.

**Query Parameters:**
- `account_id` (optional)
- `category_id` (optional)
- `type` (optional): "income" | "expense"
- `from` (optional): ISO date
- `to` (optional): ISO date
- `limit` (optional): default 10
- `offset` (optional): default 0

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "account_id": "uuid",
    "category_id": 1,
    "type": "expense",
    "amount": 5000,
    "currency_code": "USD",
    "note": "Coffee",
    "created_at": "2025-01-01T10:30:00Z"
  }
]
```

#### PUT `/api/transactions/:id`
Update transaction.

#### DELETE `/api/transactions/:id`
Delete transaction.

### Category Endpoints

#### GET `/api/categories`
List all predefined categories.

**Response:**
```json
[
  {
    "id": 1,
    "slug": "food",
    "position": 1,
    "name": "Food & Dining"
  }
]
```

### Stats Endpoints

#### GET `/api/stats/summary`
Get statistics summary.

**Query Parameters:**
- `from` (optional): ISO date
- `to` (optional): ISO date
- `account_id` (optional)

**Response:**
```json
{
  "total_income": 5000000,
  "total_expense": 1500000,
  "balance": 3500000,
  "by_category": [
    {
      "category_id": 1,
      "name": "Food & Dining",
      "total": 500000
    }
  ]
}
```

## 🎯 User Flow

### Onboarding
1. User sends `/start`
2. Bot authenticates with Core API
3. If no accounts exist:
   - Ask for account name
   - Ask for currency
   - Ask for initial balance
   - Create account via API
4. Show welcome message with instructions

### Adding Transaction
1. User sends: "Coffee 5000"
2. Bot calls `/api/transactions/parse`
3. Bot shows confirmation with:
   - Amount
   - Category (auto-detected)
   - Account (default)
   - Edit/Confirm/Cancel buttons
4. User confirms
5. Bot calls `/api/transactions` to save
6. Bot shows updated balance

### Managing Accounts
1. User sends `/accounts`
2. Bot lists all accounts with balances
3. User can:
   - Add new account
   - Set default account
   - Delete account
   - View account details

## 🔐 Security

- JWT tokens stored in-memory (per user)
- Tokens auto-cleared on 401 responses
- No sensitive data in logs
- All API calls require authentication

## 🐛 Error Handling

- API errors caught and shown to user
- Expired tokens trigger re-authentication
- Invalid input prompts user with examples
- Network errors handled gracefully

## 📝 Commands

- `/start` - Start bot / Create first account
- `/balance` - Show account balances
- `/history` - View recent transactions
- `/accounts` - Manage accounts
- `/help` - Show help message

## 🚧 TODO / Future Features

- [ ] Voice message support (STT + AI parsing)
- [ ] Transaction editing/deletion
- [ ] Category customization
- [ ] Multi-currency with FX rates
- [ ] Recurring transactions
- [ ] Budget tracking
- [ ] Statistical charts
- [ ] Export data (CSV/PDF)
- [ ] Shared accounts (family mode)

## 📄 License

ISC

## 🤝 Contributing

This bot is designed to work with the E-Wallet Core API (Go service).
Make sure the Core API is running and accessible before starting the bot.

---

**Note:** Remember to get a new bot token from [@BotFather](https://t.me/botfather) if the current one is exposed!
