# Knowledge: React & TypeScript (Node.js SSR) — Performance Best Practices & Guardrails

> Applies to: React 18/19, Next.js 14/15+ (App Router), TypeScript 5.x, Node.js 20+
> Scope: Frontend SPAs, Next.js Fullstack/SSR, UI Components, and API Routes.
> Deployment: Kubernetes cluster, 3–10 replicas, horizontal autoscaling.

---

## 1. Async & Concurrency

### Rules
- **ALWAYS** use `async/await` for asynchronous operations. Avoid raw `.then().catch()` chains.
- **ALWAYS** propagate `AbortSignal` from a controller or hook down to every network and async call to cancel in-flight requests.
- **ALWAYS** wrap state updates in `useTransition` for low-priority visual transitions to prevent UI freezing (React Concurrent Mode).
- **ALWAYS** handle potential promise rejections in async event handlers with `try/catch`.
- **NEVER** update React state in asynchronous callback routines without verifying if the component is still mounted (or let React 18+ garbage collector handle it by discarding state updates on unmounted trees).

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Blocking the Event Loop with long-running synchronous execution | Freezes the browser UI thread (16.6ms frame budget); kills UX |
| Updating React state synchronously inside standard loops | Triggers aggressive synchronous re-render batches; degrades performance |
| Ignoring `AbortController` in client hooks | Causes network race conditions and memory leaks on rapid route changes |
| Synchronous state mutation based on stale dependencies | Creates severe out-of-sync UI state |
| Floating/Unhandled Promises in Node.js SSR context | Process-wide `unhandledRejection` warnings; risks silent memory leaks or crashes |

### Correct Patterns
```typescript
// CORRECT — Using AbortController inside useEffect to cancel async calls
import { useState, useEffect } from 'react';

export function useFetchData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const result = (await response.json()) as T;
        setData(result);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Fetch failed:', err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    return () => abortController.abort(); // Cancel request when unmounted/url changes
  }, [url]);

  return { data, loading };
}

// CORRECT — useTransition for low priority state updates (Concurrent rendering)
import { useTransition } from 'react';

export function TabContainer() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState('about');

  function selectTab(nextTab: string) {
    startTransition(() => {
      setTab(nextTab); // This state update is non-blocking
    });
  }

  return (
    <div>
      <TabButton isActive={tab === 'about'} onClick={() => selectTab('about')}>About</TabButton>
      <TabButton isActive={tab === 'posts'} onClick={() => selectTab('posts')}>Posts</TabButton>
      {isPending && <p>Loading new posts...</p>}
      <TabContent tab={tab} />
    </div>
  );
}

// WRONG — ignores cancellation and triggers race conditions
useEffect(() => {
  fetch(url)
    .then(res => res.json())
    .then(data => setData(data)); // Stale response can overwrite newer ones!
}, [url]);
```

---

## 2. Memory & Allocations

### Rules
- **ALWAYS** clean up event listeners, standard timers (`setInterval`/`setTimeout`), and WebSocket subscriptions in the return block of `useEffect`.
- **ALWAYS** use `useMemo` and `useCallback` when passing callbacks or object values to child components wrapped in `React.memo` or as hook dependency inputs.
- **ALWAYS** keep components small and focused to minimize virtual DOM diffing footprint.
- **ALWAYS** prefer primitive dependencies in `useEffect` arrays to prevent unnecessary execution loops due to object reference inequality.
- **PREFER** `useRef` for mutable references that should not trigger a re-render when their values change.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Creating new inline arrow functions or objects in hot path render loops | Breaks child component memoization; causes high garbage collection pressure |
| Forgetting to clear `setInterval` or `addEventListener` in `useEffect` | Retains references to the component scope; causes browser memory leaks |
| Premature/Blind optimization using `useMemo`/`useCallback` everywhere | Introduces dependency array overhead and closure allocations without performance gains |
| Holding massive raw data sets in standard state | Triggers expensive cloning and React tree re-evaluations |

### Correct Patterns
```typescript
// CORRECT — Cleaning up timers and listener references
import { useEffect, useState } from 'react';

export function useWindowResize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize); // Clear reference
  }, []);

  return size;
}

// CORRECT — Memoization only where necessary (passing to memoized child)
import React, { useCallback, useMemo } from 'react';

interface ExpensiveChildProps {
  onClick: () => void;
  options: { label: string };
}

const ExpensiveChild = React.memo(({ onClick, options }: ExpensiveChildProps) => {
  return <button onClick={onClick}>{options.label}</button>;
});
ExpensiveChild.displayName = 'ExpensiveChild';

export function ParentComponent({ id }: { id: string }) {
  const handleClick = useCallback(() => {
    console.log('Action performed for id:', id);
  }, [id]);

  const options = useMemo(() => ({ label: `Action for ${id}` }), [id]);

  return <ExpensiveChild onClick={handleClick} options={options} />;
}

// WRONG — Leak and redundant allocations
export function WrongParent({ id }: { id: string }) {
  // Re-allocated on every single tick, breaking child memoization
  const handleClick = () => console.log(id); 
  const options = { label: `Action for ${id}` };

  useEffect(() => {
    setInterval(() => {
      console.log('Polling api...');
    }, 1000); // NEVER CLEARED! Leak occurs when unmounted
  }, []);

  return <ExpensiveChild onClick={handleClick} options={options} />;
}
```

---

## 3. Collections & Data Structures

### Rules
- **ALWAYS** provide a unique, stable, and deterministic `key` prop when rendering lists of dynamic components.
- **ALWAYS** initialize array lists or dictionaries with a clear, predictable structure.
- **PREFER** `Map` or `Set` over standard JavaScript `Object` literal lookups for dynamic collections with high-frequency insertions and deletions.
- **ALWAYS** freeze large static lookups using `Object.freeze()` to prevent deep object mutations and React re-evaluation traversal.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Using array `index` or `Math.random()` as `key` props | Destroys React's reconciliation engine; triggers complete DOM node recreation and input state loss |
| Performing O(N) array checks (`.includes()`, `.find()`) inside nested list rendering blocks | Degrades rendering complexity to O(N²); severely impacts user input frame rates |
| Mutating collections directly (e.g. `state.push(item)`) | Prevents state update detection due to unchanged object references |

### Correct Patterns
```typescript
// CORRECT — Unique stable keys and optimized lookups
import { useState, useMemo } from 'react';

interface Item {
  id: string; // Stable unique identifier from database
  name: string;
}

export function FilteredList({ items }: { items: Item[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Using a Set for O(1) membership checks during render
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <ul>
      {items.map((item) => (
        <li
          key={item.id} // CORRECT: Stable identifier
          style={{ fontWeight: selectedIds.has(item.id) ? 'bold' : 'normal' }}
          onClick={() => toggleSelection(item.id)}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}

// WRONG — Array indices as key props and nested O(N) queries
export function WrongList({ items }: { items: Item[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // Array lookup is O(N)

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => [...prev, id]); // Mutates without deduplication
  };

  return (
    <ul>
      {items.map((item, index) => (
        <li
          key={index} // WRONG: Triggers layout/component state bugs on sorting
          style={{ fontWeight: selectedIds.includes(item.id) ? 'bold' : 'normal' }} // WRONG: O(N) lookup inside map loop (O(N²))
          onClick={() => toggleSelection(item.id)}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

---

## 4. Database & ORM Integration

This section applies to full-stack React frameworks (Next.js App Router) running Server Actions or API routes utilizing **Prisma** or **Mongoose**.

### Rules
- **ALWAYS** instantiate and reuse a single database client instance (Prisma / MongoClient) using global variables to prevent connection leakage during Next.js Hot Module Replacement (HMR) in development.
- **ALWAYS** configure PgBouncer or equivalent connection poolers when deploying Next.js to serverless environments or horizontal multi-replica Kubernetes setups.
- **ALWAYS** parameterize raw database queries to prevent SQL and NoSQL injections.
- **ALWAYS** handle transactional rollback states inside API handler routines.

### 4.1 Database Migrations — Prisma & Mongoose

#### Rules
- **ALWAYS** create schema changes using Prisma Migrations (`prisma migrate dev`) — never run DDL scripts directly against production databases.
- **ALWAYS** apply migrations inside CI/CD pipelines before deploying new container versions using `prisma migrate deploy`.
- **ALWAYS** verify generated SQL scripts before committing to ensure there are no destructive column or table drops.
- **ALWAYS** maintain schema version snapshots in your Git repository.

#### Hard Guardrails
| Forbidden | Reason |
|---|---|
| Direct schema modifications on DB | Out-of-sync database states across dev, staging, and production environments |
| Running `prisma db push` in production | Bypasses migration history; risks severe, non-reversible data loss |
| Bypassing Prisma Client connection limits | Quickly exhausts database max connection limits under replica auto-scaling |

```typescript
// CORRECT — Persistent Prisma Client pattern to avoid leaks during HMR
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 4.2 Index Migrations — Manual DDL Only

**NEVER** allow frameworks to silently generate production indexes. Index generation requires online creation capabilities to prevent blocking user actions.

#### Rules
- **ALWAYS** write migration steps for high-traffic indexes with non-blocking settings (e.g., PostgreSQL `CONCURRENTLY` index builds or MongoDB background configurations).
- **ALWAYS** write double-guarded, idempotent DDL scripts (`IF NOT EXISTS` constructs).
- **ALWAYS** define a proper rollback migration strategy in your migration tools.

#### Hard Guardrails
| Forbidden | Reason |
|---|---|
| Standard `CREATE INDEX` during business hours | Places a strict write lock on the table, degrading API response times and causing timeouts |
| Standard Prisma index definitions without scale review | Default migration scripts do not apply concurrent builds |

#### Correct Pattern
```sql
-- CORRECT — PostgreSQL Online Idempotent Index Build
-- Executed with transaction: false flags inside the migration runner
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_id 
ON "Order" (customer_id) 
WHERE status = 'ACTIVE';
```

---

## 5. HTTP & Remote API Connections

### Rules
- **ALWAYS** configure explicit, strict timeout limits (e.g., maximum 5000ms) on all network outbound requests.
- **ALWAYS** use standard `AbortController` or library timeout configurations (e.g., Axios `timeout` properties).
- **ALWAYS** configure retry policies with exponential backoff and circuit breakers for downstream integrations (e.g., resilient HTTP helpers).
- **ALWAYS** use standardized data fetching solutions with built-in cache deduplication, retry capabilities, and cache invalidation policies (React Query / TanStack Query, SWR, or next-cache configurations).

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Indefinite network fetch awaits | A slow external API will block Node.js event pool, causing cluster-wide timeouts |
| Uncontrolled client-side retry loops | Triggers aggressive Denial-of-Service loops on downstream architectures |
| Re-fetching deep datasets on every single key press | Saturation of client network interfaces; massive performance lag |

### Correct Patterns
```typescript
// CORRECT — Resilient Axios fetch helper with timeout and retry handling
import axios from 'axios';
import axiosRetry from 'axios-retry';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 5000, // Strict 5-second timeout
  headers: { 'Content-Type': 'application/json' },
});

// Configure client with exponential backoff retry policy
axiosRetry(apiClient, {
  retries: 3,
  retryDelay: (retryCount) => axiosRetry.exponentialDelay(retryCount),
  retryCondition: (error) => {
    // Only retry on network issues or 5xx server issues
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 502;
  },
});

export async function fetchOrderDetails(orderId: string) {
  const response = await apiClient.get(`/orders/${orderId}`);
  return response.data;
}

// WRONG — Unbounded fetch request
export async function getOrderWrong(orderId: string) {
  // Missing timeout limits, no retry bounds, no error boundary
  const res = await fetch(`https://api.internal/orders/${orderId}`); 
  return res.json();
}
```

---

## 6. Error Handling & Flow Control

### Rules
- **ALWAYS** write a custom React **Error Boundary** component to intercept and gracefully recover from execution exceptions during client-side rendering trees.
- **ALWAYS** use the `{ success: true; data: T } | { success: false; error: DomainError }` result validation pattern for predictable user and API validations instead of throwing expensive exceptions.
- **ALWAYS** intercept unhandled rejection warnings in SSR contexts by registering `process.on('unhandledRejection')` and `process.on('uncaughtException')` handles.
- **NEVER** throw JavaScript `Error` objects to handle happy-path logical validations.

### Cost Awareness
- JavaScript standard error generation + V8 engine stack-trace capture: ~12,000 ns.
- Domain Result notification pattern: ~40 ns.
- Processing exceptions in rendering cycles will completely de-optimize V8 execution profiles under horizontal load.

### Correct Patterns
```typescript
// CORRECT — Custom React Error Boundary Component
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export class SafeErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime boundary error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// CORRECT — Result Pattern for logical exceptions
type Result<T, E = string> = { success: true; data: T } | { success: false; error: E };

export function validatePromoCode(code: string): Result<number> {
  if (!code) {
    return { success: false, error: 'Promo code cannot be empty' };
  }
  if (code !== 'SAVE2026') {
    return { success: false, error: 'Invalid promo code' };
  }
  return { success: true, data: 20 };
}

// WRONG — Using exceptions for standard validations
export function validatePromoWrong(code: string) {
  if (code !== 'SAVE2026') {
    throw new Error('Invalid promo code'); // Degrades V8 optimization in hot path loops
  }
  return 20;
}
```

---

## 7. Caching Systems

### Rules
- **ALWAYS** configure strict TTL parameters (Time-To-Live) on all caching storage options.
- **ALWAYS** use a distributed caching architecture (Redis) when deploying multi-replica SSR services.
- **ALWAYS** employ cache-stampede mitigation strategies (such as locking or background refreshes before key expiration) for high-traffic entry lookups.
- **ALWAYS** declare appropriate `staleTime` and `gcTime` in React Query definitions to prevent background auto-fetch cascades.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Global in-memory Maps as serverside caches on Next.js | Replicas have separate memory boundaries; causes out-of-sync state |
| Indefinite caching duration setups | Stale configurations or old database snapshots persist indefinitely |
| Storing raw unencrypted sensitive data (PII, JWTs) in caching layers | Exposes secure systems to data leakage vectors |

### Correct Patterns
```typescript
// CORRECT — Redis distributed caching with cache-stampede mitigation
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function getCachedDataWithStampedeProtection<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    const { val, expireAt } = JSON.parse(cached);
    // Probabilistic early expiration: refresh key 10% before physical TTL expiration
    const remainingTime = expireAt - Date.now();
    if (remainingTime < (ttlSeconds * 1000) * 0.1) {
      // Trigger background update without blocking client
      fetcher().then(freshData => {
        redis.set(key, JSON.stringify({ val: freshData, expireAt: Date.now() + (ttlSeconds * 1000) }), 'EX', ttlSeconds);
      }).catch(err => console.error('Background cache refresh failed:', err));
    }
    return val as T;
  }

  // Cache miss
  const fresh = await fetcher();
  await redis.set(key, JSON.stringify({ val: fresh, expireAt: Date.now() + (ttlSeconds * 1000) }), 'EX', ttlSeconds);
  return fresh;
}
```

---

## 8. Dependency Injection & Lifetime

In React, lifetime management revolves around component contexts, module instances, and state lifespans.

### Rules
- **ALWAYS** separate state boundaries to prevent global context re-renders (use localized states or state partition libraries like Zustand/Redux).
- **ALWAYS** verify Context value identity: wrap values in `useMemo` when rendering root providers to prevent children updates on unrelated parent renders.
- **NEVER** expose stateful Singletons as module-level global variables in SSR systems (Next.js server side). Doing so shares state across separate incoming requests.

### Lifetime Mapping Table

| State / Dependency Scope | Lifespan | Typical Use Case |
|---|---|---|
| **Local state (`useState`)** | Transient (Component-based) | Form fields, local toggle scopes |
| **Ref state (`useRef`)** | Transient (Instance-based) | DOM nodes, timers, in-flight transaction IDs |
| **Context API Provider** | Subtree Scoped | Multi-component UI state, themes |
| **Zustand / Redux Store** | Client Singleton / SSR Request Scoped | Logged-in user configurations, active carts |

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Request state stored in global module variables on SSR server | Memory leak and security breach; users can read other users' data |
| Massive, monolithic Context objects containing frequently changing states | Forces complete subtree re-renders on every minor change |

---

## 9. Structured Logging

### Rules
- **ALWAYS** use structured, zero-alloc production-grade logging libraries on the server side (Pino or Winston) with JSON-output formatting.
- **ALWAYS** utilize semantic log message templates containing structured key-value attributes instead of raw string interpolations.
- **ALWAYS** filter or mask personally identifiable information (PII) before printing to output channels.
- **ALWAYS** propagate a transaction or request Correlation ID through all down-stream API and client execution routes.

### Correct Patterns
```typescript
// CORRECT — Pino structured logger with proper metadata context
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: ['req.headers.authorization', 'user.password', 'user.email'],
    placeholder: '[MASKED]',
  },
});

export async function processOrderRequest(orderId: string, userId: string, correlationId: string) {
  // Structured logging allows automatic indexing in Datadog/Elasticsearch
  logger.info({ orderId, userId, correlationId }, 'Order processing initiated');
  
  try {
    // Process step...
  } catch (err: any) {
    logger.error({ err, orderId, correlationId }, 'Order processing failed');
    throw err;
  }
}

// WRONG — String interpolation without structured keys
export function processOrderWrong(orderId: string) {
  // Cannot be indexed cleanly; leaks context strings; no correlation IDs
  console.log(`Processing order: ${orderId} at ${new Date().toISOString()}`); 
}
```

---

## 10. GC & Runtime Tuning

### Awareness
- The V8 Engine uses two primary garbage collection strategies: Scavenge (cheap, fast for transient objects) and Mark-Sweep-Compact (heavy, full-heap blocking).
- Main causes of full execution stalls in Node.js are memory leaks in closures, unclosed sockets, and massive array mapping loops.
- Run memory profiling using Chrome DevTools or CLI diagnostics toolsets (`node --inspect`).

### Signals that GC is a Bottleneck
- p99 response latencies jump to multiple seconds while CPU cores saturate at 100%.
- Frequent restart occurrences flagged by Kubernetes with an `OOMKilled` status.

---

## 11. Kubernetes — Multi-Replica Guardrails

> Deployments scale from 3 to 10 replicas. Single-process states or in-memory caches are critical design flaws.

### 11.1 State & Stickiness

#### Rules
- **NEVER** utilize local memory variables (`let cache = {}`) to store active user sessions or shared transaction data across endpoints.
- **ALWAYS** design Node.js backend endpoints to be completely stateless.
- **ALWAYS** externalize sessions to distributed Redis clusters.

---

### 11.2 Distributed Locking

#### Rules
- **ALWAYS** implement distributed locks (e.g. Redlock using the `ioredis` and `redlock` packages) when executing single-instance workflows (e.g., invoice processing).
- **NEVER** use local process-level locks (such as custom promises) for cluster-wide synchronizations.

```typescript
// CORRECT — Node.js Redlock implementation
import Client from 'ioredis';
import Redlock from 'redlock';

const redisClient = new Client(process.env.REDIS_URL || 'redis://localhost:6379');
const redlock = new Redlock([redisClient], {
  driftFactor: 0.01,
  retryCount: 10,
  retryDelay: 200,
  retryJitter: 200,
});

export async function performExclusiveOperation(resourceId: string) {
  const lockKey = `locks:resource:${resourceId}`;
  const ttl = 10000; // 10 seconds lock TTL

  let lock;
  try {
    lock = await redlock.acquire([lockKey], ttl);
    // Critical Section
    console.log('Resource locked securely on single replica.');
  } catch (err) {
    console.error('Failed to acquire lock across replica instances:', err);
    throw new Error('Resource is currently locked.');
  } finally {
    if (lock) {
      await lock.release();
    }
  }
}
```

---

### 11.3 Scheduled Tasks

#### Rules
- **NEVER** execute scheduler processes inside the standard API replica service.
- **ALWAYS** utilize dedicated Kubernetes `CronJob` specifications for execution control.
- **ALWAYS** set `concurrencyPolicy: Forbid` to prevent duplicate concurrent launches on task runs.

```yaml
# CORRECT — Kubernetes CronJob for scheduled tasks
apiVersion: batch/v1
kind: CronJob
metadata:
  name: billing-settlement-job
spec:
  schedule: "0 1 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: job-runner
              image: myrepo/billing-job-runner:latest
              envFrom:
                - secretRef:
                    name: db-credentials
```

---

### 11.4 Graceful Shutdown & Pod Termination

#### Rules
- **ALWAYS** intercept the Unix `SIGTERM` signal to drain outstanding requests before exiting the process.
- **ALWAYS** clean up database connections and Redis listeners before finalizing exit routines.

```typescript
// CORRECT — Node.js HTTP Server Graceful Exit
import http from 'http';
import { prisma } from './db';

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('System Online');
});

server.listen(8080);

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  // Close HTTP server, stopping new incoming connection acceptance
  server.close(async () => {
    console.log('HTTP server closed. Draining database connection pools...');
    await prisma.$disconnect();
    console.log('Cleanup completed. Exiting safely.');
    process.exit(0);
  });

  // Force shutdown limit if connection draining takes too long
  setTimeout(() => {
    console.error('Forceful termination executed after grace timeout.');
    process.exit(1);
  }, 15000);
});
```

---

### 11.5 Health Checks

| Endpoint | Probe Type | Checked By | Purpose |
|---|---|---|---|
| `/api/health/live` | `livenessProbe` | Kubernetes | Validates process reactivity |
| `/api/health/ready` | `readinessProbe` | Kubernetes | Ensures core DB connectivity is active |
| `/api/health/dependencies` | N/A | **Datadog** | Exhaustive check of all external API endpoints |

#### Kubernetes Probes Specification Example
```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
```

---

### 11.6 Connection Pooling under Horizontal Scale
- Total Max Connections = `max_connections_per_replica × max_replicas`.
- Make sure this total does not exceed `0.80 × DB_max_connections`.
- Utilize connection pooling managers (such as PgBouncer) for large horizontal scale counts.

---

### 11.7 Resource Limits & V8 Runtime Tuning

#### Rules
- **ALWAYS** match CPU and memory requests/limits in your Kubernetes pod files to guarantee Quality of Service (`Guaranteed` QoS).
- **ALWAYS** limit V8 old memory space parameters using `--max-old-space-size` inside the Node start commands to match the assigned container constraints.

```yaml
# CORRECT — Kubernetes Resource Definition
resources:
  requests:
    cpu: "1000m"
    memory: "1024Mi"
  limits:
    cpu: "1000m"
    memory: "1024Mi"
```
```json
// Package.json start command
"start": "node --max-old-space-size=850 server.js" // Leaves 15% headroom for container buffers
```

---

### 11.8 Configuration & Secrets
- Never commit credentials to version control. Load from environment parameters or mount directly from Kubernetes Secrets configs.

---

### 11.9 Idempotency Patterns
- Design mutation actions to expect an `Idempotency-Key` header. Validate presence in distributed Redis cache layers before proceeding.

---

## 12. Magic Values & Typings

### Rules
- **ALWAYS** declare constant lookup collections using TypeScript's `as const` utility to guarantee absolute read-only literal types.
- **ALWAYS** use strict, strongly-typed Enums or Union Types instead of raw string or integer definitions.
- **ALWAYS** use type-guards or TypeScript `satisfies` configurations to validate runtime definitions.

### Correct Patterns
```typescript
// CORRECT — Strong typings and constant configuration structures
export const API_ROUTES = {
  ORDERS: '/api/v1/orders',
  CUSTOMERS: '/api/v1/customers',
  INVENTORIES: '/api/v1/inventories',
} as const;

export type ApiRoute = typeof API_ROUTES[keyof typeof API_ROUTES];

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

// WRONG — Magic strings and untyped objects
const routes = {
  orders: '/api/v1/orders',
};
// Comparing against raw strings elsewhere
if (status === 'processing') { ... } // Typos here will lead to silent runtime bugs!
```

---

## 13. Open Source & Dependency Policy

Refer strictly to the global policy: [`engineer/knowledge/ABI FOSS Policy.md`](../ABI%20FOSS%20Policy.md). No non-compliant third-party code packages are allowed.

---

## 14. Authentication & Authorization

### 14.1 Authentication — Keycloak (Company SSO)

#### Rules
- **ALWAYS** validate incoming JWT authorizations against the Keycloak realm's JSON Web Key Set (JWKS) endpoint.
- **ALWAYS** validate Token fields (`iss` realm checks, `aud` client identification checks, and `exp` validations).
- **NEVER** build custom, proprietary local authentication stores.

---

### 14.2 Authorization — Role-Based (Application Roles)

#### Rules
- **ALWAYS** map realm role definitions to local context flags.
- **ALWAYS** secure server routes and component structures utilizing defined roles.

#### Correct Patterns
```typescript
// CORRECT — Next.js Keycloak Role Verification Middleware / Service
import jose from 'jose';

const KEYCLOAK_JWKS_URL = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`;

export interface KeycloakTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  realm_access?: {
    roles: string[];
  };
}

export async function validateToken(authHeader?: string): Promise<KeycloakTokenPayload> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  
  const token = authHeader.split(' ')[1];
  const JWKS = jose.createRemoteJWKSet(new URL(KEYCLOAK_JWKS_URL));

  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer: process.env.KEYCLOAK_ISSUER,
    audience: process.env.KEYCLOAK_AUDIENCE,
  });

  return payload as unknown as KeycloakTokenPayload;
}

// React Custom Authorization Hook
import { useContext } from 'react';
import { AuthContext } from './AuthContext'; // Configured with KeycloakTokenPayload

export function useAuthorize(requiredRoles: string[]): boolean {
  const { user } = useContext(AuthContext);
  if (!user || !user.realm_access?.roles) return false;
  return requiredRoles.every(role => user.realm_access!.roles.includes(role));
}
```
