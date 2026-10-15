# Performance, Stability & Resilience Audit

## 1. Database & Data Access
 - N+1 query problems and missing eager loading.
 - Lack of database indexes on frequently queried columns.
 - Inefficient joins or subqueries.
 - Missing pagination on large result sets.
 - Absence of query result caching (Redis/Valkey).
 - Connection pooling issues and starvation.

## 2. Distributed Systems Resilience (Stability)
 - **Circuit Breakers:** Preventing cascading failures when downstream services are down.
 - **Bulkheads:** Isolating resources to prevent a failure in one component from taking down others.
 - **Retry Patterns:** Exponential backoff with jitter to handle transient failures.
 - **Timeouts:** Global and local timeouts for all I/O operations.
 - **Dead Letter Queues (DLQ):** Handling unprocessable messages in event-driven systems.

## 3. Algorithm & Memory Efficiency
 - Time complexity (O(n²) → O(n log n) or O(n)).
 - Memory leaks (retained references, unclosed streams).
 - Stream processing vs. Loading entire datasets into memory.
 - Excessive object instantiation in hot loops.
 - Memoization and dynamic programming for redundant calculations.

## 4. Async & Concurrency
 - Blocking I/O in the main event loop (e.g., synchronous file ops).
 - Unoptimized worker threads or parallel processing (Promise.all()).
 - Context switching overhead in high-concurrency environments.
 - Race conditions and deadlocks in shared state scenarios.

## 5. Network & API Scalability
 - Excessive Chatty APIs (missing request batching/BFF).
 - Lack of response caching (CDN, HTTP headers).
 - Payloads without compression (Gzip/Brotli).
 - No Rate Limiting/Throttling on public or internal endpoints.
 - Connection reuse (Keep-Alive, gRPC).

## 6. Observability (High-End Maintenance)
 - **Structured Logging:** JSON-based logs with correlation IDs.
 - **Distributed Tracing:** OpenTelemetry for tracing requests across microservices.
 - **Metrics:** Real-time monitoring (Latency, Throughput, Error Rate).
 - **Health Checks:** Liveness/Readiness probes for orchestration (K8s).

## 7. Scaling Vector Safe-Checks
 - Horizontal vs. Vertical Scaling tradeoffs.
 - CAP Theorem: Consistency vs. Availability in distributed stores.
 - Database Sharding/Partitioning for high-volume data.
 - Multi-instance shared state (avoiding local caching for global state).
