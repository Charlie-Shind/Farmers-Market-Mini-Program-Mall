# Farm Backend

NestJS backend for the farm project.

This repository is currently a scaffolded but working backend skeleton. The app already has:

- global config loading
- Prisma integration
- JWT-based auth plumbing
- public and protected route conventions
- centralized response and error handling
- a seeded demo-data service for app/admin pages

## Tech Stack

- NestJS 11
- Prisma 7
- PostgreSQL
- Passport JWT
- `class-validator` / `class-transformer`

## Startup

```bash
npm install
npm run prisma:generate
npm run start:clean
```

Default local server:

```bash
http://localhost:6002
```

All HTTP routes use the global prefix:

```bash
/api
```

If you already have a fresh `dist/` output, you can also use:

```bash
npm run build
npm run start
```

If the build cache ever gets stale, run:

```bash
npm run clean
```

## Environment

The app reads environment variables from:

- `.env.local`
- `.env`

Main variables:

```env
PORT=6002
NODE_ENV=development
DATABASE_URL=postgresql://farm:farm123456@localhost:6001/farm?schema=public
REDIS_URL=redis://:redis123456@localhost:6003
JWT_SECRET=replace-me-with-a-long-random-secret
JWT_ACCESS_EXPIRES_IN=7d
JWT_GUEST_EXPIRES_IN=7d
```

## Project Structure

- `src/main.ts` bootstraps the Nest app and registers global pipes, filters, and the API prefix
- `src/app.module.ts` composes the top-level modules
- `src/common` contains shared filters, guards, decorators, interceptors, types, and Prisma wiring
- `src/modules/identity` contains auth, user, and role related modules
- `src/modules/business` contains app-facing and admin-facing business domains
- `prisma/schema.prisma` defines the database schema
- `prisma.config.ts` wires Prisma to `.env.local` and `.env`

## Request Flow

The entry point is `src/main.ts`:

1. `NestFactory.create(AppModule)` creates the application
2. `app.setGlobalPrefix('api')` adds `/api` to every route
3. `app.enableCors(...)` allows browser clients
4. `ValidationPipe` validates and transforms request bodies and query params
5. `HttpExceptionFilter` normalizes error responses
6. `app.listen(PORT)` starts the server

## Global Infrastructure

### Response Wrapping

`src/common/interceptors/response.interceptor.ts` wraps successful responses into a standard envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "path": "/api/app/products",
  "timestamp": "2026-06-08T10:00:00.000Z",
  "data": {}
}
```

### Error Formatting

`src/common/filters/http-exception.filter.ts` converts thrown errors into a standard error envelope:

```json
{
  "success": false,
  "statusCode": 401,
  "path": "/api/identity/auth/me",
  "timestamp": "2026-06-08T10:00:00.000Z",
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### Authentication and Roles

Global guards are registered in `src/common/common.module.ts`:

- `JwtAuthGuard`
- `RolesGuard`

Route-level decorators:

- `@Public()` marks a route as open
- `@Roles(...)` restricts a route to specific roles
- `@CurrentUser()` reads the decoded JWT user from the request

User roles:

- `USER`
- `MERCHANT`
- `ADMIN`
- `GUEST` for anonymous sessions

Token types:

- `guest`
- `access`

## Identity Module

`src/modules/identity` is the auth base of the project.

### Auth Endpoints

- `GET /api/identity/auth/status`
- `GET /api/identity/auth/anonymous`
- `GET /api/identity/auth/me`

### Behavior

- `status` returns module status information
- `anonymous` issues a guest JWT
- `me` returns the current decoded user and checks whether the current role is `GUEST`

### JWT Strategy

`src/modules/identity/auth/jwt.strategy.ts` reads Bearer tokens from the request header and normalizes the JWT payload into:

```ts
{
  sub: string;
  role: RoleCode;
  tokenType: TokenType;
}
```

## Business Module

`src/modules/business` contains the app and admin business areas.

### App-facing routes

- `GET /api/app/categories`
- `GET /api/app/products`
- `GET /api/app/products/:productId`
- `POST /api/app/products/:productId/favorite`
- `DELETE /api/app/products/:productId/favorite`
- `POST /api/app/cart/items`
- `GET /api/app/cart`
- `PATCH /api/app/cart/items/:cartId`
- `DELETE /api/app/cart/items/:cartId`
- `POST /api/app/orders/preview`
- `POST /api/app/orders`
- `GET /api/app/orders`
- `GET /api/app/orders/:orderNo`
- `POST /api/app/orders/:orderNo/cancel`
- `POST /api/app/orders/:orderNo/confirm`
- `POST /api/app/payments/wechat`
- `POST /api/payments/wechat/callback`
- `POST /api/app/refunds`
- `GET /api/app/coupons`
- `POST /api/app/coupons/:couponId/receive`
- `GET /api/app/points/logs`
- `POST /api/app/leaders/apply`
- `POST /api/app/leaders/:leaderId/bind`
- `GET /api/leader/commissions`

### Merchant routes

- `POST /api/merchant/apply`
- `POST /api/merchant/products`
- `PATCH /api/merchant/products/:productId/status`
- `PATCH /api/merchant/skus/:skuId/stock`
- `GET /api/merchant/orders`
- `POST /api/merchant/orders/:orderNo/accept`
- `POST /api/merchant/orders/:orderNo/ship`
- `POST /api/merchant/refunds/:refundNo/process`
- `GET /api/merchant/wallet`
- `POST /api/merchant/withdraws`

### Admin routes

- `POST /api/admin/auth/login`
- `POST /api/admin/merchants/:merchantId/audit`
- `POST /api/admin/products/:productId/audit`
- `GET /api/admin/users`
- `GET /api/admin/merchants`
- `GET /api/admin/products`
- `GET /api/admin/activities`
- `GET /api/admin/banners`
- `POST /api/admin/banners`
- `POST /api/admin/activities`
- `GET /api/admin/orders`
- `GET /api/admin/refunds`
- `GET /api/admin/logistics`
- `GET /api/admin/settings`
- `GET /api/admin/logs`
- `POST /api/admin/refunds/:refundNo/arbitrate`
- `GET /api/admin/dashboard/overview`
- `GET /api/admin/dashboard/sales`
- `GET /api/admin/dashboard/hot-products`
- `GET /api/admin/dashboard/origin-sales`

### File Upload

- `POST /api/files/upload`

## Data Layer

`src/common/prisma/prisma.service.ts` extends `PrismaClient` and connects/disconnects on app lifecycle hooks.

`src/common/prisma/prisma.module.ts` makes the Prisma service available application-wide.

`prisma/schema.prisma` is the source of truth for database models.

## Seeded Demo Data

`src/common/services/platform-data.service.ts` is the main demo data provider.

It currently:

- seeds categories, users, merchants, products, skus, images, videos, traces, and admin users
- provides list/detail methods for app and admin pages
- creates mock order/payment/merchant/refund actions
- returns fallback scaffold data when a real record is not present

This service is the core reason the project can already return realistic API payloads even before the full domain layer is completed.

## Current Development Model

The repository is organized around two ideas:

1. **Infrastructure first**
   - auth
   - guards
   - interceptors
   - error formatting
   - Prisma

2. **Business scaffolding second**
   - app-facing product/cart/order/payment flows
   - merchant operations
   - admin operations

That means the codebase is already useful as an API shell, but many domain actions are still implemented as mock or scaffold logic and should be replaced with real business rules as the project evolves.

## Notes for Contributors

- Keep public routes explicitly marked with `@Public()`
- Put role-sensitive routes behind `@Roles(...)`
- Return data through service methods, not directly from controllers when the logic becomes non-trivial
- Keep database access in Prisma service or dedicated domain services
- Update `prisma/schema.prisma` before adding new persisted entities
