# Knowledge: VueJS & TypeScript — Performance Best Practices & Guardrails

> Applies to: Vue 3.x (Composition API), Vite, TypeScript 5.x, Pinia 2.x
> Scope: Interactive Client UIs, Single Page Applications (SPAs), Nuxt.js SSR.
> Deployment: Kubernetes-hosted Nginx static containers or Node/Nuxt SSR pods, 3–10 replicas, horizontal autoscaling.

---

## 1. Async & Concurrency

### Rules
- **ALWAYS** prefer Vue 3 Composition API (`<script setup>`) with TypeScript for clear reactivity structures.
- **ALWAYS** use `ref` for primitives, local UI variables, and re-assignable collections. Use `reactive` only for deep, non-reassignable objects with stable property maps.
- **ALWAYS** propagate `AbortSignal` parameters from composables to network fetch routines to ensure requests abort when components unmount.
- **ALWAYS** wrap asynchronous DOM validation ticks inside `await nextTick()` to guarantee the virtual DOM has synchronized before executing queries against visual dimensions.
- **NEVER** instantiate asynchronous await calls directly inside reactive computed properties (`computed()`). Computed getters must remain strictly synchronous and pure.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Triggering async fetch awaits inside `computed` properties | Blocks standard rendering pipelines; triggers unpredictable re-evaluation cycles and browser lag |
| Mutating reactive state properties directly inside standard loop operations | Triggers intermediate rendering batches; severely degrades render thread throughput |
| Neglecting to pass `AbortSignal` boundaries in async composables | Causes race conditions where outdated network payloads overwrite active client states |

### Correct Patterns
```typescript
// CORRECT — Using Composition API, abort signals, and nextTick safely
import { ref, onUnmounted, nextTick } from 'vue';

export function useSearchApi() {
  const query = ref('');
  const results = ref<string[]>([]);
  const loading = ref(false);
  
  let abortController: AbortController | null = null;

  async function performSearch(searchTerm: string) {
    // Abort any existing in-flight request
    if (abortController) {
      abortController.abort();
    }
    
    abortController = new AbortController();
    query.value = searchTerm;
    loading.value = true;

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`, {
        signal: abortController.signal,
      });
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      results.value = data;
      
      // Wait for Vue's reactivity system to flush DOM changes
      await nextTick();
      console.log('DOM has been updated with search results successfully.');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Search query failed:', err);
      }
    } finally {
      loading.value = false;
    }
  }

  onUnmounted(() => {
    if (abortController) abortController.abort(); // Safe cleanup
  });

  return { query, results, loading, performSearch };
}

// WRONG — Asynchronous execution inside a computed property
import { computed } from 'vue';

const badComputed = computed(async () => {
  // NEVER perform async network calls inside a computed property!
  const res = await fetch(`/api/data/${id.value}`); 
  return res.json(); 
});
```

---

## 2. Memory & Allocations

### Rules
- **ALWAYS** clean up global event listeners, timers (`setInterval`), and WebSocket streams inside the `onUnmounted` or `onBeforeUnmount` lifecycle hooks.
- **ALWAYS** use `shallowRef` or `shallowReactive` when caching massive, read-only data arrays (e.g. grids containing >10,000 entries) to skip deep proxy wrapper allocations.
- **ALWAYS** set unreferenced objects to `null` to assist browser garbage collection processes in long-lived client routines.
- **PREFER** standard computed properties (`computed()`) to cache calculated state changes instead of running heavy functions inline inside templates.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Retaining active `setInterval` loops inside custom hooks | Retains complete parent component scopes in memory, resulting in severe browser leaks |
| Wrapping massive read-only database structures in deep `ref` or `reactive` proxies | Vue scans the entire hierarchy, allocating proxies for every nested property; exhausts memory |
| Registering global listeners (`window.addEventListener`) without cleanup hooks | Tab heap size grows steadily until the browser forces a process crash |

### Correct Patterns
```typescript
// CORRECT — Using shallowRef for large datasets and onUnmounted for cleanups
import { shallowRef, onUnmounted } from 'vue';

export function useLargeDataViewer() {
  // shallowRef prevents Vue from scanning and wrapping all nested array item properties
  const rawDataset = shallowRef<Array<{ id: string; details: string }>>([]);
  let pollingInterval: any = null;

  function loadData(newData: any[]) {
    rawDataset.value = newData; // Only changes to .value reference are tracked
  }

  function startPolling() {
    pollingInterval = setInterval(async () => {
      const response = await fetch('/api/raw-feed');
      const data = await response.json();
      loadData(data);
    }, 5000);
  }

  onUnmounted(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval); // CORRECT: Clean up timers to prevent memory leaks
    }
  });

  return { rawDataset, startPolling };
}

// WRONG — Deep reactivity proxies and unmanaged intervals
import { ref } from 'vue';

const data = ref<any[]>([]); // WRONG: Enforces heavy deep proxy wrapping on large datasets

function badStart() {
  setInterval(async () => {
    const res = await fetch('/api/raw-feed');
    data.value = await res.json(); 
  }, 1000); // WRONG: Missing clearInterval will leak when components unmount
}
```

---

## 3. Collections & Data Structures

### Rules
- **ALWAYS** assign a stable, unique attribute (e.g. `:key="item.id"`) when rendering lists with the `v-for` directive.
- **ALWAYS** separate filtering layers into computed properties.
- **NEVER** combine `v-if` and `v-for` directives on the exact same HTML element tag. Use a parent `<template v-if="...">` wrapper or pre-filter arrays in computed blocks instead.
- **PREFER** `Map` or `Set` over array scans (`.find()`) for O(1) validations in loops.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Using array item indices as `:key` bindings in `v-for` loops | Destroys element mapping on sorting/deletions; triggers complete DOM reflows |
| Combining `v-if` and `v-for` on a single tag | Vue has to evaluate the `v-if` logic on *every* single loop iteration, slowing renders |

### Correct Patterns
```html
<!-- CORRECT — Separated conditions and unique keys -->
<template>
  <div>
    <!-- Pre-filtered via computed properties -->
    <ul>
      <li v-for="order in activeOrders" :key="order.id">
        {{ order.name }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Order { id: string; name: string; active: boolean }

const orders = ref<Order[]>([
  { id: 'o_1', name: 'Server Deployment', active: true },
  { id: 'o_2', name: 'Database Audit', active: false }
]);

const activeOrders = computed(() => {
  return orders.value.filter(o => o.active); // Filters synchronously before render
});
</script>

<!-- WRONG — Combined directives and index keys -->
<template>
  <ul>
    <!-- WRONG: Evaluates v-if on every item, uses index as key -->
    <li v-for="(o, idx) in orders" v-if="o.active" :key="idx">
      {{ o.name }}
    </li>
  </ul>
</template>
```

---

## 4. Database & ORM Integration

This section applies to full-stack Vue frameworks (Nuxt.js) utilizing server-side routing engines (Nitro API routes) running **Prisma** or **Mongoose**.

### Rules
- **ALWAYS** initialize database clients using global caching objects inside Nitro routes to prevent connection leaks during Vite's hot-reload cycles in development.
- **ALWAYS** configure connection limits on DB pools to handle multi-replica horizontal scalability safely.
- **NEVER** trust client-supplied raw input queries — utilize parameterized Prisma/Mongoose structures to prevent injection vectors.

#### Correct Pattern
```typescript
// CORRECT — Nitro database client singleton pattern (Nuxt SSR)
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Cache client globally during local development HMR resets
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;
```

---

## 5. HTTP & Remote API Connections

### Rules
- **ALWAYS** configure strict timeouts (e.g. 5000ms limits) on all HTTP client libraries (Axios or Fetch configurations).
- **ALWAYS** leverage Axios interceptors or specialized Vueuse composables (`useFetch`) to attach correlation IDs and trace tokens.
- **ALWAYS** establish exponential backoff retry cycles on network failure hooks.
- **PREFER** centralized HTTP client configurations rather than scattering raw fetch instances across multiple UI views.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Infinite request timeout configurations | Outages in downstream APIs block Vue SSR node threads, cascading to service failure |
| Direct client credentials baked into HTTP clients | Exposes API security keys directly to frontend code inspected by third parties |

### Correct Patterns
```typescript
// CORRECT — Resilient Axios Client for Vue Composition API
import axios from 'axios';
import axiosRetry from 'axios-retry';

export const httpClient = axios.create({
  baseURL: process.env.VITE_API_URL || 'https://api.company.com',
  timeout: 5000, // Strict 5-second timeout limit
  headers: {
    'Content-Type': 'application/json',
  }
});

// Configure client with exponential backoff retries
axiosRetry(httpClient, {
  retries: 3,
  retryDelay: (retryCount) => axiosRetry.exponentialDelay(retryCount),
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 503;
  }
});
```

---

## 6. Error Handling & Flow Control

### Rules
- **ALWAYS** register a global Vue error handler (`app.config.errorHandler`) to catch, parse, and dispatch uncaught UI rendering failures to logging targets (Datadog).
- **ALWAYS** validate API responses inside client services before mapping outputs to reactive variables.
- **ALWAYS** structure complex workflow results using the functional `{ success: true; data: T }` result pattern to avoid the high cost of throwing standard exceptions.

### Cost Awareness
- Standard exception creation and stack-trace evaluation: ~12,000 ns.
- Immutable logical Result validation pattern: ~40 ns.

### Correct Patterns
```typescript
// CORRECT — Global Vue Error Handling Configuration
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  const payload = {
    error: (err as Error).message,
    stack: (err as Error).stack || 'N/A',
    component: instance?.$options.name || 'Anonymous',
    info,
    timestamp: new Date().toISOString()
  };
  
  // Format payload as structured JSON and pipe to monitoring collectors
  console.error('GLOBAL VUE RUNTIME EXCEPTION:', JSON.stringify(payload));
};

app.mount('#app');
```

---

## 7. Caching Systems

### Rules
- **ALWAYS** cache high-frequency, read-only API query data sets in the global state store (Pinia) or specialized caches.
- **ALWAYS** configure explicit TTL (Time-To-Live) validations on Pinia persistent configurations.
- **ALWAYS** externalize shared cache pools (e.g. Nuxt.js SSR sessions) to a centralized distributed Redis container cluster.
- **ALWAYS** wipe all localized state caches upon user logout.

---

## 8. Dependency Injection & Lifetime

Vue's dependency injection system maps provider boundaries using `provide` and `inject` structures.

### Rules
- **ALWAYS** restrict the usage of Vue `provide` / `inject` architectures strictly to UI configurations (e.g., component library layout settings).
- **ALWAYS** manage global business data flows inside dedicated Pinia State Stores.
- **NEVER** expose stateful variables directly as top-level module globals inside Vue SSR implementations. Doing so shares data values across concurrent requests.

### Lifetime Mapping Table

| Injection / State Scope | Lifespan | Typical Use Case |
|---|---|---|
| **Local reactive state (`ref`)** | Transient (Component lifecycle) | Form fields, active toggles |
| **Provide / Inject API** | Subtree Scoped | UI component library configurations |
| **Pinia State Store** | Client Singleton / SSR Request Scoped | Logged-in user profiles, shopping carts |

---

## 9. Structured Logging

### Rules
- **ALWAYS** format server logs using structured, zero-alloc JSON loggers (Pino) inside Nuxt.js SSR controllers.
- **ALWAYS** include transaction or request Correlation IDs in client HTTP headers and log records.
- **ALWAYS** redact or mask PII values (passwords, tokens, emails) prior to printing to logs.

---

## 10. GC / Runtime Tuning & Profiling

### Rules
- **ALWAYS** test and trace application rendering latency metrics using the specialized Vue DevTools Performance tab.
- **ALWAYS** profile Browser Heap allocations using Chrome DevTools memory tracers under heavy dataset loads to identify reactive proxy leaks.
- **ALWAYS** verify runtime execution profiles under simulated network throttling.

---

## 11. Kubernetes — Multi-Replica Guardrails

### Rules
- **ALWAYS** build static client code as minified distribution packages hosted inside optimized Nginx docker containers.
- **ALWAYS** configure Kubernetes Pod specs with explicit memory requests/limits to avoid horizontal resource starvation.
- **ALWAYS** load runtime configurations dynamically from external config paths served via ConfigMaps rather than hardcoding variables at compile time.

```yaml
# Kubernetes Nginx Static Frontend Deployment Specification
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vue-frontend-service
spec:
  replicas: 5 # Horizon scaling target 
  selector:
    matchLabels:
      app: vue-frontend
  template:
    metadata:
      labels:
        app: vue-frontend
    spec:
      containers:
        - name: static-web
          image: myrepo/vue-frontend-spa:1.0.0
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          ports:
            - containerPort: 80
          livenessProbe:
            httpGet:
              path: /healthz
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /healthz
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
```

---

## 12. Magic Values & Typings

### Rules
- **ALWAYS** lock static list mappings in TypeScript using `as const` structures.
- **ALWAYS** prevent structural mutations by declaring read-only types.
- **ALWAYS** replace magic number or string comparisons with clean Enums or explicit Union Types.

```typescript
// CORRECT — Explicit Enums and Const mappings
export const UI_MODES = {
  VIEW: 'view',
  EDIT: 'edit',
  PREVIEW: 'preview'
} as const;

export type UiMode = typeof UI_MODES[keyof typeof UI_MODES];
```

---

## 13. Open Source & Dependency Policy

Refer directly to the global policy: [`engineer/knowledge/ABI FOSS Policy.md`](../ABI%20FOSS%20Policy.md). No non-compliant third-party code packages are allowed.

---

## 14. Authentication & Authorization

### 14.1 Authentication — Keycloak (Company SSO)

#### Rules
- **ALWAYS** route client authentication cycles through Keycloak using official token mapping libraries or custom wrappers.
- **ALWAYS** parse, validate, and verify expiration timestamps (`exp` claims) on active tokens.
- **NEVER** save decrypted authorization token values inside permanent local storages.

---

### 14.2 Authorization — Role-Based (Application Roles)

#### Rules
- **ALWAYS** validate permissions inside route guards before granting access to view pages.
- **ALWAYS** hide secured UI buttons using reactive helpers linked to user roles.

#### Correct Patterns
```typescript
// CORRECT — Vue Router Keycloak Role Guard Composable
import { createRouter, createWebHistory } from 'vue-router';
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'https://keycloak.company.com',
  realm: 'company-realm',
  clientId: 'vue-client-id'
});

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/admin',
      component: () => import('./views/AdminDashboard.vue'),
      meta: { requiresAuth: true, roles: ['app-admin'] }
    },
    {
      path: '/unauthorized',
      component: () => import('./views/Unauthorized.vue')
    }
  ]
});

router.beforeEach(async (to, from, next) => {
  if (!to.meta.requiresAuth) {
    return next();
  }

  // Ensure keycloak is initialized and logged in
  if (!keycloak.authenticated) {
    try {
      await keycloak.init({ onLoad: 'check-sso' });
    } catch (err) {
      console.error('Keycloak initialization failure:', err);
      return next('/unauthorized');
    }
  }

  if (!keycloak.authenticated) {
    // Redirect to corporate SSO
    return keycloak.login();
  }

  const requiredRoles = to.meta.roles as string[];
  if (!requiredRoles || requiredRoles.length === 0) {
    return next();
  }

  // Validate user roles
  const userRoles = keycloak.resourceAccess?.[keycloak.clientId!]?.roles || [];
  const hasAccess = requiredRoles.some(role => userRoles.includes(role));

  if (hasAccess) {
    next();
  } else {
    next('/unauthorized');
  }
});
```
