# Knowledge: TypeScript — Performance Best Practices & Guardrails

> Applies to: TypeScript 5.0+ (targeting ES2022 / Node.js 20+)
> Scope: Type-safe enterprise architectures, REST/GraphQL APIs, backend services.
> Deployment: Kubernetes cluster, 3–10 replicas, horizontal autoscaling.

---

## 1. Async & Concurrency / Threading / Reactive Execution

### Rules
- **ALWAYS** declare explicit generic parameters for all `Promise` returns: e.g. `Promise<T>`. Never use implicit or loose `Promise<any>`.
- **ALWAYS** validate type safety when destructuring the outcomes of parallel operations like `Promise.all` or `Promise.allSettled`.
- **ALWAYS** use type-safe cooperative cancellation with `AbortSignal` propagated through generic client interfaces.
- **ALWAYS** encapsulate Worker Thread interactions within typed payload-response channels.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Typing asynchronous execution handlers as `Promise<any>` | Completely bypasses the compiler's return-type validation |
| Casting async catch errors blindly to standard types | Errors in JavaScript are `unknown` at runtime; must narrow type |
| Missing generic constraints on asynchronous factory methods | Triggers compiler to fall back to `unknown` or implicit `any` types |
| Blocking asynchronous loops with unchecked type assertions | Disables typings, leading to runtime failures |

### Correct Patterns

```typescript
// CORRECT — Generic typed async service method with AbortSignal
interface Order {
  id: string;
  total: number;
}

async function fetchOrderData(
  orderId: string, 
  signal?: AbortSignal
): Promise<Order> {
  const response = await fetch(`https://api.company.com/orders/${orderId}`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load order: ${response.statusText}`);
  }
  const data: unknown = await response.json();
  
  // Type runtime validation block
  if (data && typeof data === 'object' && 'id' in data && 'total' in data) {
    return data as Order;
  }
  throw new Error('Malformed API payload format');
}

// CORRECT — Typed parallel operations with tuple destructuring
async function getDualMetrics(
  userId: string
): Promise<[number, string[]]> {
  const result: [number, string[]] = await Promise.all([
    userRepo.getScore(userId),
    userRepo.getRoles(userId)
  ]);
  return result;
}

// WRONG — Using Promise<any> bypasses type checks
async function badOrderFetch(orderId: string): Promise<any> {
  const res = await fetch(`https://api.company.com/orders/${orderId}`);
  return await res.json(); // Implicitly returns 'any', disabling downstream compiler guards!
}
```

---

## 2. Memory & Allocations / Garbage Collection / Optimization

### Rules
- **ALWAYS** optimize V8 memory footprint by preferring pure interface declarations over heavy class structures in hot allocation loops (interfaces compile to zero JS code).
- **ALWAYS** declare read-only collections (`readonly T[]` or `ReadonlyMap<K, V>`) to prevent mutation-induced garbage collection overhead.
- **ALWAYS** execute escape analysis when designing helper functions to avoid closed scopes retaining massive outer context bindings.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Allocating new Class instances dynamically inside loops | Massive prototype instantiation and Garbage Collection pressure |
| Compiling with loose downleveling options (e.g. targeting ES5) | Generates bloated, slow helper methods in compiled JS |
| Re-instantiating heavy static types inside request cycles | Bloats memory footprint; triggers frequent V8 garbage sweeps |

### Correct Patterns

```typescript
// CORRECT — Stateless data shapes defined as raw interfaces
interface LogPayload {
  readonly level: 'info' | 'warn' | 'error';
  readonly message: string;
  readonly timestamp: number;
}

function processLog(payload: LogPayload): void {
  // Zero prototype allocation! Raw JS object used at runtime.
}

// WRONG — Using heavy class instance inside a high-throughput loop
class LogPayloadClass {
  constructor(
    public readonly level: 'info' | 'warn' | 'error',
    public readonly message: string,
    public readonly timestamp: number
  ) {}
}

function badProcessLog(level: 'info', message: string): void {
  const payload = new LogPayloadClass(level, message, Date.now()); // High allocation footprint!
}
```

---

## 3. Collections & Data Structures / High-Performance Collections

### Rules
- **ALWAYS** restrict dynamic key-value maps to safe typings using `Record<string, T>` or explicit index signatures `{[key: string]: T}`.
- **ALWAYS** wrap immutable arrays and configurations in `ReadonlyArray<T>` or `readonly` properties to enforce immutable data structures.
- **ALWAYS** utilize custom Type Guards (`x is TargetType`) to safely narrow untyped collection payloads.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Defining dictionary index signatures with loose `any` values | Disables property access protection across the codebase |
| Casting array lists using unsafe `as Type[]` assertions | Blinds the compiler to runtime element mismatch errors |
| Modifying read-only arrays after creation via casting overrides | Breaks immutability contracts; causes silent state bugs |

### Correct Patterns

```typescript
// CORRECT — Immutability mapping with readonly constructs
interface Config {
  readonly endpoints: ReadonlyMap<string, string>;
  readonly activeStatus: readonly string[];
}

const appConfig: Config = {
  endpoints: new Map([['gateway', 'https://gateway.company.com']]),
  activeStatus: ['active', 'pending']
};

// CORRECT — Custom Type Guard for type narrowing
interface AdminUser { id: string; role: 'admin' }

function isAdmin(user: unknown): user is AdminUser {
  return typeof user === 'object' && user !== null && 'role' in user && (user as Record<string, unknown>).role === 'admin';
}

// WRONG — Unsafe Index Signature with loose type checking
interface LooseMap {
  [key: string]: any; // Allows completely unverified access!
}
```

---

## 4. Database & ORM Integration

### Rules
- **ALWAYS** utilize strictly typed ORM or Query Builder engines (e.g. Prisma, Kysely) to map database records directly to TypeScript types.
- **ALWAYS** enforce complete separation between database models and API schema layers by writing dedicated mapper DTO schemas.
- **ALWAYS** define relational transactions using type-safe context interfaces (`TransactionClient`).

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Mapping direct database query outputs as generic `any` values | Destroys compiler validation on field mappings |
| Mutating typed schema models directly in the database layers | Violates data integrity and triggers runtime type validation failures |
| Executing unsafe type assertions (`data as User`) over dirty rows | Conceals schema drifts; causes unexpected errors on null fields |

### Correct Pattern (Prisma Setup)

```typescript
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// CORRECT — Type-safe repository database transaction execution
async function executeOrderTransaction(
  orderId: string, 
  total: number
): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.order.update({
      where: { id: orderId },
      data: { total }
    });
  });
}
```

---

## 5. HTTP & Remote API Connections / Resilient HTTP Clients

### Rules
- **ALWAYS** assign strict type constraints to external API payloads using generics: e.g. `axios.get<ApiResponse>(url)`.
- **ALWAYS** parse untrusted dynamic payloads using strict validation runtime frameworks (e.g., `zod`, `io-ts`) before using them.
- **ALWAYS** type request query parameters and body inputs explicitly.

### Correct Patterns

```typescript
import axios from 'axios';
import { z } from 'zod';

const OrderResponseSchema = z.object({
  id: z.string(),
  total: z.number(),
  status: z.enum(['pending', 'completed'])
});

type OrderResponse = z.infer<typeof OrderResponseSchema>;

// CORRECT — Dynamic response validation using Zod
async function getOrder(orderId: string): Promise<OrderResponse> {
  const response = await axios.get<unknown>(`https://api.com/orders/${orderId}`);
  
  // Enforces perfect type alignment at the runtime boundary!
  return OrderResponseSchema.parse(response.data);
}
```

---

## 6. Error Handling & Flow Control

### Rules
- **ALWAYS** represent operational failures via strict Discriminated Union types (the type-safe `Result` pattern).
- **ALWAYS** type runtime caught error values as `unknown` in `catch` blocks; narrow them via type guards before performing assertions.
- **NEVER** use class-based exceptions for standard validation or normal business branching.

### Cost Awareness
- Native error stack capture consumes massive CPU resources. Using Discriminated Unions relies entirely on plain object evaluations which execute in **~5-10 nanoseconds**.

### Correct Patterns

```typescript
// CORRECT — Discriminated Union for type-safe business outcomes
type PaymentResult =
  | { success: true; transactionId: string }
  | { success: false; errorCode: 'INSUFFICIENT_FUNDS' | 'CARD_DECLINED'; message: string };

function processUserPayment(amount: number, balance: number): PaymentResult {
  if (amount > balance) {
    return { success: false, errorCode: 'INSUFFICIENT_FUNDS', message: 'Insufficient balance' };
  }
  return { success: true, transactionId: 'tx_99283' };
}

// Handling caught unknown errors safely
try {
  // execute operations
} catch (err: unknown) {
  if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error('An unexpected error occurred');
  }
}
```

---

## 7. Caching Systems

### Rules
- **ALWAYS** write generic type-safe cache interfaces (`ICache<T>`) to guarantee correct serialization schemas.
- **ALWAYS** enforce type-safe Cache Key factories to completely eliminate manual string key-collisions.

```typescript
// Type-safe Key-Value Cache Client
export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}
```

---

## 8. Dependency Injection / Lifetime Management

### Rules
- **ALWAYS** manage module dependency graphs through structured containers (e.g. `InversifyJS`) using type-safe **Symbols** as identity tokens.
- **NEVER** inject Scoped/Transient services into Singleton scopes (Captive Dependencies).

```typescript
import { Container, injectable, inject } from 'inversify';

// CORRECT — Symbol based DI registration
export const TYPES = {
  OrderRepository: Symbol.for('OrderRepository'),
  OrderService: Symbol.for('OrderService')
};

interface IOrderRepository { find(id: string): Promise<void> }

@injectable()
class OrderRepository implements IOrderRepository {
  async find(id: string) { /* ... */ }
}

const container = new Container();
container.bind<IOrderRepository>(TYPES.OrderRepository).to(OrderRepository).inSingletonScope();
```

---

## 9. Structured Logging

- **ALWAYS** type structural logs using rigorous metadata schemas, restricting inputs from generic `any` values.

```typescript
interface LogContext {
  readonly orderId?: string;
  readonly userId?: string;
  readonly traceId: string;
}

export function logInfo(message: string, context: LogContext): void {
  // Log implementation
}
```

---

## 10. GC / Runtime Tuning & Profiling

- **ALWAYS** evaluate transpilation downleveling outputs. Prefer compiling TypeScript down to modern ES2022 targets to keep JS execution fast and GC friendly.
- **NEVER** deploy production code with `ts-node` or execution wrappers; compile to static JS using `tsc` for production workloads.

---

## 11. Kubernetes — Multi-Replica Guardrails (3-10 Replicas)

> Running 3–10 replicas. Any local memory state assumption is an instant production bug.

### 11.1 State & Stickiness
- **NEVER** persist application states inside class singletons or global variables; serialize all shared contexts into Redis or the database.

### 11.2 Distributed Locking
- **ALWAYS** utilize typed wrappers around Redis distributed locks to guard concurrent access.

```typescript
import Redlock, { Lock } from 'redlock';
// Explicitly type and release resources securely
```

### 11.3 Scheduled Tasks
- **ALWAYS** deploy scheduled tasks as separate, standalone Kubernetes `CronJob` pods running individual job scripts.

### 11.4 Graceful Shutdown
- **ALWAYS** handle process signals (`SIGTERM`) type-safely. Ensure Express/Nest servers drain active connections and close database clients within the container's grace period.

### 11.5 Health Checks
- Expose `/healthz/live`, `/healthz/ready`, `/healthz/startup`, and `/healthz/dependencies` returning structured JSON configurations.

### 11.6 Connection Pooling
- Compute database pool constraints precisely according to replica scaling limits:
  `Max Replicas × Connection Pool Size ≤ DB Connections Headroom Limit`.

### 11.7 Resource Limits
- Configure container resource memory limits precisely matching V8 `--max-old-space-size` inputs.

### 11.8 Config & Secrets
- **ALWAYS** validate raw environment values at application boot using schemas (e.g. `zod` parse of `process.env`).

```typescript
const EnvSchema = z.object({
  PORT: z.string().transform(Number),
  DATABASE_URL: z.string().url(),
  KEYCLOAK_REALM_URL: z.string().url()
});

export const ENV = EnvSchema.parse(process.env);
```

### 11.9 Idempotency patterns
- Ensure all mutation methods accept an idempotency token stored in Redis.

---

## 12. Magic Values & Typings

- **ALWAYS** declare constant collections as frozen literals using TypeScript `as const` assertions.
- **NEVER** use magic strings or raw string matching for system states.

```typescript
// CORRECT — Typos prevented at compile time via 'as const'
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed'
} as const;

type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
```

---

## 13. Open Source & Dependency Policy

> See global policy: [`engineer/knowledge/ABI FOSS Policy.md`](../ABI%20FOSS%20Policy.md)

Enforce strict validation of external dependency licensing and lockfiles. Compile target libraries with checked typings (`@types/`).

---

## 14. Authentication & Authorization

### 14.1 Authentication — Keycloak JWT Payload Typing

Every incoming JWT bearer token issued by Keycloak must be verified signature-wise and parsed into a strictly typed payload structure.

```typescript
// Keycloak strictly typed JWT structure definitions
export interface KeycloakTokenPayload {
  readonly iss: string;
  readonly sub: string;
  readonly aud: string;
  readonly exp: number;
  readonly realm_access?: {
    readonly roles: readonly string[];
  };
  readonly resource_access?: {
    readonly [clientId: string]: {
      readonly roles: readonly string[];
    };
  };
  readonly preferred_username?: string;
  readonly email?: string;
}
```

### 14.2 Authorization — Role-Based Access Control (RBAC)

Use strictly typed authorization mappings to secure controller routes against custom role constants.

```typescript
export const APP_ROLES = {
  ADMIN: 'app-admin',
  MANAGER: 'app-manager',
  VIEWER: 'app-viewer'
} as const;

export type AppRole = typeof APP_ROLES[keyof typeof APP_ROLES];

// Type-safe middleware assertion check
export function hasRequiredRole(
  payload: KeycloakTokenPayload, 
  requiredRoles: readonly AppRole[]
): boolean {
  const roles = payload.realm_access?.roles || [];
  return requiredRoles.some(role => roles.includes(role));
}
```
