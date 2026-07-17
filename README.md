# Orders API

A simple Express.js + MySQL backend for creating and fetching orders, built as part of a backend assessment task.

## Tech Stack
- Node.js + Express.js
- MySQL (using the `mysql2` package)
- Postman for testing

## Project Structure
```
orders-api/
├── config/
│   └── db.js          # MySQL connection pool
├── routes/
│   ├── orders.js       # POST /api/orders, GET /api/orders/:id
│   └── users.js        # POST /api/users/validate
├── schema.sql          # database + table creation script
├── server.js            # app entry point
├── .env.example
└── package.json
```

## Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create the database**
   Open MySQL and run the schema file:
   ```bash
   mysql -u root -p < schema.sql
   ```
   This creates the `orders_db` database along with the `users`, `orders`, and `order_items` tables.

3. **Set up environment variables**
   Copy `.env.example` to `.env` and fill in your MySQL credentials:
   ```bash
   cp .env.example .env
   ```

4. **Run the server**
   ```bash
   npm start
   ```
   Server runs at `http://localhost:3000`

## API Endpoints

### 1. Create Order — `POST /api/orders`

Creates a user (or reuses an existing one by email/mobile) and creates an order with items, all inside a single database transaction.

**Request body:**
```json
{
  "user": {
    "full_name": "Rahul Sharma",
    "email": "rahul@test.com",
    "mobile": "9876543210"
  },
  "order": {
    "order_date": "2026-07-06",
    "items": [
      { "product_name": "Laptop", "quantity": 1, "price": 55000 },
      { "product_name": "Mouse", "quantity": 2, "price": 700 }
    ]
  }
}
```

**Response (201 Created):**
```json
{
  "message": "Order created successfully",
  "order_id": 1,
  "user_id": 1,
  "total_amount": 56400,
  "item_count": 2
}
```

**Validation rules:**
- `full_name`, `email`, `mobile`, `order_date`, and at least one item are required
- Email must be a valid format
- Mobile must be exactly 10 digits
- Duplicate product names within the same order are rejected
- If a user with the same email already exists, that user is reused instead of creating a duplicate
- `total_amount` is always calculated on the server from item quantity × price — never trusted from the client
- If anything fails midway, the whole transaction is rolled back (no partial data is saved)

---

### 2. Get Order — `GET /api/orders/:id`

Returns the order, user, and items as nested JSON.

**Example:** `GET /api/orders/1`

**Response (200 OK):**
```json
{
  "user": {
    "user_id": 1,
    "full_name": "Rahul Sharma",
    "email": "rahul@test.com",
    "mobile": "9876543210",
    "status": "Active"
  },
  "order": {
    "order_id": 1,
    "order_date": "2026-07-06",
    "total_amount": "56400.00"
  },
  "items": [
    { "item_id": 1, "product_name": "Laptop", "quantity": 1, "price": "55000.00" },
    { "item_id": 2, "product_name": "Mouse", "quantity": 2, "price": "700.00" }
  ]
}
```

Returns `404` if the order doesn't exist.

---

### 3. Validate User — `POST /api/users/validate`

Checks whether an email/mobile combination is valid and available.

**Request body:**
```json
{
  "email": "rahul@test.com",
  "mobile": "9876543210"
}
```

**Possible responses:**
| Case | Status Code | Response |
|---|---|---|
| Email/mobile available | 200 | `{ "valid": true, "message": "Email and mobile are available" }` |
| Existing user, status Active | 200 | `{ "valid": true, "message": "User is valid and active" }` |
| Existing user, status Inactive | 403 | `{ "valid": false, "error": "User account is Inactive" }` |
| Email already used by someone else | 409 | `{ "valid": false, "error": "Email is already in use" }` |
| Mobile already used by someone else | 409 | `{ "valid": false, "error": "Mobile number is already in use" }` |
| Invalid email format | 400 | `{ "error": "Invalid email format" }` |
| Invalid mobile format | 400 | `{ "error": "Mobile number must be exactly 10 digits" }` |

## Testing with Postman

1. Import the endpoints above as requests into Postman (or create a new collection).
2. Set the base URL to `http://localhost:3000`.
3. For POST requests, set the body type to `raw` → `JSON`.
4. Test the flow in order: create an order first, then fetch it by the returned `order_id`, then try validating a duplicate user.

## Notes on Design Decisions
- Used a MySQL connection **pool** instead of a single connection, so the app can handle multiple requests at once.
- Used a **transaction** for order creation (`beginTransaction` / `commit` / `rollback`) so that a failure at any step (user insert, order insert, or item insert) doesn't leave partial data in the database.
- Validation is done manually with regex instead of a library like Joi, to keep the logic easy to read and explain.
- The flat SQL join result in `GET /api/orders/:id` is manually reshaped into nested JSON in code, since MySQL returns one row per item.
