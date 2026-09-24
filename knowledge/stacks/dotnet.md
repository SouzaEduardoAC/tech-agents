# Knowledge: C# & .NET Core — Performance Best Practices & Guardrails

> Applies to: .NET Core 8 and .NET 10+
> Scope: Backend APIs, microservices, workers, and data pipelines.
> Deployment: Kubernetes cluster, 3–10 replicas, horizontal autoscaling.

---

## 1. Async & Concurrency

### Rules
- **ALWAYS** use `async/await` end-to-end. Never mix synchronous blocking with async code.
- **ALWAYS** propagate `CancellationToken` from the entry point (controller/consumer) down to every async call.
- **ALWAYS** use `ConfigureAwait(false)` in library/infrastructure code (not in application/controller layer).

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| `.Result` on a Task | Blocks the thread; deadlock risk under SynchronizationContext |
| `.Wait()` on a Task | Same as above |
| `.GetAwaiter().GetResult()` | Synchronous block; only acceptable at true top-level entry with no SynchronizationContext |
| `Task.WhenAll` without cancellation | Masks partial failures; all tasks run to completion even if one fails early |
| `async void` methods | Exceptions are unobservable; crashes the process silently |
| Fire-and-forget without supervision | Lost exceptions, no backpressure, no observability |

### Correct Patterns
```csharp
// CORRECT — async all the way down
public async Task<Order> GetOrderAsync(Guid id, CancellationToken ct)
{
    return await _repository.FindAsync(id, ct).ConfigureAwait(false);
}

// CORRECT — parallel when truly independent, with cancellation
var (orders, customer) = await (
    _orderRepo.GetByCustomerAsync(id, ct),
    _customerRepo.GetAsync(id, ct)
).WhenAll(); // use only when failures are handled per-task

// WRONG
var result = GetOrderAsync(id, ct).Result;      // deadlock risk
var result = GetOrderAsync(id, ct).Wait();      // blocks thread
public async void ProcessMessage() { ... }     // swallows exceptions
```

---

## 2. Memory & Allocations

### Rules
- **ALWAYS** use `Span<T>` / `Memory<T>` for slicing buffers — never allocate a new array for a substring or segment.
- **ALWAYS** use `ArrayPool<T>.Shared` for short-lived large buffers.
- **ALWAYS** prefer `StringBuilder` over string concatenation in loops.
- **ALWAYS** use `stackalloc` for small, fixed-size buffers in hot paths (≤ 1KB).
- **NEVER** use LINQ in extremely hot paths (allocates enumerators, closures, delegates).

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| `string.Substring()` in hot paths | Allocates a new string; use `AsSpan()` |
| `new byte[n]` for temporary buffers | GC pressure; use `ArrayPool<T>` |
| Concatenation with `+` in loops | O(n²) allocations; use `StringBuilder` or interpolated strings once |
| Boxing value types unnecessarily | Allocates on heap; prefer generics |
| `ToList()` / `ToArray()` when enumeration suffices | Forces full materialization |

### Correct Patterns
```csharp
// CORRECT — zero-allocation slice
ReadOnlySpan<char> prefix = input.AsSpan(0, 10);

// CORRECT — pooled buffer
var buffer = ArrayPool<byte>.Shared.Rent(4096);
try { /* use buffer */ }
finally { ArrayPool<byte>.Shared.Return(buffer); }

// CORRECT — stackalloc for small fixed buffers
Span<byte> hash = stackalloc byte[32];

// WRONG
var sub = bigString.Substring(0, 10);     // allocates
var buf = new byte[4096];                 // GC pressure in hot path
```

---

## 3. Collections & Data Structures

### Rules
- **ALWAYS** initialize collections with a known capacity when size is predictable: `new List<T>(capacity)`.
- **ALWAYS** prefer `Dictionary<TKey, TValue>` over `List<T>` for O(1) lookups by key.
- **ALWAYS** use `IReadOnlyList<T>` / `IReadOnlyDictionary<TKey,TValue>` for return types that should not be mutated.
- **PREFER** `HashSet<T>` over `List<T>` for membership checks.

### Hard Guardrails
| Forbidden | Reason |
|---|---|
| `List<T>.Contains()` in loops | O(n) per call; use `HashSet<T>` |
| `new List<T>()` without capacity in hot paths | Repeated internal array resizing |
| `Enumerable.Count()` when `.Any()` suffices | Forces full enumeration |
| `OrderBy().First()` | Full sort for one element; use `MinBy()` / `MaxBy()` |

---

## 4. Database & EF Core

### Rules
- **ALWAYS** use `AsNoTracking()` for read-only queries.
- **ALWAYS** project with `.Select()` — never load full entities when only a subset of columns is needed.
- **ALWAYS** paginate — never return unbounded result sets.
- **ALWAYS** use `AsSplitQuery()` for queries with multiple collection `.Include()`.
- **NEVER** do N+1 queries — always eager-load related data in a single query or use explicit batching.

### Hard Guardrails
| Forbidden | Reason |
|---|---|
| `.ToList()` before `.Where()` | Pulls entire table into memory before filtering |
| `.Include()` on every query by default | Over-fetching; load only what is needed |
| Calling DB inside a loop | N+1 — batch with `.Where(x => ids.Contains(x.Id))` |
| Storing `DbContext` as a singleton | Not thread-safe; must be Scoped |
| Raw SQL without parameterization | SQL injection |
| Manual `.sql` migration scripts | Bypasses EF Core's migration history; causes schema drift and deployment failures |

### 4.1 Database Migrations — EF Core Only

**ALWAYS** manage schema changes through EF Core migrations. Manual SQL scripts are forbidden.

#### Rules
- **ALWAYS** create migrations with `dotnet ef migrations add <MigrationName>` — never write raw `.sql` DDL scripts by hand.
- **ALWAYS** apply migrations via `dotnet ef database update` locally and via `DbContext.Database.MigrateAsync()` at application startup (or a dedicated migration job in Kubernetes).
- **ALWAYS** name migrations descriptively using PascalCase that reflects the intent: `AddOrderStatusIndex`, `RenameCustomerEmailColumn`, `CreateInvoiceTable`.
- **ALWAYS** review the auto-generated migration file before committing — EF Core can produce destructive operations (e.g., column drops) without warning.
- **ALWAYS** include the generated `Migrations/` folder in source control.
- **NEVER** edit the generated `__EFMigrationsHistory` table manually.
- **NEVER** apply schema changes directly to a database without a corresponding EF Core migration — this causes migration history drift.
- **NEVER** use `EnsureCreated()` in production — it bypasses migration history entirely.

#### Hard Guardrails
| Forbidden | Reason |
|---|---|
| Hand-written `ALTER TABLE` / `CREATE TABLE` scripts | Not tracked in migration history; causes schema drift across environments |
| `Database.EnsureCreated()` in production | Skips migration history; incompatible with `MigrateAsync()` |
| Editing an already-applied migration | Breaks migration history; create a new migration instead |
| Deleting migrations without rolling back | Leaves the database in an inconsistent state |
| Skipping migration review before commit | EF Core may silently generate destructive `DROP COLUMN` operations |

#### Correct Workflow
```bash
# 1. Make model changes in C# entities / configuration

# 2. Generate the migration
dotnet ef migrations add AddOrderStatusIndex --project src/Infrastructure --startup-project src/Api

# 3. Review the generated file in Migrations/ before committing

# 4. Apply locally
dotnet ef database update --project src/Infrastructure --startup-project src/Api

# 5. Commit both the migration file and the snapshot
git add src/Infrastructure/Migrations/
git commit -m "feat(db): add index on Order.Status"
```

```csharp
// CORRECT — apply migrations at startup (API or dedicated migration job)
public static async Task ApplyMigrationsAsync(IServiceProvider services)
{
    await using var scope = services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

// WRONG — bypasses migration history entirely
await db.Database.EnsureCreatedAsync();
```

### 4.2 Index Migrations — Manual DDL Only

**NEVER** let EF Core auto-generate index migration code. Index creation requires precise control over locking, fill factor, and tempdb usage that EF's scaffolded output does not provide.

#### Rules
- **ALWAYS** create an **empty** migration file: `dotnet ef migrations add <Name> --no-build`, then delete the auto-generated body.
- **ALWAYS** write the `CREATE INDEX` / `DROP INDEX` DDL manually inside `migrationBuilder.Sql(...)`.
- **ALWAYS** wrap with an existence check (`IF NOT EXISTS` / `IF EXISTS`) so the migration is idempotent and re-runnable.
- **ALWAYS** set `suppressTransaction: true` on `migrationBuilder.Sql` — online index operations cannot run inside a transaction.
- **ALWAYS** include the following options unless there is an explicit, documented reason not to:

| Option | Recommended Value | Reason |
|---|---|---|
| `ONLINE` | `ON` | Avoids table-level lock; allows reads/writes during build |
| `SORT_IN_TEMPDB` | `ON` | Offloads sort workload from the filegroup; reduces fragmentation |
| `FILLFACTOR` | `90` | Leaves 10% page space for future inserts; reduces page splits |
| `DATA_COMPRESSION` | `PAGE` (evaluate per table) | Reduces I/O for large tables |

- **ALWAYS** implement the `Down()` method with a matching idempotent `DROP INDEX IF EXISTS`.
- **NEVER** use `migrationBuilder.CreateIndex()` or `HasIndex()` fluent API for indexes that require any of the above options.

#### Hard Guardrails
| Forbidden | Reason |
|---|---|
| `migrationBuilder.CreateIndex(...)` for production indexes | No support for `ONLINE`, `FILLFACTOR`, `SORT_IN_TEMPDB` |
| `HasIndex()` in `OnModelCreating` for production indexes | EF generates a basic `CREATE INDEX` without performance options |
| Index DDL inside a transaction (`suppressTransaction: false`) | `ONLINE` index operations are incompatible with explicit transactions |
| Missing existence check | Migration fails on re-run or in environments where the index already exists |
| Empty `Down()` method | Makes rollback impossible; always add the matching `DROP INDEX` |

#### Correct Pattern
```csharp
// 1. Generate empty migration
// dotnet ef migrations add AddOrderStatusIndex --no-build

// 2. Manually implement the migration body:
public partial class AddOrderStatusIndex : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_Orders_Status'
                  AND object_id = OBJECT_ID(N'dbo.Orders')
            )
            BEGIN
                CREATE NONCLUSTERED INDEX IX_Orders_Status
                ON dbo.Orders (Status)
                INCLUDE (Id, CreatedAt)
                WITH (
                    ONLINE        = ON,
                    SORT_IN_TEMPDB = ON,
                    FILLFACTOR    = 90
                );
            END",
            suppressTransaction: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            IF EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_Orders_Status'
                  AND object_id = OBJECT_ID(N'dbo.Orders')
            )
            BEGIN
                DROP INDEX IX_Orders_Status ON dbo.Orders;
            END",
            suppressTransaction: true);
    }
}

// WRONG — EF-generated, no performance options
migrationBuilder.CreateIndex(
    name: "IX_Orders_Status",
    table: "Orders",
    column: "Status");
```

### Correct Patterns
```csharp
// CORRECT — projection + no tracking + pagination
var results = await _db.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == id)
    .Select(o => new OrderSummaryDto(o.Id, o.Total, o.CreatedAt))
    .Skip(page * pageSize)
    .Take(pageSize)
    .ToListAsync(ct);

// WRONG
var all = await _db.Orders.ToListAsync();          // full table in memory
var orders = _db.Orders.Include(o => o.Lines)
                       .Include(o => o.Customer)
                       .Include(o => o.Payments)   // cartesian explosion
                       .ToListAsync();
```

---

## 5. HTTP & HttpClient

### Rules
- **ALWAYS** use `IHttpClientFactory` — never instantiate `HttpClient` directly.
- **ALWAYS** configure timeouts and retry policies via Polly / `ResiliencePipeline`.
- **ALWAYS** dispose `HttpResponseMessage` and read content once.
- **PREFER** `GetFromJsonAsync<T>` / `PostAsJsonAsync` over manual serialization.

### Hard Guardrails
| Forbidden | Reason |
|---|---|
| `new HttpClient()` per request | Socket exhaustion (TIME_WAIT); DNS staleness |
| No timeout configured | Hangs indefinitely under downstream failure |
| Reading `.Content.ReadAsStringAsync()` then deserializing | Double allocation; use `ReadFromJsonAsync<T>` |
| Ignoring `CancellationToken` in HTTP calls | Cannot cancel in-flight requests |

---

## 6. Error Handling — Exceptions vs Domain Notifications

### Rules
- **ALWAYS** use exceptions for truly exceptional/unexpected conditions (infrastructure failures, null contracts violated).
- **ALWAYS** use `Result<T>` pattern or Domain Notification pattern for expected business rule violations.
- **NEVER** use exceptions for control flow in happy-path or validation scenarios.
- **NEVER** catch `Exception` broadly without re-throwing or logging with full context.

### Cost Awareness
- Exception allocation + stack trace capture: ~15.000 ns, ~1.2 KB per throw.
- Domain Notification (record + List.Add): ~50 ns, ~150 B.
- At > 5% error rate under load, exceptions will degrade p99 latency and pressure Gen1/Gen2 GC.

### Correct Patterns
```csharp
// CORRECT — Result pattern for business rules
public ErrorOr<Order> CreateOrder(CreateOrderCommand cmd)
{
    if (cmd.Items.Count == 0)
        return Error.Validation("Items", "Order must have at least one item.");
    return new Order(cmd);
}

// WRONG — exception as control flow
public Order CreateOrder(CreateOrderCommand cmd)
{
    if (cmd.Items.Count == 0)
        throw new DomainException("Order must have at least one item."); // expensive
    return new Order(cmd);
}
```

---

## 7. Caching

### Rules
- **ALWAYS** define explicit TTL for every cache entry — no indefinite caching.
- **ALWAYS** use distributed cache (`IDistributedCache` / Redis) in multi-instance deployments.
- **NEVER** use `IMemoryCache` in a multi-instance environment for shared state.
- **PREFER** cache-aside pattern; avoid write-through unless consistency is critical.
- **ALWAYS** account for cache stampede — use locking or probabilistic early expiration on high-traffic keys.

---

## 8. Dependency Injection & Lifetime

### Rules
- **ALWAYS** register `DbContext` as **Scoped**.
- **ALWAYS** register `HttpClient` via `IHttpClientFactory` (Transient internally managed).
- **NEVER** inject a Scoped service into a Singleton — causes captive dependency.
- **NEVER** resolve services from `IServiceProvider` directly in application code (Service Locator anti-pattern).

### Lifetime Rules
| Service Type | Correct Lifetime |
|---|---|
| DbContext | Scoped |
| Repositories | Scoped |
| Domain Services | Scoped or Transient |
| HttpClient | Via IHttpClientFactory (Transient) |
| Caches, config | Singleton |
| Notification handlers | Scoped |

---

## 9. Logging

### Rules
- **ALWAYS** use structured logging via `ILogger<T>` with message templates — never string interpolation.
- **ALWAYS** use `LoggerMessage.Define` or source-generated logging for hot paths.
- **NEVER** log sensitive data (passwords, tokens, PII, connection strings).
- **NEVER** log inside tight loops without rate limiting.

```csharp
// CORRECT — structured, no allocation on disabled levels
_logger.LogInformation("Order {OrderId} created for customer {CustomerId}", order.Id, order.CustomerId);

// CORRECT — zero-allocation source-generated log
[LoggerMessage(Level = LogLevel.Information, Message = "Order {OrderId} dispatched")]
partial void LogOrderDispatched(Guid orderId);

// WRONG — string interpolation allocates even when log level is disabled
_logger.LogInformation($"Order {order.Id} created"); // allocates regardless
```

---

## 10. GC & Runtime Tuning

### Awareness (do not tune blindly)
- Default GC mode is **Server GC** in ASP.NET Core — appropriate for most APIs.
- `Gen0` collections are cheap and frequent; aim to keep short-lived objects dying in Gen0.
- `Gen1/Gen2` collections trigger STW pauses — exceptions and large arrays pushed to LOH are primary causes.
- Large Object Heap (LOH) threshold: objects ≥ 85,000 bytes go directly to LOH and are never compacted by default.
- Enable `GCSettings.LargeObjectHeapCompactionMode` only when LOH fragmentation is measured, not by default.

### Signals that GC is the bottleneck
- p99 latency spikes correlate with GC pause events in Application Insights / dotnet-counters.
- `gen-1-gc-count` and `gen-2-gc-count` growing disproportionately to request rate.
- LOH size growing unboundedly over time.

---

## 11. Kubernetes — Multi-Replica Guardrails

> Projects runs 3–10 replicas. Any assumption of a single process, single memory space, or single-node state is a bug.

### 11.1 State & Stickiness

#### Rules
- **NEVER** store session state, user context, or request-scoped data in static fields or in-process memory that must survive across requests on different replicas.
- **NEVER** assume the same replica will handle consecutive requests from the same client — load balancers distribute arbitrarily.
- **ALWAYS** externalize all shared state to Redis, the database, or a message broker.
- **NEVER** use `IMemoryCache` for data that must be consistent across replicas — use `IDistributedCache`.

#### Hard Guardrails
| Forbidden | Reason |
|---|---|
| `static` mutable fields for shared business state | Each replica has its own copy — diverges silently |
| `IMemoryCache` for shared counters, flags, or tokens | Inconsistent reads across replicas |
| Sticky sessions (session affinity) as a design requirement | Creates uneven load; single point of failure for that user |
| In-process pub/sub or event buses for cross-service events | Events only reach the local replica |

---

### 11.2 Distributed Locking

#### Rules
- **ALWAYS** use a distributed lock (Redis `SETNX` / Redlock) when a critical section must execute on exactly one replica at a time.
- **NEVER** use `lock()`, `Mutex`, or `SemaphoreSlim` to protect shared cross-replica state — these are process-local.
- **ALWAYS** set a TTL on distributed locks to prevent deadlock if the holder crashes mid-execution.
- **ALWAYS** handle lock acquisition failure explicitly — either retry with backoff or return a conflict response.

```csharp
// CORRECT — distributed lock with TTL
await using var redLock = await _lockFactory.CreateLockAsync(
    resource: $"order-process:{orderId}",
    expiryTime: TimeSpan.FromSeconds(30),
    waitTime: TimeSpan.FromSeconds(5),
    retryTime: TimeSpan.FromMilliseconds(200),
    cancellationToken: ct);

if (!redLock.IsAcquired)
    return Conflict("Order is already being processed.");

// safe critical section

// WRONG — process-local lock, invisible to other replicas
lock (_lockObject) { ProcessOrder(orderId); }
```

---

### 11.3 Scheduled Tasks

#### Rules
- **NEVER** run scheduled tasks inside the API service pod — scheduled tasks are a separate service, deployed as a dedicated Kubernetes `CronJob`.
- **NEVER** use `IHostedService`, `BackgroundService`, `Timer`, or `Task.Delay` loops for scheduled work in the API service — these run once per replica and have no cluster-wide coordination.
- **ALWAYS** create a separate project/image for scheduled work. The CronJob pod runs, completes, and exits — it is not a long-running service.
- **ALWAYS** make scheduled jobs idempotent — Kubernetes may restart a failed job pod, running it more than once.
- **ALWAYS** set `concurrencyPolicy: Forbid` on the `CronJob` spec to prevent overlapping runs if the previous execution is still in progress.

#### Hard Guardrails
| Forbidden | Reason |
|---|---|
| Scheduled logic in the API pod via `BackgroundService` | Runs N times simultaneously, once per replica |
| `Timer` / `Task.Delay` loops in the API service for scheduling | Same — no cluster-wide coordination, pollutes the API process |
| Shared image between API and CronJob | Couples deployment cycles; CronJob should be independently deployable |
| `concurrencyPolicy: Allow` on long-running jobs | Overlapping executions corrupt shared state |

```yaml
# CORRECT — standalone CronJob with its own image
apiVersion: batch/v1
kind: CronJob
metadata:
  name: order-settlement-job
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: settlement
              image: myrepo/order-settlement-job:1.0.0  # separate image
              env:
                - name: ConnectionStrings__Default
                  valueFrom:
                    secretKeyRef:
                      name: db-secret
                      key: connection-string
```

---

### 11.4 Graceful Shutdown & Pod Termination

#### Rules
- **ALWAYS** implement `IHostedService.StopAsync` to drain in-flight work before the process exits.
- **ALWAYS** listen to `CancellationToken` in all loops and long-running operations — Kubernetes sends `SIGTERM` before `SIGKILL`.
- **ALWAYS** configure `terminationGracePeriodSeconds` in the Pod spec to be longer than your longest expected request or job duration.
- **ALWAYS** register shutdown hooks for message consumers (stop polling, finish current message, then exit).
- **NEVER** ignore `stoppingToken` in `BackgroundService.ExecuteAsync`.

```csharp
// CORRECT — respects cancellation on shutdown
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    await foreach (var message in _channel.ReadAllAsync(stoppingToken))
    {
        await ProcessAsync(message, stoppingToken);
    }
}

// WRONG — runs until SIGKILL, drops in-flight messages
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    while (true) // ignores stoppingToken
    {
        var msg = await _queue.DequeueAsync();
        await ProcessAsync(msg);
    }
}
```

---

### 11.5 Health Checks

This product exposes **four** endpoints with distinct purposes and audiences.

| Endpoint | Kubernetes probe | Monitored by | Purpose |
|---|---|---|---|
| `/healthz/live` | `livenessProbe` | Kubernetes | Is the process alive? |
| `/healthz/ready` | `readinessProbe` | Kubernetes | Can the pod receive traffic? |
| `/healthz/startup` | `startupProbe` | Kubernetes | Has the app finished initializing? |
| `/healthz/dependencies` | — | **DataDog** | Are all external dependencies reachable? |

#### Rules — Liveness (`/healthz/live`)
- **ONLY** checks process health: not deadlocked, not in a fatal state.
- **NEVER** checks external dependencies — a slow DB would cascade-restart all replicas simultaneously.
- Must respond in < 100ms. Returns `200` always unless the process is broken.

#### Rules — Readiness (`/healthz/ready`)
- Checks **critical dependencies only** — typically the primary database.
- Which dependencies are "critical" is project-specific: align with the team at project setup.
- A failing readiness check removes the replica from the load balancer pool without killing it.
- **NEVER** include non-critical dependencies (Redis, third-party APIs) here — an optional dependency outage should not stop the pod from receiving traffic.

#### Rules — Dependencies (`/healthz/dependencies`)
- Checks **all** external dependencies: database, Redis, message broker, downstream APIs.
- Consumed exclusively by **DataDog** for alerting and dashboards — not used by Kubernetes probes.
- Returns a structured JSON payload with per-dependency status so DataDog can alert on individual components.
- **NEVER** wire this endpoint to a Kubernetes liveness or readiness probe.

#### Rules — General
- **ALWAYS** set `initialDelaySeconds` on the liveness probe to account for app startup time.
- **ALWAYS** use `startupProbe` for slow-starting apps (EF Core migrations, warm-up caches) — it disables liveness until startup succeeds.

```csharp
// Program.cs — CORRECT four-endpoint setup
builder.Services.AddHealthChecks()
    .AddCheck("self",     () => HealthCheckResult.Healthy(),  tags: ["live"])
    .AddNpgSql(connStr,                                        tags: ["ready", "dependencies"])
    .AddRedis(redisConn,                                       tags: ["dependencies"])
    .AddRabbitMQ(rabbitConn,                                   tags: ["dependencies"]);

app.MapHealthChecks("/healthz/live",         new() { Predicate = r => r.Tags.Contains("live") });
app.MapHealthChecks("/healthz/ready",        new() { Predicate = r => r.Tags.Contains("ready") });
app.MapHealthChecks("/healthz/startup",      new() { Predicate = r => r.Tags.Contains("live") });
app.MapHealthChecks("/healthz/dependencies", new() {
    Predicate        = r => r.Tags.Contains("dependencies"),
    ResponseWriter   = UIResponseWriter.WriteHealthCheckUIResponse  // structured JSON for DataDog
});
```

```yaml
# Kubernetes probe config
livenessProbe:
  httpGet:
    path: /healthz/live
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 15

readinessProbe:
  httpGet:
    path: /healthz/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10

startupProbe:
  httpGet:
    path: /healthz/startup
    port: 8080
  failureThreshold: 30
  periodSeconds: 5
```

---

### 11.6 Connection Pooling Under Horizontal Scale

#### Rules
- **ALWAYS** calculate max connection pool size accounting for all replicas:
  `max_connections_per_replica × max_replicas ≤ DB_max_connections × 0.8` (leave 20% headroom).
- **ALWAYS** use PgBouncer or a connection pooler in front of PostgreSQL when replica count is variable.
- **ALWAYS** set explicit `Min Pool Size` and `Max Pool Size` in the connection string — never rely on defaults.
- **ALWAYS** configure Redis `abortConnect=false` and set `connectTimeout` and `syncTimeout` explicitly.
- **NEVER** open a new connection per request outside of the pool — connection establishment is expensive (~5–10ms).

```
Example with 10 replicas:
  Max pool size per replica: 20
  Total connections to DB: 200
  PostgreSQL max_connections: 300 → 200/300 = 66% ✓

  If max_connections_per_replica = 50:
  Total: 500 > 300 → connection starvation under full scale ✗
```

---

### 11.7 Resource Limits & .NET Runtime

#### Rules
- **ALWAYS** set `resources.requests` and `resources.limits` in the Pod spec — unbounded pods starve neighbors.
- **ALWAYS** set `DOTNET_GCHeapHardLimit` or use `DOTNET_GCConserveMemory` when memory limits are tight — otherwise the GC will expand the heap beyond the container limit and get OOMKilled.
- **ALWAYS** set `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` in containers that don't need locale-sensitive operations — reduces startup memory.
- **PREFER** setting CPU requests equal to CPU limits for predictable scheduling (Guaranteed QoS class).
- **NEVER** set memory limit below 2× the expected working set — GC needs headroom to operate efficiently.

```yaml
# CORRECT — explicit limits with GC awareness
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "1000m"
    memory: "512Mi"
env:
  - name: DOTNET_GCHeapHardLimit         # match container memory limit
    value: "471859200"                   # 450Mi in bytes (leave ~12% for non-heap)

# WRONG — no limits set
resources: {}
```

---

### 11.8 Configuration & Secrets

#### Rules
- **ALWAYS** load configuration from environment variables or a secrets manager (Vault, Kubernetes Secrets mounted as env vars) — never bake secrets into the image.
- **NEVER** read files from local disk that are expected to persist across restarts — pods are ephemeral; use PersistentVolumeClaims or external storage.
- **ALWAYS** use `IOptionsMonitor<T>` over `IOptions<T>` for config that can change without redeployment.
- **NEVER** cache configuration values in static fields at startup — prevents live reload.

---

### 11.9 Idempotency

#### Rules
- **ALWAYS** design all write endpoints (POST, PUT, PATCH) and message consumers to be idempotent.
- **ALWAYS** use an idempotency key (client-provided or derived from payload hash) stored in a distributed store to deduplicate retries.
- Rationale: Kubernetes will reschedule pods mid-request; clients and message brokers will retry. Without idempotency, retries cause duplicate writes.

```csharp
// CORRECT — idempotency check before processing
var key = $"order-create:{cmd.IdempotencyKey}";
if (await _cache.GetAsync(key, ct) is not null)
    return AlreadyProcessed();

await ProcessOrderAsync(cmd, ct);
await _cache.SetAsync(key, "1", new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24) }, ct);
```

---

## 12. Magic Values

**NEVER** use magic values — unnamed literal strings, numbers, or booleans scattered across the code. Every fixed value with business or technical meaning must be declared as a named constant, `enum`, or `static readonly` field.

### Rules
- **ALWAYS** declare fixed strings and numbers as `const` or `static readonly` in a dedicated constants class or the class that owns the concept.
- **ALWAYS** use `enum` for a closed set of named states or options — never compare against raw integer or string literals.
- **NEVER** repeat the same literal in more than one place. A literal used twice is already a constant waiting to be named.
- **NEVER** embed configuration-like values (timeouts, limits, route segments, claim names, header names) as inline literals — extract to constants or configuration.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| `if (status == "active")` | String typo causes silent logic failure; no refactoring safety |
| `Task.Delay(5000)` inline | `5000` is meaningless without a name; changes require a grep across the codebase |
| `if (role == 2)` | Integer role codes are unreadable and collision-prone |
| `TimeSpan.FromSeconds(30)` scattered in multiple places | Single source of truth violated; inconsistent timeouts after partial edits |
| `[Authorize(Roles = "app-admin")]` with inline string | Already covered in §13, but magic strings in auth are doubly dangerous |

### Correct Patterns
```csharp
// CORRECT — named constants in a dedicated class
public static class OrderStatus
{
    public const string Active    = "active";
    public const string Cancelled = "cancelled";
    public const string Fulfilled = "fulfilled";
}

public static class Timeouts
{
    public static readonly TimeSpan ExternalApiCall = TimeSpan.FromSeconds(30);
    public static readonly TimeSpan CacheExpiry     = TimeSpan.FromMinutes(5);
}

public static class ClaimNames
{
    public const string TenantId = "tenant_id";
    public const string UserId   = "sub";
}

// CORRECT — enum for a closed set of states
public enum PaymentState { Pending, Authorised, Captured, Refunded, Failed }

// CORRECT — usage reads like prose
if (order.Status == OrderStatus.Active) { ... }
await Task.Delay(Timeouts.ExternalApiCall, ct);
var tenantId = user.FindFirst(ClaimNames.TenantId)?.Value;

// WRONG
if (order.Status == "active") { ... }          // magic string
await Task.Delay(30000, ct);                   // magic number
if (payment.State == 3) { ... }                // magic integer
```

---

## 13. Open Source & NuGet Dependency Policy

> See global policy: [`engineer/knowledge/ABI FOSS Policy.md`](../ABI%20FOSS%20Policy.md)

The license traffic light, hard guardrails, dev/test exemption, process, and proprietary code header requirements apply to all NuGet packages. For .NET-specific dev/test exemption examples (xUnit, Moq scoped to `*.Tests.csproj`), refer to the global policy's Section 3.

---

## 14. Authentication & Authorization

### 14.1 Authentication — Keycloak (Company SSO)

**ALWAYS** authenticate through the company's private Keycloak instance. No other identity provider, custom auth scheme, or local user store is permitted for production services.

#### Rules
- **ALWAYS** use the company Keycloak instance as the sole identity provider — validated via JWT Bearer tokens.
- **ALWAYS** validate the token issuer (`iss` claim) against the known Keycloak realm URL — reject tokens from any other issuer.
- **ALWAYS** validate the audience (`aud` claim) to ensure the token was issued for this specific service.
- **ALWAYS** rely on Keycloak's JWKS endpoint for public key validation — never hardcode signing keys.
- **NEVER** implement a custom authentication handler, local password store, or alternative identity provider.
- **NEVER** trust a token without full signature validation — do not use `TokenValidationParameters` with `ValidateSignature = false`.
- **NEVER** bypass authentication on any non-public endpoint via `[AllowAnonymous]` without explicit team approval and documentation.

#### Hard Guardrails
| Forbidden | Reason |
|---|---|
| Custom `IAuthenticationHandler` for identity | Bypasses company SSO; creates an unaudited auth path |
| `ValidateIssuer = false` | Accepts tokens from any issuer, including forged ones |
| `ValidateAudience = false` | Token intended for service A accepted by service B |
| `ValidateSignature = false` / `RequireSignedTokens = false` | Accepts unsigned or tampered tokens |
| Storing credentials or secrets for Keycloak in source code | Use environment variables or the secrets manager |
| API keys or Basic Auth as primary auth mechanism | Not auditable, not revocable via Keycloak, violates SSO policy |

#### Correct Setup
```csharp
// Program.cs — CORRECT Keycloak JWT Bearer setup
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority  = builder.Configuration["Keycloak:Authority"]; // https://keycloak.company.com/realms/{realm}
        options.Audience   = builder.Configuration["Keycloak:Audience"];  // client-id of this service
        options.RequireHttpsMetadata = true; // NEVER set false in production

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            // Keys fetched automatically from Keycloak's JWKS endpoint via Authority
        };
    });

// WRONG — disabling validation
options.TokenValidationParameters = new TokenValidationParameters
{
    ValidateIssuer    = false,  // accepts any issuer
    ValidateAudience  = false,  // accepts token for any service
    RequireSignedTokens = false // accepts unsigned tokens
};
```

```json
// appsettings.json — values loaded from environment variables in production
{
  "Keycloak": {
    "Authority": "https://keycloak.company.com/realms/my-realm",
    "Audience":  "my-service-client-id"
  }
}
```

---

### 14.2 Authorization — Role-Based (Application Roles)

**ALWAYS** enforce authorization using roles defined and managed within the application. Roles are asserted from the JWT claims emitted by Keycloak.

#### Rules
- **ALWAYS** use `[Authorize(Roles = "...")]` or policy-based authorization backed by role claims — never write manual permission checks in business logic.
- **ALWAYS** define roles as constants or an enum in a dedicated class — never use magic strings scattered across controllers.
- **ALWAYS** apply `[Authorize]` at the controller level as a default; explicitly opt out specific actions with `[AllowAnonymous]` only when justified.
- **ALWAYS** map Keycloak roles to the standard `ClaimTypes.Role` claim so `[Authorize(Roles = "...")]` works natively.
- **NEVER** use `User.Identity.Name` or `User.FindFirst("sub")` as the sole authorization check — identity ≠ authorization.
- **NEVER** embed role strings (`"admin"`, `"viewer"`) directly in controller methods — use the constants class.
- **NEVER** perform authorization logic inside domain services or repositories — it belongs exclusively at the API/application boundary.

#### Hard Guardrails
| Forbidden | Reason |
|---|---|
| `if (user.Name == "john.doe") { ... }` | Identity-based authorization — not scalable, not auditable |
| Role strings as magic literals in `[Authorize]` | Typos cause silent authorization bypass; use constants |
| Authorization logic inside domain services | Violates separation of concerns; untestable in isolation |
| Skipping `[Authorize]` on controller, relying only on action-level | One unannotated action becomes an open endpoint |
| Granting permissions based on claims other than roles without OSLCT/security review | Custom claim-based rules must be explicitly designed and reviewed |

#### Correct Patterns

```csharp
// CORRECT — roles as constants, never magic strings
public static class AppRoles
{
    public const string Admin   = "app-admin";
    public const string Manager = "app-manager";
    public const string Viewer  = "app-viewer";
}

// CORRECT — controller-level default + action-level override
[ApiController]
[Route("api/orders")]
[Authorize]  // all actions require authentication by default
public class OrdersController : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = AppRoles.Viewer)]  // viewers can read
    public async Task<IActionResult> GetAll() { ... }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Manager}")]  // only admin or manager can create
    public async Task<IActionResult> Create(CreateOrderCommand cmd) { ... }

    [HttpDelete("{id}")]
    [Authorize(Roles = AppRoles.Admin)]  // only admin can delete
    public async Task<IActionResult> Delete(Guid id) { ... }
}

// CORRECT — policy-based authorization for complex rules
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CanApproveOrders", policy =>
        policy.RequireRole(AppRoles.Admin, AppRoles.Manager));
});

// WRONG — magic strings
[Authorize(Roles = "admin")]  // typo-prone, no refactoring safety

// WRONG — authorization in domain logic
public class OrderService
{
    public void DeleteOrder(Guid id, ClaimsPrincipal user)
    {
        if (!user.IsInRole("admin")) throw new UnauthorizedException(); // belongs in the controller/middleware
    }
}
```

#### Keycloak Role Mapping
Keycloak emits roles under `realm_access.roles` or `resource_access.{client}.roles` — not under `ClaimTypes.Role` by default. Map them explicitly:

```csharp
// Program.cs — map Keycloak roles to ClaimTypes.Role
options.Events = new JwtBearerEvents
{
    OnTokenValidated = ctx =>
    {
        var claimsIdentity = ctx.Principal?.Identity as ClaimsIdentity;
        if (claimsIdentity is null) return Task.CompletedTask;

        // Map realm-level roles
        var realmAccess = ctx.Principal?.FindFirst("realm_access")?.Value;
        if (realmAccess is not null)
        {
            var roles = JsonSerializer.Deserialize<KeycloakRealmAccess>(realmAccess);
            foreach (var role in roles?.Roles ?? [])
                claimsIdentity.AddClaim(new Claim(ClaimTypes.Role, role));
        }

        return Task.CompletedTask;
    }
};

record KeycloakRealmAccess([property: JsonPropertyName("roles")] string[] Roles);
```
