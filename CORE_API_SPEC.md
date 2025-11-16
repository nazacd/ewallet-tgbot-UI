# Core API Implementation Guide

This document specifies what the Go Core API needs to implement for the bot to work.

## Required Endpoints

### 1. Authentication

#### `POST /api/auth/telegram`

**Purpose:** Authenticate user via Telegram data and return JWT token

**Request Body:**
```json
{
  "tg_user_id": 123456789,      // required
  "first_name": "John",          // optional
  "last_name": "Doe",            // optional
  "username": "johndoe",         // optional
  "language_code": "en"          // optional
}
```

**Logic:**
1. Check if user with `tg_user_id` exists
2. If not, create new user with default values:
   - Generate UUID for `id`
   - Set `currency_code` to "USD" (or based on `language_code`)
   - Set `created_at` to current time
3. If exists, optionally update `first_name`, `last_name`, `username`
4. Generate JWT token with:
   - `user_id` (UUID)
   - `tg_user_id` (bigint)
   - Expiration (30 days recommended)
5. Return token and user object

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tg_user_id": 123456789,
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe",
    "language_code": "en",
    "currency_code": "USD",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": null
  }
}
```

---

### 2. User Management

All endpoints require: `Authorization: Bearer <jwt_token>` header

Extract `user_id` from JWT claims for authorization.

#### `GET /api/users/me`

**Purpose:** Get current user's information

**Response:**
```json
{
  "id": "uuid",
  "tg_user_id": 123456789,
  "first_name": "John",
  "currency_code": "USD",
  "language_code": "en",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### `PUT /api/users/me`

**Purpose:** Update user settings

**Request Body:**
```json
{
  "currency_code": "EUR",     // optional
  "language_code": "ru"       // optional
}
```

**Logic:**
1. Validate currency_code (ISO 4217: USD, EUR, UZS, etc.)
2. Validate language_code (ISO 639-1: en, ru, uz, etc.)
3. Update user record
4. Set `updated_at` to current time

---

### 3. Account Management

#### `GET /api/accounts`

**Purpose:** List all accounts for current user

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Cash",
    "balance": 500000,
    "is_default": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": null
  },
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Bank Card",
    "balance": 2500000,
    "is_default": false,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": null
  }
]
```

**Logic:**
- Filter by `user_id` from JWT
- Order by `is_default DESC, created_at ASC`

#### `POST /api/accounts`

**Purpose:** Create new account

**Request Body:**
```json
{
  "name": "Savings",              // required, max 255 chars
  "balance": 1000000,             // optional, default 0
  "currency_code": "USD",         // required
  "is_default": false             // optional, default false
}
```

**Logic:**
1. Validate `name` (non-empty, max 255 chars)
2. Validate `currency_code`
3. Generate UUID for `id`
4. Set `user_id` from JWT
5. If `is_default` is true, set all other accounts' `is_default` to false
6. If this is the user's first account, force `is_default` to true
7. Create account record
8. Return created account

**Response:** Account object (same as GET)

#### `PUT /api/accounts/:id`

**Purpose:** Update account

**Request Body:**
```json
{
  "name": "Updated Name",        // optional
  "is_default": true             // optional
}
```

**Logic:**
1. Verify account belongs to current user (`user_id` from JWT)
2. If `is_default` is true, set all other accounts' `is_default` to false
3. Update account
4. Set `updated_at` to current time

**Note:** Balance is NOT updatable directly - only via transactions

#### `DELETE /api/accounts/:id`

**Purpose:** Delete account and all its transactions

**Logic:**
1. Verify account belongs to current user
2. Prevent deletion if it's the only account (user must have at least 1)
3. If deleting default account, set another account as default
4. Delete all transactions for this account (CASCADE)
5. Delete account
6. Return 204 No Content

---

### 4. Transaction Parsing (AI Integration)

#### `POST /api/transactions/parse`

**Purpose:** Parse natural language text into structured transaction data

**Request Body:**
```json
{
  "text": "Coffee 5000",
  "language_code": "en"        // optional, for better parsing
}
```

**Logic:**
1. Call OpenAI API (or similar) with prompt to extract:
   - Amount (required)
   - Type: "income" or "expense" (default: expense)
   - Category ID (match from predefined categories)
   - Note/description
   - Date/time if mentioned ("yesterday", "last Monday")
2. Calculate confidence score (0.0 - 1.0)
3. Return parsed data

**OpenAI Prompt Example:**
```
Extract transaction information from the following text: "{text}"

Return a JSON object with:
- type: "income" or "expense"
- amount: number (extract from text)
- category: string (choose from: food, transport, shopping, entertainment, salary, other)
- note: string (any additional description)
- date: ISO date if mentioned, otherwise null

Text: "Coffee 5000"
```

**Response:**
```json
{
  "type": "expense",
  "amount": 5000,
  "category_id": 1,              // Mapped from category name
  "note": "Coffee",
  "confidence": 0.95,
  "performed_at": "2025-01-01T10:30:00Z"  // or null for current time
}
```

**Error Response (400):**
```json
{
  "error": "Could not parse transaction from text"
}
```

---

### 5. Transaction Management

#### `POST /api/transactions`

**Purpose:** Create new transaction

**Request Body:**
```json
{
  "account_id": "uuid",          // required
  "category_id": 1,              // optional
  "type": "expense",             // required: "income" or "expense"
  "amount": 5000,                // required, positive integer
  "currency_code": "USD",        // required
  "note": "Coffee",              // optional
  "performed_at": "2025-01-01T10:30:00Z"  // optional, defaults to now
}
```

**Logic:**
1. Verify account belongs to current user
2. Validate amount > 0
3. Validate type is "income" or "expense"
4. Generate UUID for transaction `id`
5. Set `user_id` from JWT
6. Set `status` to "completed" (or appropriate status)
7. Update account balance:
   - If income: `balance = balance + amount`
   - If expense: `balance = balance - amount`
8. Set `created_at` to current time
9. Create transaction record
10. Return created transaction

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "account_id": "uuid",
  "category_id": 1,
  "type": "expense",
  "status": "completed",
  "amount": 5000,
  "currency_code": "USD",
  "note": "Coffee",
  "performed_at": "2025-01-01T10:30:00Z",
  "created_at": "2025-01-01T10:30:05Z"
}
```

#### `GET /api/transactions`

**Purpose:** List transactions with filters

**Query Parameters:**
- `account_id` (uuid, optional)
- `category_id` (int, optional)
- `type` (string, optional): "income" or "expense"
- `from` (ISO date, optional): filter performed_at >= from
- `to` (ISO date, optional): filter performed_at <= to
- `limit` (int, optional, default: 10, max: 100)
- `offset` (int, optional, default: 0)

**Logic:**
1. Filter by `user_id` from JWT
2. Apply all provided filters
3. Order by `performed_at DESC, created_at DESC`
4. Apply pagination

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
    "performed_at": "2025-01-01T10:30:00Z",
    "created_at": "2025-01-01T10:30:05Z"
  }
]
```

#### `PUT /api/transactions/:id`

**Purpose:** Update transaction

**Request Body:** (all optional)
```json
{
  "amount": 6000,
  "category_id": 2,
  "note": "Updated note"
}
```

**Logic:**
1. Verify transaction belongs to current user
2. If amount changed, update account balance accordingly
3. Update transaction fields
4. Return updated transaction

#### `DELETE /api/transactions/:id`

**Purpose:** Delete transaction

**Logic:**
1. Verify transaction belongs to current user
2. Reverse the balance change on the account
3. Delete transaction
4. Return 204 No Content

---

### 6. Categories

#### `GET /api/categories`

**Purpose:** List all predefined categories

**Response:**
```json
[
  { "id": 1, "slug": "food", "position": 1, "name": "Food & Dining" },
  { "id": 2, "slug": "transport", "position": 2, "name": "Transport" },
  { "id": 3, "slug": "groceries", "position": 3, "name": "Groceries" },
  { "id": 4, "slug": "shopping", "position": 4, "name": "Shopping" },
  { "id": 5, "slug": "entertainment", "position": 5, "name": "Entertainment" },
  { "id": 6, "slug": "health", "position": 6, "name": "Health" },
  { "id": 7, "slug": "housing", "position": 7, "name": "Housing" },
  { "id": 8, "slug": "salary", "position": 8, "name": "Salary" },
  { "id": 9, "slug": "other", "position": 9, "name": "Other" }
]
```

**Note:** Categories should be seeded in the database. They're global, not per-user.

---

### 7. Statistics

#### `GET /api/stats/summary`

**Purpose:** Get spending/income summary

**Query Parameters:**
- `from` (ISO date, optional, defaults to start of current month)
- `to` (ISO date, optional, defaults to now)
- `account_id` (uuid, optional)

**Logic:**
1. Filter transactions by user_id, date range, and optional account_id
2. Calculate:
   - Total income (sum where type = "income")
   - Total expense (sum where type = "expense")
   - Balance (income - expense)
   - Breakdown by category

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
    },
    {
      "category_id": 2,
      "name": "Transport",
      "total": 200000
    }
  ]
}
```

---

## JWT Token Specification

**Secret:** Use environment variable `JWT_SECRET`

**Payload:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "tg_user_id": 123456789,
  "exp": 1735689600,  // 30 days from issue
  "iat": 1733097600
}
```

**Verification:**
- Every protected endpoint must verify JWT signature
- Extract `user_id` from claims
- Use `user_id` for authorization (ensure user only accesses their data)

---

## Error Responses

**401 Unauthorized:**
```json
{
  "error": "Invalid or expired token"
}
```

**400 Bad Request:**
```json
{
  "error": "Validation error: amount must be positive"
}
```

**404 Not Found:**
```json
{
  "error": "Account not found"
}
```

**403 Forbidden:**
```json
{
  "error": "You don't have access to this resource"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

## Database Seeding

### Categories
Insert these categories on first migration:

```sql
INSERT INTO categories (id, slug, position, name) VALUES
  (1, 'food', 1, 'Food & Dining'),
  (2, 'transport', 2, 'Transport'),
  (3, 'groceries', 3, 'Groceries'),
  (4, 'shopping', 4, 'Shopping'),
  (5, 'entertainment', 5, 'Entertainment'),
  (6, 'health', 6, 'Health'),
  (7, 'housing', 7, 'Housing'),
  (8, 'salary', 8, 'Salary'),
  (9, 'other', 9, 'Other');
```

---

## Testing Checklist

- [ ] User can authenticate via Telegram
- [ ] User can create first account
- [ ] User can add more accounts
- [ ] User can set default account
- [ ] Transaction parsing works for simple inputs
- [ ] Transactions update account balance correctly
- [ ] User can only access their own data
- [ ] JWT expires after 30 days
- [ ] Categories are returned correctly
- [ ] Stats calculate correctly

---

## OpenAI Integration Example (Go)

```go
type ParseRequest struct {
    Text         string `json:"text"`
    LanguageCode string `json:"language_code"`
}

func parseTransaction(req ParseRequest) (*ParsedTransaction, error) {
    prompt := fmt.Sprintf(`
Extract transaction information from: "%s"

Return ONLY a JSON object (no markdown):
{
  "type": "income" or "expense",
  "amount": number,
  "category": one of: food, transport, groceries, shopping, entertainment, health, housing, salary, other,
  "note": string or null,
  "confidence": 0.0 to 1.0
}
`, req.Text)

    // Call OpenAI API
    response := callOpenAI(prompt)
    
    // Parse response
    var parsed ParsedTransaction
    json.Unmarshal([]byte(response), &parsed)
    
    // Map category name to ID
    parsed.CategoryID = getCategoryIDBySlug(parsed.Category)
    
    return &parsed, nil
}
```

This should give you everything you need to implement the Core API! 🚀
