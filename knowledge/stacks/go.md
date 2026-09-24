# Knowledge: Go (Golang) — Performance Best Practices & Guardrails

> Applies to: Go 1.22+
> Scope: High-performance microservices, backend APIs, data pipelines, and CLI tools.
> Deployment: Kubernetes cluster, 3–10 replicas, horizontal autoscaling.

---

## 1. Async & Concurrency / Threading / Reactive Execution

Go does not use traditional threads or reactive programming models like CompletableFuture. Instead, it relies on **Goroutines** managed by the Go runtime scheduler (m:n scheduler) and communicated through **Channels** and primitives from the `sync` and `golang.org/x/sync` packages. 

### Rules
- **ALWAYS** manage goroutine lifetimes explicitly. Every goroutine must have a clear termination signal (e.g., context cancellation, channel close, or WaitGroup completion). Goroutine leaks are memory leaks.
- **ALWAYS** propagate `context.Context` from the entry point (HTTP handler, gRPC interceptor, or event consumer) to all downstream I/O, database, and API operations.
- **ALWAYS** check for and recover from panics inside newly spawned goroutines. A panic in a goroutine that is not recovered will crash the entire process.
- **ALWAYS** use `sync.WaitGroup` or `golang.org/x/sync/errgroup` to coordinate parallel tasks, ensuring all spawned routines complete before exiting the caller.
- **ALWAYS** run the race detector during testing (`go test -race`) and integration testing.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Spawning a goroutine inside a loop without binding iteration variables | Prior to Go 1.22, loop variables were reused, causing data races and logic bugs. (In Go 1.22+, this is fixed, but binding or passing as parameter is still best practice for readability and older compiler compatibility). |
| Writing to a closed channel | Triggers a runtime panic immediately. |
| Closing a channel from the receiver side | Only the sender should close a channel to prevent panics on subsequent writes. |
| Locking a `sync.Mutex` or `sync.RWMutex` without `defer m.Unlock()` | Risk of deadlock if the function returns early on an error pathway. |
| Using `time.Sleep` to wait for a concurrent operation | Unreliable, non-deterministic, and slows down executions; use channels, contexts, or WaitGroups. |
| Storing a `context.Context` inside a struct | Contexts must be passed explicitly as the first parameter of functions; storing them in structs leads to lifetime and synchronization issues (except in HTTP requests or runner config wrappers). |

### Correct Patterns
```go
// CORRECT — Using errgroup.Group for coordinated parallel execution with limit and cancellation
func FetchOrderData(ctx context.Context, orderID string) (*OrderDetails, error) {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(4) // Prevent unbounded concurrent goroutine spawns

    var order *Order
    var payment *Payment
    var customer *Customer

    g.Go(func() error {
        var err error
        order, err = db.GetOrder(ctx, orderID)
        return err
    })

    g.Go(func() error {
        var err error
        payment, err = paymentClient.GetPaymentByOrderID(ctx, orderID)
        return err
    })

    g.Go(func() error {
        var err error
        customer, err = customerClient.GetCustomerByOrderID(ctx, orderID)
        return err
    })

    if err := g.Wait(); err != nil {
        return nil, fmt.Errorf("failed to fetch order details: %w", err)
    }

    return &OrderDetails{Order: order, Payment: payment, Customer: customer}, nil
}

// CORRECT — Recovering from panic inside a spawned background goroutine
go func() {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Recovered from panic in background worker: %v\nStack: %s", r, debug.Stack())
        }
    }()
    processBackgroundQueue()
}()

// WRONG — Spawning unsupervised goroutines, causing leaks and process crashes
go func() {
    for {
        msg := <-ch // Blocks forever if channel is never closed/written to. Goroutine leak!
        process(msg) // If this panics, the entire microservice crashes.
    }
}()
```

---

## 2. Memory & Allocations / Garbage Collection / Optimization

The Go Garbage Collector is a concurrent, tri-color mark-and-sweep collector. Go prioritizes low latency (sub-millisecond GC pauses) over high throughput. Maximizing Go performance requires minimizing allocations that escape to the heap.

### Rules
- **ALWAYS** check for heap escapes during development using `go build -gcflags="-m"`.
- **ALWAYS** pre-allocate slices and maps if the target size is known or predictable using `make([]T, 0, capacity)` or `make(map[K]V, capacity)`.
- **ALWAYS** use `sync.Pool` to reuse frequently allocated, short-lived large objects (such as `[]byte` buffers, JSON decoders, and custom connection structs).
- **ALWAYS** use `strings.Builder` or `bytes.Buffer` for string concatenation inside loops rather than the `+` operator.
- **PREFER** passing small structs (less than 128 bytes) by value. Passing pointers to small structs frequently causes them to escape to the heap, which increases GC pressure.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Using `append` on a slice in a loop without initial capacity | Forces repeated slice allocations and memory copies as the underlying array grows. |
| Returning pointers to local variables in hot paths unnecessarily | Triggers compiler escape analysis to allocate the variable on the heap instead of the stack. |
| Using `interface{}` (`any`) in high-performance hot paths | Causes boxing overhead; runtime must allocate memory to wrap the type, disabling compiler optimizations. |
| Converting `[]byte` to `string` in loops repeatedly | Allocates new memory for the string copy. Use zero-copy conversions or direct byte slices. |
| Overusing pointers on fields for small data types (e.g., `*int64`, `*string`) | Increases pointer-chasing during GC mark phase, degrading memory locality and throughput. |

### Correct Patterns
```go
// CORRECT — sync.Pool for zero-allocation byte buffer recycling
var bufPool = sync.Pool{
    New: func() any {
        return bytes.NewBuffer(make([]byte, 0, 4096))
    },
}

func ProcessPayload(data []byte) {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufPool.Put(buf)
    }()

    buf.Write(data)
    // process using the pooled buffer
}

// CORRECT — Pre-allocating slice capacity
items := make([]ItemResult, 0, len(rawItems))
for _, raw := range rawItems {
    items = append(items, transform(raw))
}

// WRONG — Loop slice growth, forcing frequent reallocations
var items []ItemResult
for _, raw := range rawItems {
    items = append(items, transform(raw)) // Allocates and copies repeatedly under scale
}

// WRONG — String concatenation in loops
var res string
for _, s := range stringSlice {
    res += s // O(n²) memory allocations!
}
```

---

## 3. Collections & Data Structures / High-Performance Collections

Go provides three main built-in collection primitives: Arrays, Slices, and Maps. Efficient usage is critical under horizontal scale.

### Rules
- **ALWAYS** pre-size maps if the size is known: `make(map[string]int, expectedSize)`. This prevents expensive rehashing of the map buckets.
- **ALWAYS** protect concurrent read/writes to maps using `sync.RWMutex` or `sync.Map`. Unsynchronized concurrent access to a standard map causes an unrecoverable process crash.
- **ALWAYS** use the built-in `clear(m)` (introduced in Go 1.21) to empty map contents. This retains the allocated bucket memory, preventing re-allocations on reuse.
- **PREFER** `sync.RWMutex` + standard map for read-heavy workloads with frequent modifications. Use `sync.Map` *only* if the key set is highly stable and reads outnumber writes by several orders of magnitude (e.g., cache configurations).

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Unsynchronized read/write on a standard map | Triggers `fatal error: concurrent map writes` which cannot be recovered by `recover()`; crashes the app instantly. |
| Storing pointers as map keys | Causes significant GC mark-phase degradation; GC must traverse every pointer in the map. |
| Keeping slice references alive on a large underlying array | Slicing `largeArray[0:2]` retains the entire array in memory; copy the elements to a new slice if the rest is garbage collected. |
| Using `sync.Map` for write-heavy key-value pools | Poor performance compared to standard map protected by a fine-grained mutex. |

### Correct Patterns
```go
// CORRECT — Thread-safe concurrent map with RWMutex
type SafeCounter struct {
    mu sync.RWMutex
    m  map[string]int
}

func (s *SafeCounter) Get(key string) (int, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    val, ok := s.m[key]
    return val, ok
}

func (s *SafeCounter) Set(key string, val int) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.m[key] = val
}

// CORRECT — Copying a slice segment to free the large underlying array from memory
func GetHeader(hugePayload []byte) []byte {
    if len(hugePayload) < 4 {
        return nil
    }
    header := make([]byte, 4)
    copy(header, hugePayload[0:4])
    return header // The massive hugePayload array can now be safely garbage collected
}

// WRONG — Unsynchronized map access
type BadCounter struct {
    m map[string]int
}

func (b *BadCounter) Set(k string, v int) {
    b.m[k] = v // Will crash the process when called concurrently with Get or Set!
}
```

---

## 4. Database & ORM Integration

For database integrations, Go projects use GORM, sqlx, or raw sql drivers. Production configurations require careful query structuring, migration tracking, and index execution.

### Rules
- **ALWAYS** use parameterized queries (GORM's `?` placeholders, sqlx's `db.Queryx("...", arg)`). String formatting/concatenation for SQL statements is strictly forbidden.
- **ALWAYS** manage database migrations through raw, numbered SQL migration files via version-controlled tools (such as `golang-migrate/migrate` or `pressly/goose`).
- **ALWAYS** disable automatic schema migrations in production. GORM's `AutoMigrate` or similar features are strictly forbidden in staging and production.
- **ALWAYS** configure explicit database connection pool limits: `SetMaxOpenConns`, `SetMaxIdleConns`, and `SetConnMaxLifetime`.
- **ALWAYS** use PostgreSQL `CREATE INDEX CONCURRENTLY` or MySQL `ONLINE = ON` index migrations. 
- **ALWAYS** set `suppressTransaction: true` or execute index migrations outside of transactional DDL blocks (PostgreSQL does not allow `CONCURRENTLY` index builds within transactions).

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Raw SQL construction with `fmt.Sprintf` or string additions | Critical SQL injection vulnerability. |
| GORM `AutoMigrate` in production environments | Causes lock contention, unpredictable state, and can lead to data loss or migration drift. |
| Missing limits on database connection pools | Default is unlimited, which quickly exhausts database connection limits under high replica counts. |
| Forgetting to call `rows.Close()` on database result sets | Causes resource leaks, rapidly exhausting database connection pools and file descriptors. |
| Executing queries inside a loop (N+1 queries) | High network latency and thread blocking; batch query using `IN (?)` operators. |

### Correct Patterns
```go
// CORRECT — Goose/Golang-Migrate Idempotent Index Build with Transaction Suppressed (Up & Down)
// file: 0002_add_order_status_index.up.sql
// goose Up
// goose StatementBegin
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status 
ON orders (status) 
WHERE status != 'completed';
// goose StatementEnd

// file: 0002_add_order_status_index.down.sql
// goose Down
// goose StatementBegin
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_status;
// goose StatementEnd

// CORRECT — Database Connection Pool Config and Query Execution
func InitDatabase(dsn string) (*sql.DB, error) {
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, err
    }

    // Calculations: Max Replicas = 10. Max DB connections = 300.
    // 10 replicas * 20 max open conns = 200 conns (leaving 100 headroom for analytics/maintenance)
    db.SetMaxOpenConns(20)
    db.SetMaxIdleConns(10)
    db.SetConnMaxLifetime(30 * time.Minute)
    db.SetConnMaxIdleTime(10 * time.Minute)

    return db, nil
}

// CORRECT — Parameterized Query with Context and Row Closing
func GetActiveOrders(ctx context.Context, db *sql.DB, customerID string) ([]Order, error) {
    query := `SELECT id, total, created_at FROM orders WHERE customer_id = $1 AND status = 'active'`
    
    rows, err := db.QueryContext(ctx, query, customerID)
    if err != nil {
        return nil, err
    }
    defer rows.Close() // ALWAYS close!

    var orders []Order
    for rows.Next() {
        var o Order
        if err := rows.Scan(&o.ID, &o.Total, &o.CreatedAt); err != nil {
            return nil, err
        }
        orders = append(orders, o)
    }
    
    if err := rows.Err(); err != nil {
        return nil, err
    }
    return orders, nil
}

// WRONG — SQL Injection vulnerability
query := fmt.Sprintf("SELECT id FROM orders WHERE customer_id = '%s'", unsafeInput)
db.Query(query) // VULNERABLE to SQL injection

// WRONG — Running DB queries inside loops (N+1)
for _, orderID := range orderIDs {
    var details Details
    db.QueryRow("SELECT * FROM order_details WHERE order_id = $1", orderID).Scan(&details) // High database overhead
}
```

---

## 5. HTTP & Remote API Connections / Resilient HTTP Clients

Go's default HTTP client (`http.DefaultClient`) is forbidden in production as it has no timeout configured. Remote calls must use connection pooling, circuit breakers, and explicit request cancellation.

### Rules
- **ALWAYS** configure custom timeouts on `http.Client`: `Timeout`, `Dialer.Timeout`, `TLSHandshakeTimeout`, `ResponseHeaderTimeout`, and `IdleConnTimeout`.
- **ALWAYS** wrap every outgoing request in a context with a timeout: `context.WithTimeout(ctx, duration)`.
- **ALWAYS** drain and close `response.Body` explicitly inside a `defer` block. Leaving bytes unread or the body unclosed leaks TCP sockets.
- **ALWAYS** reuse TCP connections by overriding the standard transport's `MaxIdleConns` and `MaxIdleConnsPerHost`.
- **ALWAYS** configure retries with exponential backoff and a circuit breaker (using libraries like `sony/gobreaker` or `hashicorp/go-retryablehttp`).

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Using `http.DefaultClient` or `http.DefaultTransport` | Default client has infinite timeout, meaning a slow downstream API can hang your entire service pool. |
| Forgetting to close `resp.Body` | Leaks file descriptors, resulting in memory leaks and "too many open files" crashes. |
| Reading the entire response body into memory using `io.ReadAll` if only streaming is required | High memory usage; stream payloads with `json.NewDecoder` or write to disk. |
| Retrying failed network requests without exponential backoff and jitter | Contributes to "thundering herd" issues and can crash struggling downstream APIs. |

### Correct Patterns
```go
// CORRECT — Custom resilient HTTP Client configuration
var resilientHTTPClient = &http.Client{
    Timeout: 10 * time.Second, // Hard limit for the entire roundtrip
    Transport: &http.Transport{
        DialContext: (&net.Dialer{
            Timeout:   3 * time.Second, // Timeout to establish TCP connection
            KeepAlive: 30 * time.Second,
        }).DialContext,
        TLSHandshakeTimeout:   2 * time.Second,
        ResponseHeaderTimeout: 5 * time.Second,
        MaxIdleConns:          100,
        MaxIdleConnsPerHost:   20, // Essential for microservices calling the same downstream host
        IdleConnTimeout:       90 * time.Second,
    },
}

func FetchUserData(ctx context.Context, userID string) (*UserData, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second) // Dynamic timeout
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.company.com/users/"+userID, nil)
    if err != nil {
        return nil, err
    }

    resp, err := resilientHTTPClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("http request failed: %w", err)
    }
    defer func() {
        // ALWAYS drain the body to allow connection reuse, then close it
        _, _ = io.Copy(io.Discard, resp.Body)
        _ = resp.Body.Close()
    }()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
    }

    var data UserData
    if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
        return nil, fmt.Errorf("failed to decode response: %w", err)
    }
    return &data, nil
}

// WRONG — Using the default HTTP client with no timeout
func BadHTTPCall() {
    resp, err := http.Get("https://slow-api.com/data") // Can hang the goroutine infinitely
    if err != nil {
        return
    }
    // resp.Body is not closed here: connection leaked!
}
```

---

## 6. Error Handling & Flow Control

Go handles errors explicitly by returning them as values. Standard errors are lightweight, but panics are expensive and disruptive.

### Rules
- **ALWAYS** check errors immediately. Nested scopes must not process state if an error was returned.
- **ALWAYS** wrap errors to add context: `fmt.Errorf("failed to decode invoice: %w", err)`. Use `%w` to preserve the original error for inspection.
- **ALWAYS** inspect errors using `errors.Is` (for comparing error instances) and `errors.As` (for checking custom error types).
- **NEVER** use `panic` and `recover` for normal business flow control or validation logic. Panics are for unrecoverable system failures only.
- **NEVER** compare error values by string equality (e.g., `err.Error() == "not found"`).

### Cost Analysis (Benchmark comparison)
- Normal error flow (returning `(nil, err)`): ~30 ns per error.
- Panic/Recover capture: ~18,000 ns per panic (due to runtime memory captures and stack walks).
- Frequent panics degrade performance and place heavy pressure on the garbage collector under load.

### Correct Patterns
```go
// CORRECT — Result pattern with explicit error wrapping and type extraction
var ErrOrderNotFound = errors.New("order not found")

type DomainError struct {
    Code    string
    Message string
}

func (e *DomainError) Error() string {
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func ProcessOrder(ctx context.Context, id string) (*Order, error) {
    order, err := db.FindOrder(ctx, id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, fmt.Errorf("%w: id %s", ErrOrderNotFound, id)
        }
        return nil, fmt.Errorf("db lookup failed: %w", err)
    }

    if order.Total <= 0 {
        return nil, &DomainError{Code: "INVALID_TOTAL", Message: "order total must be positive"}
    }

    return order, nil
}

// Caller execution
order, err := ProcessOrder(ctx, "order_123")
if err != nil {
    var dErr *DomainError
    if errors.As(err, &dErr) {
        log.Printf("Domain error occurred: %s", dErr.Message)
        return
    }
    if errors.Is(err, ErrOrderNotFound) {
        log.Printf("Not found: %v", err)
        return
    }
    log.Printf("Unexpected failure: %v", err)
    return
}

// WRONG — Panic for business flow control
func ProcessOrderBad(id string) *Order {
    if id == "" {
        panic("order id cannot be empty") // EXTREMELY expensive; crashes process if unrecovered
    }
    // ...
    return &Order{}
}
```

---

## 7. Caching Systems

Microservice environments require multi-instance cache strategies. Redis is the standard distributed cache.

### Rules
- **ALWAYS** define an explicit TTL (Time-to-Live) for every cache key. High-throughput keys must not cache indefinitely.
- **ALWAYS** use a distributed cache (e.g., Redis using `go-redis/v9`) for shared state. `in-memory` local cache (e.g., `sync.Map` or local cache packages) is forbidden for consistency-critical data.
- **ALWAYS** implement the **Singleflight** pattern (`golang.org/x/sync/singleflight`) to mitigate Cache Stampede (where thousands of concurrent requests query the database for the same key during a cache miss).
- **ALWAYS** handle cache failures gracefully. The application must fall back to the database if Redis goes offline.

### Correct Patterns
```go
import (
    "context"
    "time"
    "github.com/redis/go-redis/v9"
    "golang.org/x/sync/singleflight"
)

type OrderCache struct {
    rdb         *redis.Client
    db          *sql.DB
    sfGroup     singleflight.Group
    cacheExpiry time.Duration
}

func (c *OrderCache) GetOrder(ctx context.Context, orderID string) ([]byte, error) {
    cacheKey := "order:" + orderID

    // 1. Try Cache Lookup
    val, err := c.rdb.Get(ctx, cacheKey).Bytes()
    if err == nil {
        return val, nil
    }

    // 2. Cache Miss: Deduplicate DB queries using Singleflight
    v, err, _ := c.sfGroup.Do(orderID, func() (any, error) {
        // Double-check cache inside singleflight to ensure previous flight didn't write it
        dbVal, dbErr := c.fetchFromDatabase(ctx, orderID)
        if dbErr != nil {
            return nil, dbErr
        }

        // 3. Write back to Redis
        _ = c.rdb.Set(ctx, cacheKey, dbVal, c.cacheExpiry).Err()
        return dbVal, nil
    })

    if err != nil {
        return nil, err
    }
    return v.([]byte), nil
}
```

---

## 8. Dependency Injection / Lifetime Management

Go prefers constructor injection over runtime DI frameworks (like Uber's Fx or Wire) to ensure type safety, predictability, and fast startup performance.

### Rules
- **ALWAYS** define dependencies as concrete fields and pass them explicitly through factory functions (e.g., `NewService(db, client)`).
- **ALWAYS** align component lifecycles to prevent **Captive Dependencies** (injecting an ephemeral or request-scoped context/object into a long-running singleton).
- **NEVER** use package-level global variables for mutable state, database connections, or HTTP clients.
- **NEVER** pass `context.Context` inside constructors. Pass contexts through method calls.

### Lifetime Mapping
| Component | Scope | Lifetime Description |
|---|---|---|
| `sql.DB` / `redis.Client` | **Singleton** | Initialized once at startup, shared across all request goroutines. |
| Repositories & Clients | **Singleton** | Read-only structures containing connection references. |
| Controllers & Routers | **Singleton** | Routes incoming traffic, initialized at application start. |
| Context (`context.Context`) | **Scoped** | Created per request. Never stored in singleton fields. |
| Logger (with request fields) | **Scoped** | Instantiated per API request, passed down via context or parameter. |
| Request Validators | **Transient** | Constructed on-demand per payload, garbage collected immediately. |

### Correct Patterns
```go
// CORRECT — Constructor Dependency Injection
type OrderService struct {
    db          *sql.DB           // Singleton reference
    emailClient *EmailClient      // Singleton reference
}

func NewOrderService(db *sql.DB, ec *EmailClient) *OrderService {
    return &OrderService{
        db:          db,
        emailClient: ec,
    }
}

func (s *OrderService) CompleteOrder(ctx context.Context, orderID string) error {
    // Context is passed as the first parameter, not stored in the struct
    tx, err := s.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()
    // process within transaction...
    return tx.Commit()
}

// WRONG — Global State and Captive Context
var GlobalDB *sql.DB // Package-level global variables are forbidden

type BadService struct {
    ctx context.Context // FORBIDDEN: Captures request context in a long-lived service struct
}
```

---

## 9. Structured Logging

Go microservices must write clean, structured log payloads in JSON format. String interpolation inside log messages is strictly forbidden.

### Rules
- **ALWAYS** use structured loggers: `uber-go/zap` or the standard library's `log/slog` (introduced in Go 1.21).
- **ALWAYS** use message templates and append properties as structured key-value pairs (or strongly typed attributes).
- **ALWAYS** mask Personally Identifiable Information (PII) before writing logs (e.g., credit card numbers, passwords, personal addresses).
- **ALWAYS** check whether a log level is enabled if constructing complex log properties, preventing allocation on silent levels.

### Correct Patterns
```go
// CORRECT — Structured logging with slog (standard library)
import "log/slog"

func CreateOrderHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    orderID := "ord_456"
    customerID := "cust_789"
    
    // Structured properties, no dynamic string allocation
    slog.InfoContext(ctx, "order created successfully",
        slog.String("order_id", orderID),
        slog.String("customer_id", customerID),
        slog.Float64("total", 149.99),
    )
}

// CORRECT — Masking sensitive PII
func LogUserAddress(ctx context.Context, address *Address) {
    slog.InfoContext(ctx, "processing shipment",
        slog.String("zip_code", address.Zip),
        slog.String("street_masked", maskString(address.Street)), // Never print raw address
    )
}

// WRONG — String interpolation forces allocations even when debug log is disabled
slog.Debug(fmt.Sprintf("Order %s processing failed: %v", orderID, err)) // FORBIDDEN!
```

---

## 10. GC / Runtime Tuning & Profiling

Go microservices running in Kubernetes must configure explicit container limits and match Go runtime options to these settings to prevent out-of-memory crashes.

### Rules
- **ALWAYS** set `GOMEMLIMIT` environment variable to **90%** of the Kubernetes container memory limit (leaving 10% for OS and heap overheads).
- **ALWAYS** use Go's pprof tool to analyze runtime performance under load. Bind the pprof endpoints to an **internal-only private port** (never expose pprof to the public internet).
- **ALWAYS** set `GOGC` explicitly if memory allocation patterns require customization. Default `100` triggers GC when heap size doubles; lower values reduce heap footprint but increase CPU usage.
- **NEVER** use `runtime.GC()` programmatically in performance paths.

```
Example: Container Memory Limit = 1Gi (1024Mi)
GOMEMLIMIT = 90% of 1Gi = 921Mi (966367641 bytes)
Set env: GOMEMLIMIT=921Mi
```

### Correct Kubernetes Spec
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: billing-service
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: service
          image: repo/billing-service:1.0.0
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          env:
            - name: GOMEMLIMIT
              value: "460Mi" # 90% of 512Mi limit, preventing OOMKilled
            - name: GOGC
              value: "100"
```

---

## 11. Kubernetes — Multi-Replica Guardrails (3–10 Replicas)

In multi-replica environments, local variables, in-memory state, and file handles do not coordinate across running pods. Designs must assume any request can execute on any pod instance.

### 11.1 State & Stickiness
- **NEVER** store user sessions or shared application state in local memory or package-level global maps.
- **ALWAYS** externalize sessions, cache keys, and metrics to central stores (such as Redis, PostgreSQL, or VictoriaMetrics).

### 11.2 Distributed Locking
- **ALWAYS** use a distributed lock (e.g., Redis `SETNX` or Redlock via `go-redsync/redsync`) when a critical action must execute on a single pod instance at a time.
- **NEVER** use `sync.Mutex` or channels to coordinate transactions across multi-replica nodes.

```go
// CORRECT — Distributed lock with TTL in Go
func ProcessRefund(ctx context.Context, redsyncClient *redsync.Redsync, refundID string) error {
    mutex := redsyncClient.NewMutex("refund-lock:"+refundID, 
        redsync.WithExpiry(10*time.Second),
        redsync.WithTries(3),
        redsync.WithRetryDelay(500*time.Millisecond),
    )

    if err := mutex.LockContext(ctx); err != nil {
        return fmt.Errorf("could not acquire lock: %w", err)
    }
    defer func() {
        _, _ = mutex.Unlock()
    }()

    // Safe critical path
    return executeRefund(ctx, refundID)
}
```

### 11.3 Scheduled Tasks
- **NEVER** execute background timer loops or cron operations directly in standard API container deployments.
- **ALWAYS** deploy cron operations as dedicated Kubernetes `CronJob` specifications.
- **ALWAYS** set `concurrencyPolicy: Forbid` in the Kubernetes CronJob configuration.

```yaml
# CORRECT — Kubernetes Standalone CronJob Spec
apiVersion: batch/v1
kind: CronJob
metadata:
  name: night-reconciliation
spec:
  schedule: "0 1 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: job
              image: company/recon-job:1.0.0
```

### 11.4 Graceful Shutdown
- **ALWAYS** listen for `syscall.SIGINT` and `syscall.SIGTERM` signals and orchestrate graceful drainage of HTTP, DB, and gRPC connection pools.

```go
// CORRECT — Catching SIGTERM and shutting down HTTP server gracefully
func StartServer(router http.Handler) {
    srv := &http.Server{
        Addr:    ":8080",
        Handler: router,
    }

    go func() {
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            log.Fatalf("listen: %s\n", err)
        }
    }()

    stop := make(chan os.Signal, 1)
    signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
    <-stop // Wait for signal

    log.Println("Shutting down server...")
    ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced to shutdown: %v", err)
    }
    log.Println("Server exited gracefully")
}
```

### 11.5 Health Checks
Go applications expose four endpoints for operational monitoring:

| Endpoint | Kubernetes Probe | Monitored By | Purpose |
|---|---|---|---|
| `/healthz/live` | `livenessProbe` | Kubernetes | Verifies process running status. |
| `/healthz/ready` | `readinessProbe` | Kubernetes | Verifies primary database/network readiness. |
| `/healthz/startup` | `startupProbe` | Kubernetes | Verifies initialization status (cache warming/migration). |
| `/healthz/dependencies` | N/A | **DataDog** | Detailed health check returned in JSON for dashboards. |

```go
// CORRECT — Health Endpoint Handlers and JSON output for DataDog
type HealthResponse struct {
    Status       string            `json:"status"`
    Dependencies map[string]string `json:"dependencies"`
}

func RegisterHealthRoutes(mux *http.ServeMux, db *sql.DB, rdb *redis.Client) {
    mux.HandleFunc("/healthz/live", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        _, _ = w.Write([]byte("OK"))
    })

    mux.HandleFunc("/healthz/ready", func(w http.ResponseWriter, r *http.Request) {
        // Critical dependency check
        if err := db.PingContext(r.Context()); err != nil {
            w.WriteHeader(http.StatusServiceUnavailable)
            return
        }
        w.WriteHeader(http.StatusOK)
    })

    mux.HandleFunc("/healthz/dependencies", func(w http.ResponseWriter, r *http.Request) {
        res := HealthResponse{
            Status:       "UP",
            Dependencies: make(map[string]string),
        }
        
        dbErr := db.PingContext(r.Context())
        if dbErr != nil {
            res.Dependencies["postgres"] = "DOWN: " + dbErr.Error()
            res.Status = "DOWN"
        } else {
            res.Dependencies["postgres"] = "UP"
        }

        rdbErr := rdb.Ping(r.Context()).Err()
        if rdbErr != nil {
            res.Dependencies["redis"] = "DOWN: " + rdbErr.Error()
            res.Status = "DOWN"
        } else {
            res.Dependencies["redis"] = "UP"
        }

        w.Header().Set("Content-Type", "application/json")
        if res.Status == "DOWN" {
            w.WriteHeader(http.StatusServiceUnavailable)
        } else {
            w.WriteHeader(http.StatusOK)
        }
        _ = json.NewEncoder(w).Encode(res)
    })
}
```

---

## 12. Magic Values & Typings

Go does not support traditional Java-style objects or C# enums. Type safety must be enforced using custom types.

### Rules
- **ALWAYS** declare a custom type for state variables, flags, or status sets.
- **ALWAYS** declare configurations, routes, headers, and constants as immutable constants.
- **ALWAYS** use `iota` inside block declarations to represent internal code flags.
- **NEVER** use magic strings or raw numeric literals for checks.

### Correct Patterns
```go
// CORRECT — Type-safe enum definition using Go custom types
type OrderStatus string

const (
    StatusPending   OrderStatus = "PENDING"
    StatusProcessed OrderStatus = "PROCESSED"
    StatusCancelled OrderStatus = "CANCELLED"
)

func ProcessOrderStatus(status OrderStatus) error {
    switch status {
    case StatusPending, StatusProcessed, StatusCancelled:
        return nil
    default:
        return fmt.Errorf("invalid order status: %s", status)
    }
}

// WRONG — Magic strings
if order.Status == "PENDING" { // Typo risks are high (e.g. "Pending")
    // ...
}
```

---

## 13. Open Source & Dependency Policy

Refer to the company's global FOSS guidelines: [`engineer/knowledge/ABI FOSS Policy.md`](../ABI%20FOSS%20Policy.md)

- Permissible dependencies: Apache 2.0, MIT, and BSD.
- Forbidden dependencies: AGPL, GPL, and LGPL (unless explicitly reviewed and approved by the Legal compliance department).
- Development packages (e.g., mock generators, testing suites, performance profiling runners) must be excluded from target production docker builds.

---

## 14. Authentication & Authorization

Applications must validate identities against Keycloak (Private Company SSO) via JSON Web Tokens (JWT).

### Rules
- **ALWAYS** authenticate using the company Keycloak instance. Custom authorization schemas or isolated database password tables are forbidden.
- **ALWAYS** validate signature, expiration, and audience claims via a JWKS (JSON Web Key Set) cached locally.
- **ALWAYS** parse, extract, and map Keycloak role claims (`realm_access.roles`) to standard application permissions.
- **NEVER** trust JWT payloads without executing cryptographic validation.

### Correct Keycloak JWT Middleware Pattern
```go
package middleware

import (
    "context"
    "errors"
    "net/http"
    "strings"
    "time"
    "github.com/golang-jwt/jwt/v5"
    "github.com/lestrrat-go/jwx/v2/jwk"
)

type ClaimsContextKey string
const UserClaimsKey ClaimsContextKey = "claims"

type KeycloakClaims struct {
    jwt.MapClaims
    RealmAccess struct {
        Roles []string `json:"roles"`
    } `json:"realm_access"`
    ResourceAccess map[string]struct {
        Roles []string `json:"roles"`
    } `json:"resource_access"`
    Email         string `json:"email"`
    EmailVerified bool   `json:"email_verified"`
}

type JWTValidator struct {
    jwkCache *jwk.Cache
    jwksURL  string
    issuer   string
    audience string
}

func NewJWTValidator(ctx context.Context, jwksURL, issuer, audience string) (*JWTValidator, error) {
    c := jwk.NewCache(ctx)
    // Cache the JWKS keys locally and fetch updates automatically
    c.Register(jwksURL, jwk.WithMinRefreshInterval(15*time.Minute))
    
    return &JWTValidator{
        jwkCache: c,
        jwksURL:  jwksURL,
        issuer:   issuer,
        audience: audience,
    }, nil
}

func (v *JWTValidator) Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        authHeader := r.Header.Get("Authorization")
        if !strings.HasPrefix(authHeader, "Bearer ") {
            http.Error(w, "Unauthorized: missing bearer token", http.StatusUnauthorized)
            return
        }
        tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

        // Fetch JWKS public keys
        keySet, err := v.jwkCache.Get(r.Context(), v.jwksURL)
        if err != nil {
            http.Error(w, "Internal server error: key retrieval failed", http.StatusInternalServerError)
            return
        }

        token, err := jwt.ParseWithClaims(tokenStr, &KeycloakClaims{}, func(token *jwt.Token) (any, error) {
            // Validate signature algorithm
            if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
                return nil, errors.New("unexpected signing method")
            }

            // Retrieve key ID
            kid, ok := token.Header["kid"].(string)
            if !ok {
                return nil, errors.New("missing kid header")
            }

            key, ok := keySet.LookupKeyID(kid)
            if !ok {
                return nil, errors.New("key not found in jwks")
            }

            var rawKey any
            if err := key.Raw(&rawKey); err != nil {
                return nil, err
            }
            return rawKey, nil
        })

        if err != nil || !token.Valid {
            http.Error(w, "Unauthorized: invalid token: "+err.Error(), http.StatusUnauthorized)
            return
        }

        claims, ok := token.Claims.(*KeycloakClaims)
        if !ok {
            http.Error(w, "Unauthorized: invalid claims mapping", http.StatusUnauthorized)
            return
        }

        // Validate Audience and Issuer manually
        aud, _ := claims.GetAudience()
        if len(aud) == 0 || aud[0] != v.audience {
            http.Error(w, "Unauthorized: invalid audience", http.StatusUnauthorized)
            return
        }

        iss, _ := claims.GetIssuer()
        if iss != v.issuer {
            http.Error(w, "Unauthorized: invalid issuer", http.StatusUnauthorized)
            return
        }

        // Add verified claims to context
        ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// RBAC Authorization check function
func RequireRole(role string, next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        claims, ok := r.Context().Value(UserClaimsKey).(*KeycloakClaims)
        if !ok {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }

        hasRole := false
        for _, r := range claims.RealmAccess.Roles {
            if r == role {
                hasRole = true
                break
            }
        }

        if !hasRole {
            http.Error(w, "Forbidden: insufficient permissions", http.StatusForbidden)
            return
        }

        next.ServeHTTP(w, r)
    }
}
```
