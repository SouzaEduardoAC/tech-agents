# Infrastructure & Dependency Selection

Architectural decisions must prioritize **Stability**, **Scalability**, and **Maintainability**.

| Category | Technology | Best Use Case | Architectural Trade-off |
| :--- | :--- | :--- | :--- |
| **Relational DB** | **PostgreSQL** | Structured data, ACID, complex queries. | Harder to scale horizontally than NoSQL. |
| **Document Store**| **MongoDB** | Unstructured data, fast writes, flexible schemas. | Potential for data inconsistency if schema-less. |
| **Caching/KV** | **Redis / Valkey** | Low-latency state, session storage, caching. | Ephemeral state; requires high-availability (Cluster). |
| **Messaging** | **RabbitMQ / Kafka** | Asynchronous task processing, event streams. | Increases system complexity and eventual consistency. |
| **Search Engine** | **Elasticsearch** | Full-text search, high-volume log analysis. | Significant resource footprint; JVM management. |
| **API Gateway** | **Kong / NGINX** | Traffic management, Auth, Rate-limiting. | Centralized failure point; requires redundancy. |
| **Orchestrator** | **Kubernetes** | High-scale container management. | High operational overhead and cognitive load. |

## Selection Principles
1. **Prefer Stability:** Use battle-tested technologies for critical business state.
2. **Horizontal Scalability:** Prefer technologies that scale out (stateless) rather than up (stateful).
3. **Open Standards:** Avoid proprietary lock-in where possible (e.g., prefer Postgres/Redis over proprietary AWS/Azure/GCP equivalents).
4. **Resilience over Performance:** A slightly slower stable system is superior to a fast, fragile one.
