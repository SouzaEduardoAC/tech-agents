# Knowledge: Java & Spring Boot — Performance Best Practices & Guardrails

> Applies to: Java 21+ & Spring Boot 3.x
> Scope: High-performance microservices, REST APIs, reactive streaming services, and batch jobs.
> Deployment: Kubernetes cluster, 3–10 replicas, horizontal autoscaling.

---

## 1. Async & Concurrency / Threading / Reactive Execution

Java 21 introduces **Virtual Threads** (Project Loom), changing concurrent programming models on the JVM. Traditional thread pools (Platform Threads) are mapped 1:1 to OS threads, which are heavy and expensive. Virtual threads are lightweight threads managed by the JVM, allowing thousands to millions of concurrent tasks.

### Rules
- **ALWAYS** enable virtual threads in Spring Boot 3.x for I/O-bound microservices by setting `spring.threads.virtual.enabled=true`.
- **ALWAYS** configure custom `ExecutorService` pools explicitly when performing CPU-heavy parallel computing. Never use the default shared `ForkJoinPool.commonPool()` for blocking I/O operations.
- **ALWAYS** handle `InterruptedException` properly. Do not swallow it; restore the interrupted status by calling `Thread.currentThread().interrupt()`.
- **ALWAYS** use `CompletableFuture` with a dedicated executor for asynchronous pipelines if virtual threads are not enabled.
- **NEVER** pin virtual threads. Thread pinning occurs when a virtual thread runs a `synchronized` block/method or executes native code (JNI) containing blocking calls. Use `ReentrantLock` instead of `synchronized` inside virtual threads to prevent carrier thread pinning.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| `parallelStream()` for I/O operations | Executes inside the default ForkJoinPool; blocking I/O calls can exhaust the shared thread pool, degrading overall JVM performance. |
| Swallowing `InterruptedException` | Prevents the executor framework or runtime from stopping threads or cancelling tasks during a shutdown sequence. |
| Calling `ThreadLocal.set()` in Virtual Threads without cleanup | Virtual threads are cheap to create but memory leaks can build up rapidly if ThreadLocals are not removed, as thousands of concurrent virtual threads can keep references alive. |
| Manually creating `new Thread()` | Bypasses thread pooling, observability, lifecycle management, and increases runtime overhead. |
| Using `synchronized` blocks inside hot paths under Virtual Threads | Causes virtual threads to pin to their carrier platform threads during blocking operations, eliminating virtual thread concurrency benefits. |

### Correct Patterns
```java
// CORRECT — Running virtual threads with ReentrantLock to prevent carrier thread pinning
public class ResilientService {
    private final ReentrantLock lock = new ReentrantLock();

    public void processOrderResiliently() {
        lock.lock();
        try {
            // Safe I/O blocking operation inside virtual thread
            executeDatabaseQuery();
        } finally {
            lock.unlock();
        }
    }
}

// CORRECT — CompletableFuture with custom executor
public class AsyncDataService {
    private final ExecutorService executor = Executors.newFixedThreadPool(16, r -> {
        Thread t = new Thread(r);
        t.setName("api-async-worker-" + t.getId());
        t.setDaemon(true);
        return t;
    });

    public CompletableFuture<String> fetchDataAsync(String id) {
        return CompletableFuture.supplyAsync(() -> blockingFetch(id), executor)
            .thenApply(this::formatResponse)
            .exceptionally(ex -> "fallback-value");
    }
}

// WRONG — Pinning carrier thread with synchronized block inside blocking I/O
public synchronized void processOrderPinned() {
    executeDatabaseQuery(); // Synchronized block pins the virtual thread to OS platform thread!
}

// WRONG — Stream parallel block doing network I/O
public List<User> fetchUsers(List<String> userIds) {
    return userIds.parallelStream() // VULNERABLE: blocks shared JVM ForkJoinPool.commonPool
        .map(this::fetchUserOverNetwork)
        .toList();
}
```

---

## 2. Memory & Allocations / Garbage Collection / Optimization

Garbage collection tuning under Kubernetes requires matching memory allocations to resource limits to prevent the kernel from sending SIGKILL to the container (OOMKilled).

### Rules
- **ALWAYS** configure container heap parameters via JVM flags using percentages: `-XX:MaxRAMPercentage=80.0` and `-XX:InitialRAMPercentage=40.0`. Do not use hardcoded `-Xmx` values in container images.
- **ALWAYS** use `try-with-resources` for all classes implementing `AutoCloseable` (Streams, HTTP responses, database connections, files) to prevent memory and file descriptor leaks.
- **ALWAYS** use `StringBuilder` or `StringBuffer` for string concatenation in loops. Standard string additions (`+`) in loops allocate a new `StringBuilder` instance per iteration.
- **PREFER** primitive types (`int`, `long`, `double`) instead of wrapper types (`Integer`, `Long`, `Double`) inside high-performance loops to eliminate object boxing allocations.
- **PREFER** ZGC (`-XX:+UseZGC`) for APIs requiring ultra-low response latency (sub-millisecond pause times) and large heaps (> 4GB). For standard memory footprints, use G1GC (`-XX:+UseG1GC`).

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Invoking `System.gc()` manually | Disrupts the JVM's automatic garbage collection heuristics, triggering sudden, expensive full-GC pauses. |
| Appending to large static collections without eviction mechanisms | Triggers JVM heap exhaustion (Memory Leak) over time as objects never become eligible for garbage collection. |
| Loading unbounded DB queries into memory | Can pull hundreds of thousands of rows into the heap, causing sudden spikes in memory usage and JVM out-of-memory crashes. |
| Hardcoding `-Xmx` (e.g., `-Xmx2g`) in Dockerfiles | Forces manual configuration adjustments if container memory resources are scaled up or down in Kubernetes. |

### Correct Patterns
```java
// CORRECT — Using try-with-resources to clean up I/O structures
public String readHeader(File file) throws IOException {
    try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
        return reader.readLine(); // Automatically closed when leaving block
    }
}

// CORRECT — StringBuilder for loop operations
public String joinStrings(List<String> items) {
    StringBuilder sb = new StringBuilder(1024); // Pre-allocate initial capacity
    for (String item : items) {
        sb.append(item).append(",");
    }
    return sb.toString();
}

// WRONG — Allocating new StringBuilder in each loop iteration
public String joinStringsBad(List<String> items) {
    String res = "";
    for (String item : items) {
        res += item; // Allocates a new String and copies data on every iteration
    }
    return res;
}
```

---

## 3. Collections & Data Structures / High-Performance Collections

JVM microservice throughput relies on choosing correct collections and setting initial capacities.

### Rules
- **ALWAYS** initialize `ArrayList`, `HashMap`, and `HashSet` with a calculated capacity if the expected size is known. Capacity formula: `initial_capacity = expected_size / 0.75 + 1`. This prevents resizing and rehashing overhead.
- **ALWAYS** use `ConcurrentHashMap` when multiple threads read and write to a shared map concurrently. Never wrap a standard `HashMap` in `Collections.synchronizedMap` in performance paths.
- **ALWAYS** use `EnumMap` and `EnumSet` instead of standard `HashMap` or `HashSet` when key types are Java Enums. `EnumMap` internally uses direct arrays, which is highly efficient.
- **PREFER** standard `for` loops or traditional iterators over Java Stream pipelines inside hot paths requiring maximum execution speed and zero allocation.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Using `List.contains()` inside loops for large lists | O(N) lookup complexity per check. Convert the collection to a `HashSet` for O(1) lookups. |
| Unsynchronized concurrent read/writes to `HashMap` | Triggers silent memory corruption, infinite loops, and processor core exhaustion. |
| Using `LinkedList` | Terrible memory locality due to pointer chasing; each node is allocated separately, leading to high CPU cache miss rates. |
| Using `Hashtable` or `Vector` | Legacy classes with synchronized methods that cause unnecessary thread blocking and bottleneck throughput. |

### Correct Patterns
```java
// CORRECT — Pre-allocating HashMap capacity
List<UserDto> users = getUsersFromApi();
int initialCapacity = (int) (users.size() / 0.75f) + 1;
Map<String, UserDto> userMap = new HashMap<>(initialCapacity);
for (UserDto u : users) {
    userMap.put(u.getId(), u);
}

// CORRECT — Fast O(1) membership checks with HashSet
Set<String> activeIds = new HashSet<>(activeUsersList);
for (Order o : incomingOrders) {
    if (activeIds.contains(o.getCustomerId())) { // O(1) check
        processOrder(o);
    }
}

// WRONG — Slow O(N) list contains checks inside loops
for (Order o : incomingOrders) {
    if (activeUsersList.contains(o.getCustomerId())) { // O(N) lookup complexity per order!
        processOrder(o);
    }
}
```

---

## 4. Database & ORM Integration

Spring Boot applications use Spring Data JPA backed by Hibernate. In multi-replica Kubernetes setups, index handling, connection pools, and query optimization require careful configuration.

### Rules
- **ALWAYS** disable automatic schema updates in production. Set `spring.jpa.hibernate.ddl-auto=validate` or `none`. Use tools like **Flyway** or **Liquibase** for version-controlled database migrations.
- **ALWAYS** use PostgreSQL `CREATE INDEX CONCURRENTLY` or MySQL `ONLINE = ON` index migrations. Wrap migrations with existence checks (`IF NOT EXISTS`) to ensure scripts are idempotent.
- **ALWAYS** define explicit HikariCP pool parameters: `maximum-pool-size`, `minimum-idle`, `idle-timeout`, and `connection-timeout`.
- **ALWAYS** avoid the N+1 select problem by using `@EntityGraph`, `JOIN FETCH` queries, or projection interfaces to load relations in a single query.
- **ALWAYS** annotate read-only database operations with `@Transactional(readOnly = true)`. This allows Hibernate to skip dirty-checking and optimize connection utilization.
- **ALWAYS** use pagination with `Pageable` or `Slice` for all queries returning unbounded result sets.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| `spring.jpa.hibernate.ddl-auto=update` or `create-drop` in production | Triggers sudden schema mutations and database locks at startup, which can cause permanent data loss or service degradation. |
| Direct database queries in loops | High network latency and database resource exhaustion (N+1 queries). |
| Lazy loading relations outside of an active transaction | Triggers `LazyInitializationException` at runtime. |
| Using `@Fetch(FetchMode.JOIN)` blindly on collection mappings | Disables pagination optimizations in Hibernate, forcing full pagination in memory instead of in the database. |

### Correct Patterns
```sql
-- CORRECT — Idempotent Flyway migration creating an index concurrently (non-transactional DDL)
-- file: V2__add_order_status_idx.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status 
ON orders (status) 
WHERE status = 'PENDING';
```

```java
// CORRECT — Join Fetch to eliminate N+1 Queries
public interface OrderRepository extends JpaRepository<Order, UUID> {
    @Query("SELECT o FROM Order o JOIN FETCH o.items JOIN FETCH o.customer WHERE o.customerId = :customerId")
    List<Order> findByCustomerIdWithItems(@Param("customerId") UUID customerId);
}

// CORRECT — Read-Only optimization and projection
@Service
@RequiredArgsConstructor
public class OrderQueryService {
    private final OrderRepository repository;

    @Transactional(readOnly = true) // Disables Hibernate dirty checking
    public List<OrderSummaryDto> getOrderSummaries(UUID customerId) {
        return repository.findAllSummariesByCustomerId(customerId);
    }
}

// WRONG — Standard JPA query causing N+1 loops
public interface BadRepository extends JpaRepository<Order, UUID> {}

// In executing service:
List<Order> orders = badRepository.findAll(); // Fetches N orders
for (Order o : orders) {
    log.info("Items: {}", o.getItems().size()); // Triggers an additional SELECT query for each of the N orders!
}
```

---

## 5. HTTP & Remote API Connections / Resilient HTTP Clients

Microservices communicate with remote APIs using `RestTemplate` or `WebClient`. Production clients must enforce connection limits, timeouts, and circuit breakers.

### Rules
- **ALWAYS** configure connection, read, and write timeouts explicitly on `RestTemplate` and `WebClient`. Never use the default configurations which have infinite timeouts.
- **ALWAYS** configure a custom, limited connection pool (`PoolingHttpClientConnectionManager` for Apache HttpClient or Reactor Netty custom pool for WebClient).
- **ALWAYS** configure retries with exponential backoff, rate limiting, and a circuit breaker using **Resilience4j**.
- **ALWAYS** release response body payloads to prevent socket and memory leaks.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Instantiating a new `RestTemplate` or `WebClient` per request | Bypasses connection pooling, resulting in high socket establishment overhead and socket starvation (TIME_WAIT). |
| Executing remote API requests without a timeout | Downstream slowness can block all service threads, exhausting thread pools and cascading failure throughout the system. |
| Retrying failed HTTP calls without backoff and jitter | Contributes to "thundering herd" issues and can crash struggling downstream APIs. |

### Correct Patterns
```java
// CORRECT — RestTemplate with pooling, custom timeouts, and Resilience4j Circuit Breaker
@Configuration
public class HttpClientConfig {

    @Bean
    public RestTemplate pooledRestTemplate() {
        PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager();
        connectionManager.setMaxTotal(100);
        connectionManager.setDefaultMaxPerRoute(20);

        CloseableHttpClient httpClient = HttpClients.custom()
            .setConnectionManager(connectionManager)
            .setDefaultRequestConfig(RequestConfig.custom()
                .setConnectTimeout(Timeout.ofMilliseconds(2000))  // Connection establishment limit
                .setResponseTimeout(Timeout.ofMilliseconds(5000)) // Response read limit
                .build())
            .build();

        return new RestTemplate(new HttpComponentsClientHttpRequestFactory(httpClient));
    }
}

@Service
@RequiredArgsConstructor
public class RemoteOrderService {
    private final RestTemplate restTemplate;

    @CircuitBreaker(name = "orderServiceCB", fallbackMethod = "fetchOrderFallback")
    @Retry(name = "orderServiceRetry")
    public OrderDto fetchOrderDetails(String orderId) {
        String url = "https://api.company.com/orders/" + orderId;
        return restTemplate.getForObject(url, OrderDto.class);
    }

    public OrderDto fetchOrderFallback(String orderId, Exception ex) {
        log.error("Failed to fetch order details. Circuit Open. ID: {}", orderId, ex);
        return new OrderDto(orderId, "PENDING_FALLBACK", BigDecimal.ZERO);
    }
}
```

---

## 6. Error Handling — Exceptions vs Domain Notifications

Exceptions on the JVM are highly descriptive but carry high memory and CPU overhead because the JVM must walk and generate a snapshot of the thread stack trace.

### Rules
- **ALWAYS** use standard exceptions only for truly exceptional scenarios (e.g., loss of database connectivity, network failure, system contract violations).
- **ALWAYS** use a **Result** pattern or a domain validation collection to handle expected business rules and input validation failures.
- **NEVER** throw custom runtime exceptions to control happy-path validation loops.
- **ALWAYS** implement a central controller exception handler using `@RestControllerAdvice` to clean up exceptions before returning errors to clients.

### Cost Analysis (Benchmark Comparison)
- Standard exception creation (`throw new CustomException()` with stack trace): ~15,000 ns, allocating ~1.2 KB of heap space per throw.
- Returning a Result/Domain Notification object (or list of violations): ~50 ns, allocating ~150 B of heap space.
- Under heavy load, throwing exceptions for validation checks degrades overall throughput and increases garbage collection pauses.

### Correct Patterns
```java
// CORRECT — Result wrapper class for business validation
public sealed interface OrderResult {
    record Success(Order order) implements OrderResult {}
    record Failure(String errorCode, String errorMessage) implements OrderResult {}
}

public class OrderDomainService {
    public OrderResult createOrder(OrderRequest request) {
        if (request.items().isEmpty()) {
            return new OrderResult.Failure("EMPTY_ORDER", "Order must contain items"); // Fast, allocation-efficient
        }
        Order order = new Order(request);
        return new OrderResult.Success(order);
    }
}

// Execution call:
OrderResult result = domainService.createOrder(req);
if (result instanceof OrderResult.Failure fail) {
    return ResponseEntity.badRequest().body(new ErrorDto(fail.errorCode(), fail.errorMessage()));
}
Order order = ((OrderResult.Success) result).order();

// WRONG — Exception thrown for typical validation check
public Order createOrderBad(OrderRequest request) {
    if (request.items().isEmpty()) {
        throw new InvalidOrderException("Order must contain items"); // HIGH overhead, forces stack walk
    }
    return new Order(request);
}
```

---

## 7. Caching Systems

In multi-replica Kubernetes setups, local JVM cache variables are isolated, leading to inconsistent application state across nodes.

### Rules
- **ALWAYS** define explicit TTL (Time-to-Live) values for every cache key. Do not configure keys to cache indefinitely.
- **ALWAYS** use a distributed cache like Redis (configured via `spring-boot-starter-data-redis`) for shared application state. Local in-memory caches (like Caffeine or Ehcache) are forbidden for consistency-critical data.
- **ALWAYS** implement cache stampede protection. Use distributed locking or synchronize cache warming routines to prevent simultaneous database queries for the same key during a cache miss.

### Correct Patterns
```java
// CORRECT — Spring Cache with Redis Distributed Configuration and TTL
@Configuration
@EnableCaching
public class RedisCacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10)) // Explicit TTL
            .disableCachingNullValues();

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(config)
            .withCacheConfiguration("orderCache", 
                RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofMinutes(5)))
            .build();
    }
}

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository repository;

    @Cacheable(value = "orderCache", key = "#id")
    public OrderDto getOrderById(UUID id) {
        return repository.findById(id)
            .map(OrderDto::fromEntity)
            .orElseThrow(() -> new EntityNotFoundException("Order not found: " + id));
    }
}
```

---

## 8. Dependency Injection & Lifetime

Spring Boot manages bean instances inside the Application Context using explicit scopes.

### Rules
- **ALWAYS** use constructor dependency injection instead of field-level injection (`@Autowired` on fields). Constructor injection ensures class immutability and simplifies unit testing.
- **ALWAYS** register Spring components as **Singleton** if they do not hold mutable state.
- **NEVER** inject a lightweight, short-lived bean (like a Request-scoped bean or Prototype bean) into a long-lived Singleton without using a proxy (`@Scope(value = ConfigurableBeanFactory.SCOPE_PROTOTYPE, proxyMode = ScopedProxyMode.TARGET_CLASS)`). This prevents **Captive Dependencies**.

### Spring Component Lifetimes
| Annotation / Scope | Scope Type | Lifecycle Description |
|---|---|---|
| `@Component` / `@Service` / `@Repository` | **Singleton** | A single instance is created per Application Context. Shared across all request threads. |
| `@Scope("prototype")` | **Prototype** | A new instance is created every time the bean is requested from the context. |
| `@RequestScope` | **Request** | A single instance is created per incoming HTTP request thread, and garbage collected at request completion. |
| `@SessionScope` | **Session** | A single instance is created per user session (use with caution in multi-replica deployments). |

### Correct Patterns
```java
// CORRECT — Constructor Injection with Final Fields
@Service
@RequiredArgsConstructor // Automatically generates constructor for final fields
public class CustomerService {
    private final CustomerRepository repository; // Immutability guaranteed
    private final AuditClient auditClient;
}

// WRONG — Field-Level injection (Autowired)
@Service
public class BadCustomerService {
    @Autowired
    private CustomerRepository repository; // FORBIDDEN: hard to mock in unit tests, allows mutable fields
}

// WRONG — Captive dependency
@Component
public class SingletonService {
    @Autowired
    private PrototypeBean prototypeBean; // FORBIDDEN: prototype becomes trapped inside the singleton lifecycle
}
```

---

## 9. Structured Logging

Microservices running in Kubernetes must write logs in JSON format for aggregation by platforms like Elasticsearch, Splunk, or DataDog.

### Rules
- **ALWAYS** use structured log templates (e.g., `log.info("Order {} created for customer {}", orderId, customerId)`) instead of string concatenation.
- **ALWAYS** mask Personally Identifiable Information (PII) before writing logs (e.g., credit card numbers, passwords, personal addresses).
- **ALWAYS** configure log formats to JSON in production profiles using Logback or Log4j2.
- **NEVER** output logs inside tight loops in high-throughput paths without rate limiting.

### Correct Patterns
```java
// CORRECT — Structured logging via SLF4J
@Slf4j
@Service
public class PaymentService {
    public void processPayment(PaymentRequest req) {
        // Safe, no string allocation if log level is disabled
        log.info("Processing payment for transaction {} with amount {}", 
            req.getTransactionId(), req.getAmount());
    }
}

// WRONG — String concatenation allocates memory even if logging level is disabled
log.debug("User " + userId + " accessed page " + pageId); // FORBIDDEN!
```

---

## 10. GC & Runtime Tuning

Tuning the JVM for Kubernetes container deployments requires configuring garbage collection limits and memory limits to prevent out-of-memory crashes.

### Rules
- **ALWAYS** configure memory limits using percentages to match the Kubernetes pod resource constraints:
  `-XX:MaxRAMPercentage=80.0`
  `-XX:InitialRAMPercentage=40.0`
- **ALWAYS** enable G1GC (`-XX:+UseG1GC`) or ZGC (`-XX:+UseZGC`) as the garbage collector. Do not use ParallelGC in container environments.
- **ALWAYS** set `-XX:+ExitOnOutOfMemoryError` or `-XX:+CrashOnOutOfMemoryError` so the container process crashes immediately if it runs out of memory, allowing Kubernetes to restart the pod into a healthy state.

### Correct Kubernetes Spec
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: app
          image: company/payment-service:1.0.0
          resources:
            requests:
              cpu: "1"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "1Gi"
          env:
            - name: JAVA_TOOL_OPTIONS
              value: "-XX:+UseG1GC -XX:MaxRAMPercentage=80.0 -XX:InitialRAMPercentage=40.0 -XX:+ExitOnOutOfMemoryError"
```

---

## 11. Kubernetes — Multi-Replica Guardrails (3–10 Replicas)

Multi-replica environments run isolated JVM instances. Code must assume any request can execute on any replica instance.

### 11.1 State & Stickiness
- **NEVER** store user sessions or shared application state in memory variables or static maps.
- **ALWAYS** externalize all shared state to Redis or the database.

### 11.2 Distributed Locking
- **ALWAYS** use a distributed lock (e.g., Redis `SETNX` or Redlock via **Redisson**) when coordinating single-execution tasks across replicas.
- **NEVER** use `synchronized` blocks or `ReentrantLock` to protect shared resources across replicas.

```java
// CORRECT — Distributed lock with Redisson
@Service
@RequiredArgsConstructor
public class SettlementService {
    private final RedissonClient redisson;

    public void processSettlement(String settlementId) {
        RLock lock = redisson.getLock("settlement-lock:" + settlementId);
        try {
            // Wait up to 5 seconds to acquire lock, hold for 10 seconds before auto-unlocking
            if (lock.tryLock(5, 10, TimeUnit.SECONDS)) {
                try {
                    executeSettlement(settlementId);
                } finally {
                    lock.unlock();
                }
            } else {
                throw new ConflictException("Settlement is currently being processed by another node.");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Lock acquisition interrupted", e);
        }
    }
}
```

### 11.3 Scheduled Tasks
- **NEVER** use `@Scheduled` inside microservices without a synchronization manager (like **ShedLock**) or a dedicated scheduling service (like Quartz).
- **ALWAYS** configure ShedLock with a distributed lock provider (e.g., Redis or JDBC) to prevent multiple replicas from executing the same task simultaneously.
- **PREFER** deploying cron operations as dedicated Kubernetes `CronJob` specifications.

```java
// CORRECT — Syncing Spring @Scheduled tasks across replicas using ShedLock
@Component
public class DailyReconTask {

    @Scheduled(cron = "0 0 1 * * ?")
    @SchedulerLock(name = "reconTaskLock", lockAtMostFor = "15m", lockAtLeastFor = "5m")
    public void runDailyRecon() {
        // Runs on exactly one replica at a time
        executeReconciliation();
    }
}
```

### 11.4 Graceful Shutdown
- **ALWAYS** enable Spring Boot graceful shutdown in the configuration: `server.shutdown=graceful`.
- **ALWAYS** set `spring.lifecycle.timeout-per-shutdown-phase` to allow in-flight requests to complete before the pod exits.

```properties
# application.properties — Graceful shutdown configuration
server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=20s
```

### 11.5 Health Checks
Spring Boot exposes four endpoints for operational monitoring:

| Endpoint | Kubernetes Probe | Monitored By | Purpose |
|---|---|---|---|
| `/actuator/health/liveness` | `livenessProbe` | Kubernetes | Verifies process running status. |
| `/actuator/health/readiness` | `readinessProbe` | Kubernetes | Verifies database/network readiness. |
| `/actuator/health/startup` | `startupProbe` | Kubernetes | Verifies initialization status (cache warming/migration). |
| `/actuator/health/dependencies` | N/A | **DataDog** | Detailed health check returned in JSON for dashboards. |

```yaml
# application.yml — Actuator endpoint configuration
management:
  endpoints:
    web:
      exposure:
        include: health
  endpoint:
    health:
      probes:
        enabled: true
      show-details: always
      group:
        liveness:
          include: ping
        readiness:
          include: db, redis
        dependencies:
          include: db, redis, rabbitmq
```

---

## 12. Magic Values & Typings

Java projects must enforce type safety and avoid raw magic variables.

### Rules
- **ALWAYS** declare a dedicated final class for global constants, declaring variables as `public static final`.
- **ALWAYS** use strongly typed Java `enum` components instead of magic strings or numeric constants.
- **NEVER** hardcode values like timeouts, roles, or configuration options inline.

```java
// CORRECT — Strong constant values and enums
public final class ApplicationConstants {
    private ApplicationConstants() {} // Prevent instantiation

    public static final String API_V1_PREFIX = "/api/v1";
}

public enum OrderStatus {
    PENDING, PROCESSED, SHIPPED, CANCELLED
}
```

---

## 13. Open Source & Dependency Policy

Refer to the company's global FOSS guidelines: [`engineer/knowledge/ABI FOSS Policy.md`](../ABI%20FOSS%20Policy.md)

- Permissible dependencies: Apache 2.0, MIT, and BSD.
- Forbidden dependencies: AGPL, GPL, and LGPL (unless explicitly reviewed and approved by the Legal compliance department).
- Development packages (e.g., mock generators, testing suites, performance profiling runners) must be excluded from target production container builds.

---

## 14. Authentication & Authorization

Applications must validate identities against Keycloak (Private Company SSO) via JSON Web Tokens (JWT).

### Rules
- **ALWAYS** authenticate using the company Keycloak instance. Custom authorization schemas or isolated database password tables are forbidden.
- **ALWAYS** validate signature, expiration, and audience claims via a JWKS (JSON Web Key Set) cached locally.
- **ALWAYS** parse, extract, and map Keycloak role claims (`realm_access.roles`) to standard application permissions.
- **NEVER** trust JWT payloads without executing cryptographic validation.

### Correct Spring Security Keycloak Configuration
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${keycloak.jwk-set-uri}")
    private String jwkSetUri;

    @Value("${keycloak.client-id}")
    private String clientId;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/liveness", "/actuator/health/readiness").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwkSetUri(jwkSetUri)
                    .jwtAuthenticationConverter(customJwtAuthenticationConverter())
                )
            );
        return http.build();
    }

    private Converter<Jwt, AbstractAuthenticationToken> customJwtAuthenticationConverter() {
        return jwt -> {
            Collection<GrantedAuthority> authorities = extractRoles(jwt);
            return new JwtAuthenticationToken(jwt, authorities, jwt.getClaimAsString("preferred_username"));
        };
    }

    private Collection<GrantedAuthority> extractRoles(Jwt jwt) {
        Collection<GrantedAuthority> authorities = new ArrayList<>();
        
        // 1. Validate Audience and Issuer
        List<String> audience = jwt.getAudience();
        if (audience == null || !audience.contains(clientId)) {
            throw new JwtValidationException("Invalid token audience for client ID: " + clientId, Collections.emptyList());
        }

        // 2. Map Keycloak Realm Roles to GrantedAuthority
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null && realmAccess.containsKey("roles")) {
            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) realmAccess.get("roles");
            for (String role : roles) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
            }
        }
        return authorities;
    }
}
```

```java
// Usage inside controller for RBAC
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @PostMapping
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_MANAGER')")
    public ResponseEntity<OrderDto> createOrder(@RequestBody OrderRequest req) {
        // Business logic execution
        return ResponseEntity.ok(new OrderDto());
    }
}
```
