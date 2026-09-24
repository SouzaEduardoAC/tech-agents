# Knowledge: JavaScript & Node.js — Performance Best Practices & Guardrails

> Applies to: Node.js 20+ & ECMAScript 2023+
> Scope: Backend REST/GraphQL APIs, microservices, background workers, and CLI tools.
> Deployment: Kubernetes cluster, 3–10 replicas, horizontal autoscaling.

---

## 1. Async & Concurrency / Threading / Reactive Execution

### Rules
- **ALWAYS** use `async/await` end-to-end. Never mix callbacks or raw `.then().catch()` chains with `async/await`.
- **ALWAYS** propagate `AbortSignal` through all asynchronous and remote operations (HTTP, DB, stream processing) to enable cooperative cancellation.
- **ALWAYS** handle asynchronous errors using try/catch around `await` expressions or configure proper error boundaries.
- **ALWAYS** run CPU-heavy operations (e.g., cryptography, large image processing, PDF generation) on a Worker Thread (`worker_threads`) or delegate them to external specialized microservices to avoid blocking the single-threaded Event Loop.
- **NEVER** block the Event Loop with synchronous synchronous-blocking library functions (e.g., `fs.readFileSync()`, `crypto.pbkdf2Sync()`, `JSON.parse()` on payloads > 5MB) in hot paths.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| `fs.readFileSync()` or other `*Sync` API in hot paths | Completely halts the Event Loop; blocks all parallel requests on that replica |
| Ignoring unhandled promise rejections | Prompts process crashes under strict Node.js settings or leaks error states silently |
| Sequential `await` calls for independent tasks | Unnecessary latency bottleneck; serializes tasks that could run concurrently |
| Using `Promise.race` without cleaning up resources | Can cause active socket/timer leaks; the losing Promise continues executing silently |
| Creating an infinite loop (`while (true)`) without async yielding | Starves the V8 thread; prevents the IO loop and garbage collection from ever running |

### Correct Patterns

```javascript
// CORRECT — async/await with AbortController for cooperative cancellation
import fs from 'node:fs/promises';

async function fetchOrderAndWriteSummary(orderId, outputPath, signal) {
  // Ensure downstream client/DB supports AbortSignal
  const order = await db.orders.findById(orderId, { signal });
  
  if (signal?.aborted) {
    throw new DOMException('Operation aborted by user', 'AbortError');
  }
  
  const summary = JSON.stringify({ id: order.id, total: order.total });
  await fs.writeFile(outputPath, summary, { signal });
}

// CORRECT — parallel invocation of independent promises
async function getDashboardData(userId, signal) {
  const [profile, orders, notifications] = await Promise.all([
    userRepo.getProfile(userId, { signal }),
    orderRepo.getRecentOrders(userId, { signal }),
    notificationService.getUnread(userId, { signal })
  ]);
  
  return { profile, orders, notifications };
}

// WRONG — blocking the Event Loop with synchronous operations
function processOrderSync(orderId) {
  const data = fs.readFileSync(`/tmp/orders/${orderId}.json`, 'utf8'); // Blocks the whole server!
  return JSON.parse(data);
}

// WRONG — sequential await for independent tasks
async function badDashboardData(userId) {
  const profile = await userRepo.getProfile(userId);           // Waits for profile
  const orders = await orderRepo.getRecentOrders(userId);       // Only then starts orders
  const notifications = await notificationService.getUnread(userId); // Slows response by 3x
  return { profile, orders, notifications };
}
```

---

## 2. Memory & Allocations / Garbage Collection / Optimization

### Rules
- **ALWAYS** use Node.js Streams (`stream/promises`, pipeline) or Async Generators when processing large datasets or parsing big payloads to keep memory usage flat.
- **ALWAYS** allocate buffers using `Buffer.alloc(size)` or reuse them via pooled structures if performance requires. Use `Buffer.allocUnsafe(size)` only when immediately overwriting the data, as it contains raw uninitialized memory.
- **ALWAYS** avoid memory leaks by removing listeners (`emitter.off()`), clearing intervals (`clearInterval`), and dereferencing global caches or circular maps.
- **ALWAYS** utilize `WeakMap` or `WeakSet` when holding references to objects where lifetime is managed externally, preventing premature GC prevention.
- **PREFER** raw objects (`Object.create(null)`) or pre-sized array buffers instead of dynamically resizing arrays inside extremely high-throughput hot paths.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Reading massive files into memory (`fs.readFile`) | Causes V8 heap exhaustion and triggers OS-level Out-of-Memory (OOM) killer |
| Storing request-scoped state or tokens in global arrays/objects | Memory leaks; infinite accumulation of memory over time |
| Frequent instantiation of large transient objects in hot loops | Spams the V8 young generation; forces frequent Stop-The-World scavenges |
| Capturing massive context scopes inside closures | Retains whole scope in memory; prevents the GC from reclaiming unused objects |
| Re-instantiating massive JSON structures from disk repeatedly | Extreme CPU overhead in parsing and high heap allocation |

### Correct Patterns

```javascript
// CORRECT — streaming data processing to keep flat memory profile
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import zlib from 'node:zlib';

async function compressLogFile(sourcePath, destPath) {
  await pipeline(
    fs.createReadStream(sourcePath),
    zlib.createGzip(),
    fs.createWriteStream(destPath)
  );
}

// CORRECT — using WeakMap to prevent memory leaks from caching
const objectMetadataCache = new WeakMap();

function cacheMetadata(obj, metadata) {
  objectMetadataCache.set(obj, metadata); // obj can still be garbage collected normally!
}

// WRONG — holding hard references in global Map indefinitely (Memory Leak)
const globalOrderCache = new Map();

function cacheOrderData(orderId, data) {
  globalOrderCache.set(orderId, data); // Never evicted! Heap grows forever.
}

// WRONG — loading whole huge file into memory at once
async function processHugeFile(filePath) {
  const data = await fs.promises.readFile(filePath); // Forces huge heap spike
  const lines = data.toString().split('\n');
  return lines.map(line => JSON.parse(line));
}
```

---

## 3. Collections & Data Structures / High-Performance Collections

### Rules
- **ALWAYS** use `Map` and `Set` instead of generic objects (`{}`) when keys are dynamic or added/removed frequently; `Map` is highly optimized for runtime changes.
- **ALWAYS** use `Map` and `Set` for O(1) key lookups or existence checks.
- **ALWAYS** use `Object.create(null)` instead of a raw `{}` literal if you must use a plain object as a dictionary, preventing prototype pollution security exploits.
- **PREFER** TypedArrays (`Uint8Array`, `Int32Array`) for large sequences of numbers or raw binary data arrays.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| `Array.prototype.includes` inside loops for lookups | O(n²) complexity; forces full sequential array traversal on every loop |
| Using plain object literals as maps without sanitizing keys | Prototype pollution risk; allows clients to override `__proto__` properties |
| Array manipulation with `slice`/`splice` in highly iterative hot paths | Causes constant allocation and array shifting overhead |
| Sorting large collections repeatedly | O(n log n) overhead; pre-sort or index elements inside a Map structure |

### Correct Patterns

```javascript
// CORRECT — using Set for O(1) membership lookup
const allowedStatusSet = new Set(['active', 'completed', 'verified']);

function isValidStatus(status) {
  return allowedStatusSet.has(status); // O(1) check
}

// CORRECT — using Map for highly dynamic keys and prototype-safe maps
const userSessions = new Map();
userSessions.set(sessionId, sessionData);

// WRONG — O(N) array check inside loop (becomes O(N^2))
const forbiddenUsers = ['user1', 'user2', 'user3', 'user4'];
for (const order of orders) {
  if (forbiddenUsers.includes(order.userId)) { // Sequential scan inside loop!
    flagOrder(order);
  }
}

// WRONG — prototype pollution vulnerable object map
const map = {};
function addToMap(key, value) {
  map[key] = value; // If key is "__proto__", this alters the global Object prototype!
}
```

---

## 4. Database & ORM Integration

### Rules
- **ALWAYS** manage connection pools properly in database drivers (e.g. `pg`, `mysql2`). Specify `max`, `idleTimeoutMillis`, and `connectionTimeoutMillis` explicitly.
- **ALWAYS** use parameterized queries or trusted query builders (e.g., Knex.js, Prisma, pg-promise) to ensure absolute protection against SQL Injection.
- **ALWAYS** batch multiple operations into single insert/update queries or transactional batches instead of invoking queries sequentially inside standard loops.
- **ALWAYS** set explicit transaction timeouts inside your database driver or application logic to prevent deadlocked connections.
- **NEVER** pull unbounded tables into memory; enforce limit, offset, or cursor-based pagination on every query.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| String interpolation in SQL (`pg.query(`SELECT ... WHERE id = ${id}`)`) | SQL Injection vulnerability; critical compliance violation |
| Opening/closing connection per HTTP request | Massive connection establishment overhead; socket exhaustion |
| Database calls inside loops (N+1 query problem) | Slashes API performance by orders of magnitude |
| Uncapped Mongoose/Prisma read queries (`find({})` without limits) | Triggers V8 buffer allocation limits and process crash |
| Running raw SQL schema DDL inside application startup routines | Risk of lock contention and migration drift |

### 4.1 Database Migrations — Knex.js Example

**ALWAYS** manage schema changes through versioned migrations managed by a trusted migrations tool (Knex, Prisma, Sequelize). Direct manual SQL execution outside version control is strictly forbidden.

#### Rules
- **ALWAYS** create migrations using the CLI tool: `knex migrate:make migration_name`.
- **ALWAYS** check both the `up` and `down` functions to ensure schema rollbacks are completely idempotent.
- **ALWAYS** run migration applications using a dedicated build step or a Kubernetes post-deployment/startup Job.
- **NEVER** alter an already committed migration file; write a new migration.

#### Correct Workflow

```javascript
// Migration file: 20260523090000_create_orders_table.js
export function up(knex) {
  return knex.schema.createTable('orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('status', 50).notNullable().index();
    table.decimal('total', 12, 2).notNullable();
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('orders');
}
```

### 4.2 Index Migrations — Manual Idempotent DDL Only

To avoid massive locking on large tables under high scale, indexes must be created concurrently and idempotently.

#### Rules
- **ALWAYS** write PostgreSQL index migrations with the `CONCURRENTLY` directive to prevent locking out writes on the target table during build.
- **ALWAYS** disable transactions on the migration when using concurrent index builds, as relational databases forbid concurrent index operations inside nested transactions.
- **ALWAYS** implement idempotency checks (`CREATE INDEX IF NOT EXISTS`) to prevent crashes during pipeline retries.

#### Correct Pattern

```javascript
// Knex custom concurrent index migration
export const config = { transaction: false }; // Disable default transactions!

export async function up(knex) {
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created 
    ON orders (status, created_at);
  `);
}

export async function down(knex) {
  await knex.raw(`
    DROP INDEX CONCURRENTLY IF EXISTS idx_orders_status_created;
  `);
}
```

---

## 5. HTTP & Remote API Connections / Resilient HTTP Clients

### Rules
- **ALWAYS** use configured HTTP/HTTPS Agents (`http.Agent`/`https.Agent`) with `keepAlive: true` and a dedicated `maxSockets` limit to reuse TCP connections.
- **ALWAYS** configure explicit timeouts (`timeout` property on Axios or `AbortSignal` on native fetch) on every outgoing HTTP request.
- **ALWAYS** configure retry-with-backoff policies using resilience libraries (e.g. `axios-retry`, `opossum` for circuit breakers).
- **ALWAYS** read and parse response streams directly using JSON streaming parsers if payload sizes exceed 5MB.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Undefined timeouts in outgoing HTTP requests | Axios/fetch hangs indefinitely under downstream failures; blocks internal agents |
| Re-instantiating agents or client instances on every request | Triggers rapid socket exhaustion (TIME_WAIT locks on OS) |
| Reading large response payloads into memory | Causes steep memory spikes and GC bottlenecks |
| Ignoring downstream failure signals | Cascading outages; starves application event loop |

### Correct Patterns

```javascript
import axios from 'axios';
import http from 'node:http';
import https from 'node:https';
import axiosRetry from 'axios-retry';

// CORRECT — Shared Axios instance with keepAlive agent, timeouts, and retries
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100 });

export const apiClient = axios.create({
  timeout: 5000, // 5-second hard timeout limit
  httpAgent,
  httpsAgent,
  headers: { 'Content-Type': 'application/json' }
});

// Configure exponential backoff retry policy
axiosRetry(apiClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  }
});

// WRONG — Plain unconfigured Axios request
async function sendRawRequest(url, payload) {
  return await axios.post(url, payload); // No keepAlive, no timeout, no retry logic!
}
```

---

## 6. Error Handling & Flow Control

### Rules
- **ALWAYS** return custom wrapper structures (the `Result` pattern) for expected business and validation errors to bypass the performance penalty of native stack traces.
- **ALWAYS** use native `Error` throwing only for truly exceptional/unexpected operations (e.g., lost database connections, runtime configuration failures).
- **ALWAYS** ensure all caught exceptions are logged with context and re-thrown or mapped to a standard api response.

### Cost Awareness
- Compiling a single native Node.js `new Error()` and capturing its V8 stack trace takes **~12,000 ns** and allocates **~1.5 KB** of heap memory.
- Returning a plain JavaScript object literal representing an operational failure takes **~30 ns** and allocates virtually **zero persistent heap**.
- At scale under sustained load, relying on exceptions for control flow triggers aggressive garbage collection pauses and degrades P99 latencies.

### Correct Patterns

```javascript
// CORRECT — Result Pattern for business rules and validations
class Result {
  constructor(success, data, error) {
    this.success = success;
    this.data = data;
    this.error = error;
  }
  static ok(data) { return new Result(true, data, null); }
  static fail(err) { return new Result(false, null, err); }
}

function processPayment(amount, userBalance) {
  if (amount > userBalance) {
    return Result.fail({ code: 'INSUFFICIENT_FUNDS', message: 'Balance is too low' });
  }
  const txId = crypto.randomUUID();
  return Result.ok({ transactionId: txId });
}

// CORRECT — Native error reserved for truly exceptional failures
async function connectToCache(url) {
  try {
    await redisClient.connect(url);
  } catch (err) {
    throw new Error('CRITICAL: Redis connection failed', { cause: err });
  }
}

// WRONG — Using exceptions for standard business control flow
function badProcessPayment(amount, userBalance) {
  if (amount > userBalance) {
    // Extremely expensive throw for a common, expected scenario!
    throw new Error('PaymentFailed: Insufficient user balance'); 
  }
  return { transactionId: 'tx-123' };
}
```

---

## 7. Caching Systems

### Rules
- **ALWAYS** define a strict Time-to-Live (TTL) on every entry stored in Redis.
- **ALWAYS** utilize distributed lock mechanisms (e.g. `redlock` or custom `SETNX` commands) when rebuilding keys to prevent Cache Stampedes.
- **NEVER** use local, in-process caches (`Map`, Node-cache) for cluster-shared state in multi-replica deployments; all instances must read from distributed memory (Redis).
- **ALWAYS** incorporate randomized TTL jitter (e.g., ±10% variation) on bulk key writes to avoid concurrent cache expiration cascades.

### Correct Patterns

```javascript
// CORRECT — Cache-aside pattern with TTL jitter and Redis Lock (Redlock)
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

async function getCachedOrder(orderId) {
  const cacheKey = `order:${orderId}`;
  
  // Try fetching from cache
  const cachedVal = await redis.get(cacheKey);
  if (cachedVal) {
    return JSON.parse(cachedVal);
  }
  
  // Cache miss — fetch and write back with TTL jitter
  const order = await db.orders.findById(orderId);
  if (order) {
    const baseTTL = 3600; // 1 hour
    const jitter = Math.floor(Math.random() * 360); // ±6 minutes
    await redis.setex(cacheKey, baseTTL + jitter, JSON.stringify(order));
  }
  
  return order;
}
```

---

## 8. Dependency Injection / Lifetime Management

### Rules
- **ALWAYS** use structured dependency injection frameworks (e.g., Awilix, InversifyJS) or clear factory patterns to decouple services from lifecycle layers.
- **ALWAYS** declare database contexts, transactional repositories, and request-scoped services as **Scoped** lifetimes.
- **ALWAYS** declare configuration providers, Kafka/RabbitMQ brokers, and HTTP connection pools as **Singleton** lifetimes.
- **NEVER** inject a Scoped service directly into a Singleton service (Captive Dependency), as this permanently retains the scoped instance inside the singleton, causing state pollution.

### Lifetime Mapping Table

| Lifetime | Target Concept | Description |
|---|---|---|
| **Singleton** | Configuration providers, HTTP pool clients, Redis connection clients | Instantiated exactly once at startup; reused across all requests. |
| **Scoped** | Request-scoped logger, DB transaction contexts, user context providers | Instantiated once per incoming HTTP request / event flow; collected on request finish. |
| **Transient** | Stateless utility helpers, data formatting engines | Instantiated every time they are requested from the container. |

```javascript
// Awilix Scoped/Singleton DI Container Config example
import { createContainer, asClass, asValue, Lifetime } from 'awilix';

const container = createContainer();

container.register({
  // Singleton
  redisClient: asValue(new Redis(process.env.REDIS_URL)),
  apiClient: asValue(apiClient),
  
  // Scoped (Resolved per Express request)
  orderRepository: asClass(OrderRepository, { lifetime: Lifetime.SCOPED }),
  orderService: asClass(OrderService, { lifetime: Lifetime.SCOPED }),
});
```

---

## 9. Structured Logging

### Rules
- **ALWAYS** use high-performance structured loggers (e.g., `pino` or `winston`) that emit logs as raw single-line JSON streams to stdout.
- **ALWAYS** use template parameters or context metadata payloads; **NEVER** use runtime string interpolation inside hot logging paths.
- **ALWAYS** configure structured redaction rules to filter sensitive PII parameters (e.g., passwords, creditCard, token, email).
- **NEVER** call `console.log` directly in production.

### Correct Patterns

```javascript
// CORRECT — Pino structured JSON logger with automatic PII redaction
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.body.password', 'req.body.creditCard'],
    censor: '[REDACTED]'
  }
});

// CORRECT — Structured log parameters (zero runtime interpolation allocations)
logger.info({ orderId: '12345', userId: 'user-99' }, 'Order processed successfully');

// WRONG — String interpolation forces memory allocation
logger.info(`Order ${orderId} was processed for customer ${userId}`); // Allocates dynamic strings!

// WRONG — Direct unformatted stdout
console.log(`Order processed: ${orderId}`); // Non-structured, slow, blocks process thread under load
```

---

## 10. GC / Runtime Tuning & Profiling

### Awareness
- By default, Node.js allocates a maximum heap space of ~1.4GB on 64-bit systems.
- Inside containers, you must explicitly match V8's max old space limit to the container resource constraints using the `--max-old-space-size` CLI flag.
- Monitor active V8 metric flags (`gen-1-gc-count`, `gen-2-gc-count`) to identify severe heap bottlenecks.

### Identifying GC Bottlenecks
- P99 API latency spikes correlate exactly with V8 GC Stop-The-World pause intervals.
- The V8 process spends >10% of total runtime executing garbage collection passes.
- To profile memory leaks, trigger a core dump using the `--heapsnapshot-signal=SIGUSR2` flag and inspect within Chrome DevTools.

---

## 11. Kubernetes — Multi-Replica Guardrails (3-10 Replicas)

> Running 3–10 replicas. Any local process-state assumption is an instant production bug.

### 11.1 State & Stickiness
- **NEVER** store user sessions, auth status, or temporary files on the local container disk or static variables; replicate them in Redis or a shared DB.
- **NEVER** configure sticky sessions (Session Affinity) on the ingress controller.

### 11.2 Distributed Locking
- **ALWAYS** use a Redis-based distributed lock (`redlock`) to guard critical operations across multiple replicas.

```javascript
// Distributed lock with Redlock
import Redlock from 'redlock';

const redlock = new Redlock([redis], { retryCount: 3, retryDelay: 200 });

async function processUniqueOrder(orderId) {
  const resource = `locks:order:${orderId}`;
  const lock = await redlock.acquire([resource], 5000); // 5-second TTL
  
  try {
    // Safe critical section across 10 replicas
    await db.orders.updateStatus(orderId, 'processing');
  } finally {
    await lock.release();
  }
}
```

### 11.3 Scheduled Tasks
- **NEVER** execute cron triggers inside the main API process using node-cron or intervals.
- **ALWAYS** isolate scheduled tasks into dedicated Kubernetes `CronJob` specifications running separate task containers.

```yaml
# Kubernetes CronJob Config
apiVersion: batch/v1
kind: CronJob
metadata:
  name: billing-cron-job
spec:
  schedule: "0 1 * * *" # Runs daily at 1:00 AM
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: cron-runner
              image: myregistry/billing-job:1.0.0
```

### 11.4 Graceful Shutdown

Upon receiving a `SIGTERM`, Node.js must drain active sockets, complete in-flight HTTP transactions, close database clients, and exit cleanly before the grace period ends.

```javascript
// Express server graceful shutdown implementation
import { createServer } from 'node:http';
import express from 'express';

const app = express();
const server = createServer(app);

let isShuttingDown = false;

app.use((req, res, next) => {
  if (isShuttingDown) {
    res.set('Connection', 'close');
    return res.status(503).json({ error: 'Server is shutting down' });
  }
  next();
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Initiating graceful shutdown.');
  isShuttingDown = true;
  
  // Stop receiving new connections
  server.close(async () => {
    logger.info('HTTP server closed. Releasing resources...');
    try {
      await db.destroy(); // Close database pool
      await redis.quit(); // Close Redis connection
      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during graceful shutdown resource release');
      process.exit(1);
    }
  });
  
  // Enforce absolute termination after 25 seconds (Grace limit is 30s)
  setTimeout(() => {
    logger.error('Forced shutdown triggered after timeout.');
    process.exit(1);
  }, 25000);
});
```

### 11.5 Health Checks

| Endpoint | Purpose | Audience | Checks |
|---|---|---|---|
| `/healthz/live` | Process is running | K8s Liveness | Event Loop responsive |
| `/healthz/ready` | Can receive traffic | K8s Readiness | Database connection check |
| `/healthz/startup` | Warmup completed | K8s Startup | Cache warmup and configuration read |
| `/healthz/dependencies` | Third-party health | DataDog Alerting | DB, Redis, downstream REST API status |

```javascript
// Express health check routers
app.get('/healthz/live', (req, res) => {
  res.status(200).send('OK');
});

app.get('/healthz/ready', async (req, res) => {
  const dbConnected = await db.ping();
  if (dbConnected) {
    return res.status(200).send('Ready');
  }
  res.status(500).send('Database connection down');
});
```

---

## 12. Magic Values

- **ALWAYS** declare configuration constants, endpoints, and fixed settings using `Object.freeze` objects.
- **NEVER** use magic strings or numbers inline.

```javascript
// CORRECT — Frozen constants configuration object
export const PAYMENT_RULES = Object.freeze({
  MIN_TRANSACTION_AMOUNT_USD: 100,
  MAX_TRANSACTION_AMOUNT_USD: 100000,
  SUPPORTED_CURRENCIES: Object.freeze(['USD', 'EUR', 'BRL']),
});
```

---

## 13. Open Source & Dependency Policy

> See global policy: [`engineer/knowledge/ABI FOSS Policy.md`](../ABI%20FOSS%20Policy.md)

Ensure all external NPM dependencies are continuously scanned for licenses and security vulnerabilities. Lockfiles (`package-lock.json`) must be checked into git.

---

## 14. Authentication & Authorization

### 14.1 Authentication — Keycloak Integration

Every API request targeting secured routes must validate JWT signatures issued exclusively by Keycloak via JSON Web Key Sets (JWKS).

```javascript
// Express Keycloak JWT Validation Middleware
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const jwks = jwksClient({
  jwksUri: 'https://keycloak.company.com/realms/my-realm/protocol/openid-connect/certs',
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

function getKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export function validateKeycloakToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, getKey, {
    issuer: 'https://keycloak.company.com/realms/my-realm',
    audience: 'my-service-client-id',
    algorithms: ['RS256']
  }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized token signature check failed', details: err.message });
    }
    req.user = decoded; // Store decoded token payload
    next();
  });
}
```

### 14.2 Authorization — Role-Based Access Control (RBAC)

Extract Keycloak mapped roles from the decoded token claims to authorize API endpoints securely.

```javascript
// Middleware to authorize specific app roles mapped from Keycloak
export function requireRoles(allowedRoles) {
  return (req, res, next) => {
    const realmAccessRoles = req.user?.realm_access?.roles || [];
    
    const hasRole = allowedRoles.some(role => realmAccessRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
}

// Router usage
app.delete('/api/orders/:id', validateKeycloakToken, requireRoles(['app-admin']), async (req, res) => {
  // Only users possessing the 'app-admin' Keycloak role can execute this
});
```
