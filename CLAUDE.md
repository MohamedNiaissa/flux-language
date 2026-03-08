# CLAUDE.md — Express.js Project Rules

## Project Overview
This is an Express.js REST API project. Follow these rules strictly to keep the codebase clean, consistent, and maintainable.

---

## 🧠 Core Philosophy

- **KISS** — Keep It Simple, Stupid. Prefer the simplest solution that works. No over-engineering.
- **DRY** — Don't Repeat Yourself. Extract shared logic into middleware or helpers.
- **Fail Fast** — Validate early, return errors immediately, never let bad data propagate.
- **Explicit over Implicit** — Code should be readable without needing to trace execution.

---

## 📁 Project Structure

```
src/
├── app.js              # Express app setup (no server.listen here)
├── server.js           # Entry point — binds app to port
├── config/
│   └── index.js        # All env vars in one place
├── routes/
│   └── v1/             # Versioned route files (one file per resource)
├── controllers/        # Request handling logic only — no business logic
├── services/           # Business logic — pure functions where possible
├── middlewares/        # Custom Express middleware
├── models/             # Data models / DB schemas
├── utils/              # Shared helpers (no side effects)
└── tests/              # Mirrors src/ structure
```

**Rules:**
- Never put business logic in routes or controllers.
- Never put HTTP logic (req/res) in services.
- `app.js` sets up middleware and routes. `server.js` starts the server.

---

## 🔧 Express Conventions

### Routing
- Use `express.Router()` — one file per resource (e.g., `routes/v1/users.js`).
- Name routes after resources, not actions: `/users`, not `/getUsers`.
- Use HTTP verbs correctly: `GET` read, `POST` create, `PUT/PATCH` update, `DELETE` remove.
- Always version the API: `/api/v1/...`
- Keep route files thin — delegate immediately to a controller.

```js
// ✅ Good
router.get('/:id', userController.getById);

// ❌ Bad — logic in route file
router.get('/:id', async (req, res) => {
  const user = await db.query(...);
  res.json(user);
});
```

### Controllers
- One controller per resource.
- Only handle: extract params → call service → send response.
- Always use `next(err)` to forward errors — never try/catch silently.

```js
// ✅ Good
async function getById(req, res, next) {
  try {
    const user = await userService.findById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
```

### Services
- Pure business logic — no `req`, `res`, or `next`.
- Return data or throw errors — never send HTTP responses.
- Should be independently testable.

### Middleware
- Keep middleware focused on a single concern.
- Always call `next()` or send a response — never both, never neither.
- Order matters in `app.js` — be intentional.

---

## ⚠️ Error Handling

- **Always** use a centralized error-handling middleware (4 args: `err, req, res, next`).
- Place it last in `app.js`.
- Use a consistent error response shape:

```json
{
  "status": "error",
  "message": "Resource not found",
  "code": 404
}
```

- Create a custom `AppError` class for operational errors.
- Never expose stack traces in production (`NODE_ENV === 'production'`).

```js
// middlewares/errorHandler.js
function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  res.status(status).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
```

---

## 🔐 Security Basics

Always include these in `app.js`:
- `helmet()` — sets secure HTTP headers
- `express.json({ limit: '10kb' })` — prevent payload bloat
- `cors()` — configure explicitly, never `*` in production
- Rate limiting on public routes (`express-rate-limit`)
- Sanitize user input — never pass raw `req.body` to the DB

---

## ✅ Validation

- Validate all inputs at the route/controller boundary before they reach the service.
- Use a library like `zod` or `joi` — never write manual validation chains.
- Return `400` with clear messages for validation failures.

```js
// ✅ Good — validate at entry
const schema = z.object({ email: z.string().email(), age: z.number().min(0) });
const result = schema.safeParse(req.body);
if (!result.success) return res.status(400).json({ errors: result.error.flatten() });
```

---

## 🌿 Environment & Config

- All config comes from environment variables — never hardcode secrets.
- Load and validate env vars in `config/index.js` at startup. Fail fast if required vars are missing.
- Use `.env` for local dev, never commit it.

```js
// config/index.js
const config = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
};

if (!config.dbUrl || !config.jwtSecret) {
  throw new Error('Missing required environment variables');
}

module.exports = config;
```

---

## 📦 Dependencies

- Prefer fewer, well-maintained dependencies over many small ones.
- Don't add a package for something that can be done cleanly in 5 lines of native JS.
- Keep `devDependencies` and `dependencies` correctly separated in `package.json`.

**Recommended stack:**
| Purpose | Package |
|---|---|
| Framework | `express` |
| Security headers | `helmet` |
| CORS | `cors` |
| Rate limiting | `express-rate-limit` |
| Validation | `zod` or `joi` |
| Env vars | `dotenv` |
| Logging | `morgan` (dev) + `winston` (prod) |
| Testing | `jest` + `supertest` |

---

## 🧪 Testing

- Every route should have at least one integration test using `supertest`.
- Unit test services independently — no HTTP layer needed.
- Test file mirrors source: `tests/services/user.service.test.js`.
- Always test: happy path, missing fields, invalid data, not found (404), unauthorized (401).

---

## 🪵 Logging

- Never use `console.log` in production code.
- Use `morgan` for HTTP request logging in development.
- Use `winston` for application-level logging with levels: `error`, `warn`, `info`, `debug`.
- Log errors with context (`userId`, `route`, `method`) — never log sensitive data (passwords, tokens).

---

## 🔁 Async Patterns

- Always use `async/await` — no raw Promise chains or callbacks.
- Always wrap async route handlers in try/catch and forward to `next(err)`.
- Consider a wrapper utility to avoid repeating try/catch:

```js
// utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = asyncHandler;
```

---

## 🚫 Things to Avoid

- ❌ Business logic in route handlers
- ❌ `req`/`res` objects passed into services
- ❌ Hardcoded secrets or URLs
- ❌ Unhandled promise rejections
- ❌ `console.log` as a logging strategy
- ❌ Installing a package to solve a trivial problem
- ❌ Deeply nested callbacks or promise chains
- ❌ Returning different response shapes for the same endpoint

---

## ⚡ Efficiency Guidelines for Claude Code

- **Read before writing** — always check existing files in the relevant folder before creating new ones.
- **Reuse before creating** — check `utils/`, `middlewares/`, and `services/` for existing helpers.
- **Consistent naming** — `camelCase` for variables/functions, `PascalCase` for classes, `kebab-case` for filenames.
- **Don't change what works** — if a pattern already exists in the codebase, follow it even if you'd prefer another approach.
- **Minimal diffs** — change only what is necessary. Don't reformat unrelated code.
- **Ask before refactoring** — don't restructure existing modules unless explicitly asked.
