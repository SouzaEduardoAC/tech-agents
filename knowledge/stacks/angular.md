# Knowledge: Angular & TypeScript — Performance Best Practices & Guardrails

> Applies to: Angular 17/18, TypeScript 5.x, RxJS 7.x
> Scope: Enterprise Frontends, Standalone Architectures, Reactive State Management.
> Deployment: Kubernetes-hosted Nginx container replicas, 3–10 instances, horizontal scaling.

---

## 1. Async & Concurrency

### Rules
- **ALWAYS** prefer Angular Signals for synchronous reactivity, UI bindings, and derived read-only state.
- **ALWAYS** use RxJS Observables for asynchronous event streams, web socket channels, and remote REST communications.
- **ALWAYS** propagate cancellation tokens (unsubscribe/abort) to ensure HTTP calls and streams exit gracefully when components destroy.
- **ALWAYS** handle asynchronous processes outside Angular's Zone.js (`ngZone.runOutsideAngular`) when executing high-frequency calculations or canvas updates to avoid change detection storms.
- **PREFER** standard signal effects (`effect()`) only for logging, synchronization to local storage, or integration with external non-reactive libraries.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Deeply nested `.subscribe()` blocks | Creates callback-hell readability bugs; disrupts standard RxJS stream cancellation pipelines |
| Sync state loops using Signal mutators within `computed()` hooks | Triggers infinite circular reactivity loops; crashes application shell |
| Ignoring Zone.js triggers on custom setInterval loops | Triggers aggressive, global virtual-DOM change detection runs every tick |
| Direct DOM mutations outside Angular wrappers | Out-of-sync DOM states; breaks virtual DOM reconciliation processes |

### Correct Patterns
```typescript
// CORRECT — Using Signals for UI bindings and RxJS for asynchronous triggers
import { Component, inject, signal, computed } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-user-profile',
  template: `
    <div>
      <input [value]="userId()" (input)="updateId($any($event.target).value)" />
      @if (loading()) {
        <p>Loading user data...</p>
      } @else if (user()) {
        <h1>Welcome, {{ userName() }}</h1>
      }
    </div>
  `
})
export class UserProfileComponent {
  private http = inject(HttpClient);

  // Synchronous Reactive State (Signals)
  userId = signal<string>('usr_001');
  
  // Convert Signal to Observable to trigger async pipeline on change
  private userStream$ = toObservable(this.userId).pipe(
    switchMap(id => {
      this.loading.set(true);
      return this.http.get<any>(`/api/users/${id}`).pipe(
        catchError(err => {
          console.error('Fetch error:', err);
          return of(null);
        })
      );
    })
  );

  // Convert resulting stream back to Signal for template consumption
  user = toSignal(this.userStream$);
  loading = signal<boolean>(false);

  // Derived state computed synchronously (re-calculated only when dependencies change)
  userName = computed(() => {
    const u = this.user();
    this.loading.set(false);
    return u ? `${u.firstName} ${u.lastName}` : 'Guest';
  });

  updateId(newId: string) {
    this.userId.set(newId);
  }
}

// WRONG — Callback-hell subscription pattern inside Component
this.route.params.subscribe(params => {
  this.userService.get(params['id']).subscribe(user => {
    this.http.get(`/api/roles/${user.roleId}`).subscribe(role => {
      this.roleDetails = role; // Memory leak risk and race condition bugs!
    });
  });
});
```

---

## 2. Memory & Allocations

### Rules
- **ALWAYS** clean up RxJS subscriptions using `takeUntilDestroyed()` (from `@angular/core/rxjs-interop`) or the `AsyncPipe` in templates.
- **ALWAYS** enable `changeDetection: ChangeDetectionStrategy.OnPush` on all components to prevent global virtual-DOM traversal checks.
- **ALWAYS** clean up event listeners, timers, and WebSockets inside `ngOnDestroy()` lifecycle hooks (or the newer `DestroyRef` interface).
- **PREFER** `AsyncPipe` over manual component `.subscribe()` calls whenever possible, as it manages unsubscription automatically.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Unsubscribed Observables in long-lived services or components | Retains memory references to dead components; triggers severe memory leaks |
| Mutating state references in standard components | Breaks `OnPush` detection; views fail to update on mutations |
| Creating global listener arrays without garbage collection hooks | Leads to progressive tab crashes over long user sessions |

### Correct Patterns
```typescript
// CORRECT — Using takeUntilDestroyed to clean up subscriptions cleanly
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  selector: 'app-ticker',
  template: `<p>Current Tick: {{ tick }}</p>`
})
export class TickerComponent implements OnInit {
  private destroyRef = inject(DestroyRef); // Inject standard DestroyRef
  tick = 0;

  ngOnInit() {
    interval(1000)
      .pipe(
        // Ties subscription lifecycle strictly to this component instance
        takeUntilDestroyed(this.destroyRef) 
      )
      .subscribe(val => {
        this.tick = val;
      });
  }
}

// CORRECT — OnPush Change Detection with Immutable Updates
import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-item-view',
  changeDetection: ChangeDetectionStrategy.OnPush, // Highly optimized check
  template: `<h3>{{ data.title }}</h3>`
})
export class ItemViewComponent {
  @Input() data!: { title: string };
}

// WRONG — Unhandled interval stream and mutable object properties
@Component({
  selector: 'app-bad-ticker',
  template: `<h3>{{ data.title }}</h3>`
})
export class BadTickerComponent implements OnInit {
  @Input() data!: { title: string };

  ngOnInit() {
    interval(500).subscribe(v => console.log(v)); // NEVER UNSUBSCRIBED! Memory leak occurs
  }

  mutateTitle() {
    this.data.title = 'New Title'; // Fails to render under OnPush configurations!
  }
}
```

---

## 3. Collections & Data Structures

### Rules
- **ALWAYS** specify a stable, unique tracker key when rendering lists via modern `@for` template loops.
- **ALWAYS** use `trackBy` custom methods when using the older legacy `*ngFor` directive.
- **PREFER** `Map` or `Set` over standard arrays for O(1) membership lookups in high-frequency validation checks.
- **ALWAYS** run strict linting to enforce static array type declarations.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Using index arrays as `@for` tracking properties for dynamic lists | Forces complete DOM destruction and recreation on re-orders; breaks form focuses |
| Calling complex component methods inside template bindings | Triggers execution on every single change detection loop; slows frame rate to single digits |

### Correct Patterns
```typescript
// CORRECT — High performance modern loop with track key
import { Component, signal } from '@angular/core';

interface Product {
  id: string; // Database stable UUID
  name: string;
}

@Component({
  standalone: true,
  selector: 'app-product-list',
  template: `
    <ul>
      <!-- CORRECT: Using modern tracking syntax with stable id -->
      @for (prod of products(); track prod.id) {
        <li>{{ prod.name }}</li>
      }
    </ul>
  `
})
export class ProductListComponent {
  products = signal<Product[]>([
    { id: 'p_100', name: 'Microservice Gateway' },
    { id: 'p_101', name: 'Service Registry Client' }
  ]);
}

// WRONG — Template calls executing on every detection frame
@Component({
  selector: 'app-slow-list',
  template: `
    <ul>
      @for (p of products; track $index) { <!-- WRONG: $index recreates lists on shifts -->
        <li>{{ p.name }} - {{ calculateRank(p.id) }}</li> <!-- WRONG: Called every frame -->
      }
    </ul>
  `
})
export class SlowListComponent {
  products = [{ id: '1', name: 'App' }];

  calculateRank(id: string): number {
    // Heavy computation running endlessly under global change detection loops
    return id.charCodeAt(0) * 42; 
  }
}
```

---

## 4. Database & ORM Integration

Angular apps communicate with microservices executing backend storage workflows. 

### Rules
- **ALWAYS** decouple Angular models from raw database representations using structured Data Transfer Objects (DTOs) validated via strict interfaces.
- **ALWAYS** establish strict schema checks on the API gateway boundaries to protect application storage parameters.
- **ALWAYS** manage local client database states (e.g. RxDB or IndexedDB caches) with strict lifecycle hooks to prevent data corruption.
- **NEVER** trust client-supplied database queries (e.g. raw SQL parameters sent from forms) — enforce backend-only parameterization.

### 4.1 Schema Syncing & Migrations

#### Rules
- **ALWAYS** run contract testing (e.g., OpenAPI / Pact) between backend services and Angular HTTP models to prevent out-of-sync schema integrations.
- **ALWAYS** create automated API mapping layers to handle schema versions during rolling blue-green deployments.

#### Hard Guardrails
| Forbidden | Reason |
|---|---|
| Mapping backend entity schemas directly to frontend templates | Schema drift immediately crashes client UI rendering layers |
| Storing unencrypted SQLite or local IndexedDB credentials | Exposes client storage files to simple browser-exploit vector leaks |

---

## 5. HTTP & Remote API Connections

### Rules
- **ALWAYS** use Angular `HttpClient` rather than raw fetch setups to leverage interceptors.
- **ALWAYS** apply strict timeout thresholds using the RxJS `timeout` operator on all outward HTTP calls.
- **ALWAYS** leverage `HttpInterceptorFn` (Angular Standalone interceptors) to append security credentials, trace IDs, and apply global resilience frameworks.
- **ALWAYS** configure retry policies with exponential backoff on network failures using the RxJS `retry` operator.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Unbounded HTTP requests | Client tabs freeze indefinitely under downstream API performance degradations |
| Infinite immediate retries on fail states | Floods backend microservices, transforming client pools into distributed DDoS vectors |
| Missing error catching | Unchecked connection failures propagate up, breaking component templates |

### Correct Patterns
```typescript
// CORRECT — Functional Standalone HTTP Interceptor with Timeout and Retry controls
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { timeout, retry, catchError } from 'rxjs/operators';
import { throwError, timer } from 'rxjs';

export const ResilientHttpInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>, 
  next: HttpHandlerFn
) => {
  const HTTP_TIMEOUT_LIMIT = 5000; // Strict 5-second timeout limit

  return next(req).pipe(
    timeout(HTTP_TIMEOUT_LIMIT), // Impose strict timeout limit
    retry({
      count: 3,
      delay: (error, retryCount) => {
        // Exponential backoff configuration: 1s, 2s, 4s delays
        return timer(Math.pow(2, retryCount - 1) * 1000);
      }
    }),
    catchError(error => {
      console.error('Interceptor captured HTTP error:', error);
      return throwError(() => new Error('API request failed resiliently.'));
    })
  );
};
```

---

## 6. Error Handling & Flow Control

### Rules
- **ALWAYS** register a global `ErrorHandler` class to catch and report unhandled runtime failures to Datadog or specialized collectors.
- **ALWAYS** use the `{ success: true; data: T } | { success: false; error: AppError }` pattern for predictable business validation logic instead of throwing expensive exceptions.
- **ALWAYS** intercept HTTP failures cleanly using RxJS `catchError` before they reach template scopes.

### Cost Comparison
- Exception Generation with full stack captures: ~12,000 ns.
- Immutable functional Result notification: ~40 ns.

### Correct Patterns
```typescript
// CORRECT — Global Angular ErrorHandler Provider
import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalLoggingErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const chunk = {
      message: error.message ? error.message : error.toString(),
      stack: error.stack ? error.stack : 'N/A',
      timestamp: new Date().toISOString()
    };
    
    // Output structured error payload directly to datadog / monitoring endpoints
    console.error('GLOBAL RUNTIME ERROR:', JSON.stringify(chunk));
  }
}

// App bootstrapping configuration:
// bootstrapApplication(AppComponent, {
//   providers: [{ provide: ErrorHandler, useClass: GlobalLoggingErrorHandler }]
// });
```

---

## 7. Caching Systems

### Rules
- **ALWAYS** implement response-caching decorators or dedicated HTTP Interceptors with strict TTL invalidation properties.
- **ALWAYS** clear cache databases on user logout cycles to protect PII.
- **PREFER** Signal-based local stores to cache active route selections.
- **NEVER** cache sensitive JWT tokens or personal user data in unencrypted local storage formats.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Caching data forever in global service arrays | Leads to stale configurations; progressive memory leaks on scaling |
| Sharing global data caches across browser tabs without sync controls | Triggers cross-window state inconsistencies |

---

## 8. Dependency Injection & Lifetime

Angular's injector architecture controls class lifetimes.

### Rules
- **ALWAYS** use constructor parameter injection or the new `inject()` function pattern.
- **ALWAYS** declare application-wide services as root singletons using `@Injectable({ providedIn: 'root' })`.
- **ALWAYS** scope stateful services to localized components (`providers: [LocalService]`) to tie their lifecycle directly to the UI element.
- **NEVER** inject a Scoped Service (like a component state manager) into a Singleton Service — this creates a captive dependency memory leak.

### Lifetime Mapping Table

| Injector / Injection Scope | Lifespan | Typical Use Case |
|---|---|---|
| **Root Injector (`providedIn: 'root'`)** | Application Singleton | HTTP Gateway Services, Auth managers |
| **Component Injector (`providers: [...]`)** | Scoped (Component Lifecycle) | Local Wizard Form states, charts |
| **Element Injector (Directives)** | Transient | Animation directives, tooltips |

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Creating new class instances manually (`new UserService()`) | Bypasses DI framework; renders mock testing impossible |
| Direct singleton service state mutation by child controls | Creates unpredictable, un-traceable multi-component state shifts |

---

## 9. Structured Logging

### Rules
- **ALWAYS** use standard logging utilities (e.g., `ngx-logger`) with structured levels rather than raw browser `console.log`.
- **ALWAYS** configure structured outputs in JSON formats to simplify SIEM ingestion pipelines (Splunk, Elastic, Datadog).
- **ALWAYS** strip passwords, tokens, and PII from payloads before emitting.

```typescript
// CORRECT — ngx-logger configuration
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';

// bootstrap configuration providers
// importProvidersFrom(LoggerModule.forRoot({
//   level: NgxLoggerLevel.INFO,
//   serverLogLevel: NgxLoggerLevel.ERROR,
//   serverLoggingUrl: '/api/logs'
// }))
```

---

## 10. GC / Runtime Tuning & Profiling

### Rules
- **ALWAYS** utilize the Angular DevTools extension to profile Change Detection latency profiles.
- **ALWAYS** profile Heap Allocation growth using Chrome Memory Profiler tabs under intensive data operations.
- **ALWAYS** test your UI profiles under Simulated CPU Throttling conditions (4x/6x slowdown) to guarantee low-spec mobile responsiveness.

---

## 11. Kubernetes — Multi-Replica Guardrails

### Rules
- **ALWAYS** build Angular static files as compiled HTML/JS/CSS assets placed inside optimized Nginx containers.
- **ALWAYS** configure Nginx replicas to handle rolling updates smoothly.
- **ALWAYS** build completely stateless frontend bundles. Fetch runtime environment configurations dynamically using a local `/config` path served by Nginx configmaps.

```yaml
# Nginx Static File Serving Deployment with Health check points
apiVersion: apps/v1
kind: Deployment
metadata:
  name: angular-frontend
spec:
  replicas: 5 # 5 active instances running horizontals
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: web-server
          image: myrepo/angular-frontend:1.0.0
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
- **ALWAYS** enforce a strict type system. Disallow the `any` keyword in your `tsconfig.json`.
- **ALWAYS** compile static mapping configurations using TypeScript's `as const` structures to prevent runtime mutability.
- **ALWAYS** leverage Enums or explicit String Literal Union Types.

```typescript
// CORRECT — Typesafe config and union mappings
export const CONFIG = {
  TIMEOUT_LIMIT: 5000,
  RETRY_COUNT: 3
} as const;

export type AppTheme = 'LIGHT' | 'DARK' | 'SYSTEM';
```

---

## 13. Open Source & Dependency Policy

Refer directly to the global policy: [`engineer/knowledge/ABI FOSS Policy.md`](../ABI%20FOSS%20Policy.md). No non-compliant third-party code packages are allowed.

---

## 14. Authentication & Authorization

### 14.1 Authentication — Keycloak (Company SSO)

#### Rules
- **ALWAYS** integrate authentication routines utilizing the standard Keycloak JS SDK / Angular integration protocols.
- **ALWAYS** configure a dedicated `HttpInterceptor` to append Keycloak Bearer JWT validation credentials automatically.
- **NEVER** permit unauthenticated access to restricted views.

---

### 14.2 Authorization — Role-Based (Application Roles)

#### Rules
- **ALWAYS** safeguard routing views utilizing role-based Angular Guards (`CanActivateFn`).
- **ALWAYS** extract and map Realm Role details from decoded Token parameters to verify user permissions.

#### Correct Patterns
```typescript
// CORRECT — Standalone Keycloak Route Guard and HTTP Interceptor
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

export const KeycloakRoleGuard: CanActivateFn = async (route, state) => {
  const keycloak = inject(KeycloakService);
  const router = inject(Router);

  // Verify authentication state
  const isLoggedIn = await keycloak.isLoggedIn();
  if (!isLoggedIn) {
    await keycloak.login({ redirectUri: window.location.origin + state.url });
    return false;
  }

  // Extract expected roles from route configuration
  const expectedRoles: string[] = route.data['roles'];
  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }

  // Verify role overlap
  const userRoles = keycloak.getUserRoles();
  const hasRequiredRole = expectedRoles.some(role => userRoles.includes(role));

  if (!hasRequiredRole) {
    await router.navigate(['/access-denied']);
    return false;
  }

  return true;
};

// HTTP Interceptor to append Keycloak tokens to outward API queries
import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';

export const KeycloakAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloak = inject(KeycloakService);

  // Convert keycloak token promise into observable stream
  return from(keycloak.getToken()).pipe(
    switchMap(token => {
      if (token) {
        // Clone request and inject token
        const authReq = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });
        return next(authReq);
      }
      return next(req);
    })
  );
};
```
