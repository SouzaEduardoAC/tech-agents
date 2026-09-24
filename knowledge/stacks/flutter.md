# Knowledge: Flutter & Dart — Performance Best Practices & Guardrails

> Applies to: Flutter 3.19+ & Dart 3.3+
> Scope: High-performance cross-platform Mobile (iOS/Android) architectures.
> Deployment: Kubernetes-backed API backends (3-10 replicas) under horizontal scale.

---

## 1. Async & Concurrency / Threading / Reactive Execution

### Rules
- **ALWAYS** perform heavy computations (e.g. parsing JSON payloads > 50KB, cryptography, offline image processing, massive collection sorting) in a separate **Dart Isolate** to avoid blocking the main UI Thread and causing frame drops (jank).
- **ALWAYS** check the `mounted` property of the `State` subclass before calling `setState()` or navigating following an asynchronous operations gap.
- **ALWAYS** cancel all `StreamSubscription` instances inside the `dispose()` method of your widgets to completely eliminate memory and process leaks.
- **ALWAYS** execute cooperative cancellations on asynchronous processes using custom `CancelToken` patterns.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Running heavy calculations directly on the main UI Isolate | Blocks the Event Loop; drops frames instantly (creates heavy jank) |
| Calling `setState()` or using context after an `await` without checking `mounted` | Triggers silent framework crashes if the widget has been unmounted |
| Forgetting to close streams or stream subscriptions on widget destruction | Memory leaks; background event execution continues unchecked |
| Mixing synchronous blocking operations with reactive streams | Causes thread starvation and blocks Dart event loop processing |

### Correct Patterns

```dart
// CORRECT — Running heavy JSON deserialization inside an isolate using compute()
import 'package:flutter/foundation.dart';

class Order {
  final String id;
  final double total;
  Order({required this.id, required this.total});

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(id: json['id'] as String, total: json['total'] as double);
  }
}

// Heavy parsing executed on background Isolate
Future<List<Order>> parseOrdersInBackground(String rawJson) async {
  return await compute(_deserializeOrders, rawJson);
}

List<Order> _deserializeOrders(String rawJson) {
  final decoded = jsonDecode(rawJson) as List<dynamic>;
  return decoded.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
}

// CORRECT — Asynchronous action check using mounted check guard
class OrderWidgetState extends State<OrderWidget> {
  bool _isLoading = false;

  Future<void> _refreshOrder() async {
    setState(() => _isLoading = true);
    
    final order = await apiService.fetchOrder(widget.orderId);
    
    // Mount guard prevents crash if user navigated away during await!
    if (!mounted) return;
    
    setState(() {
      _isLoading = false;
      // update state variables
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container();
  }
}

// WRONG — Processing massive records inside the main loop
List<dynamic> badParse(String rawJson) {
  return jsonDecode(rawJson); // Blocks UI thread!
}
```

---

## 2. Memory & Allocations / Garbage Collection / Optimization

### Rules
- **ALWAYS** mark widget constructor calls with the `const` keyword wherever possible to permit element-node reuse, lowering GC pressure.
- **ALWAYS** call `dispose()` on all controllers (`AnimationController`, `TextEditingController`, `ScrollController`, `StreamController`) when destroying a stateful widget.
- **ALWAYS** protect animations and highly dynamic layouts from rebuilding structural parent trees by isolating them with `RepaintBoundary` wrappers.
- **ALWAYS** utilize `Keys` (`ValueKey`, `ObjectKey`) when mutating dynamic element collections to coordinate states correctly.

### Hard Guardrails — NEVER do this
| Forbidden | Reason |
|---|---|
| Leaving text/scroll controllers active without disposing them | Heavy memory leaks; controller contexts are never garbage collected |
| Rebuilding whole parent scaffolds via state changes | Heavy frame drops; forces the entire widget tree to rebuild |
| Loading large high-resolution images without resizing limits | Triggers swift Out-of-Memory (OOM) app crashes on lower-end devices |

### Correct Patterns

```dart
// CORRECT — Explicit disposal of all active controller states
class FormWidgetState extends State<FormWidget> {
  late final TextEditingController _textController;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController();
  }

  @override
  void dispose() {
    _textController.dispose(); // Correctly free V8/Dart engine memory!
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(controller: _textController);
  }
}
```

---

## 3. Collections & Data Structures / High-Performance Collections

### Rules
- **ALWAYS** initialize dynamic collections with a known capacity when possible using pre-sizing initializers (`List.filled`, `List.generate`).
- **ALWAYS** choose `Set` and `Map` structures over sequential `List` arrays when performing O(1) membership evaluations or lookup key operations.
- **ALWAYS** enforce complete type safety on API parsed map results via strong class types, refusing untyped `Map<dynamic, dynamic>` representations.

### Correct Patterns

```dart
// CORRECT — Set collection membership search execution (O(1))
final Set<String> rolesSet = {'admin', 'editor', 'viewer'};

bool isAuthorized(String role) {
  return rolesSet.contains(role); // Instant lookup
}
```

---

## 4. Database & ORM Integration

### Rules
- **ALWAYS** run local database operations (e.g. SQFlite, Isar, Hive) strictly asynchronously to prevent blocking the UI thread.
- **ALWAYS** write idempotent schema migrations for local storage database definitions to prevent user data loss on app updates.
- **ALWAYS** secure critical database files (e.g., local SQLite databases) with encryption options (like SQLCipher) on production builds.

#### Correct Migration (SQFlite)

```dart
import 'sqflite/sqflite.dart';

Future<void> initializeLocalDatabase() async {
  await openDatabase(
    'app_local.db',
    version: 2,
    onCreate: (db, version) async {
      await db.execute('CREATE TABLE cache_items (id TEXT PRIMARY KEY, value TEXT)');
    },
    onUpgrade: (db, oldVersion, newVersion) async {
      if (oldVersion < 2) {
        await db.execute('ALTER TABLE cache_items ADD COLUMN updated_at INTEGER');
      }
    }
  );
}
```

---

## 5. HTTP & Remote API Connections / Resilient HTTP Clients

### Rules
- **ALWAYS** configure explicit timeouts (`connectTimeout`, `receiveTimeout`, `sendTimeout`) on HTTP clients like `Dio`.
- **ALWAYS** execute resiliency policies (exponential backoff, exponential delays, automatic connection retries) inside Dio interceptors.
- **ALWAYS** encrypt outgoing HTTP payload traffic under strict HTTPS standards.

### Correct Patterns

```dart
import 'package:dio/dio';

// CORRECT — Highly configured resilient Dio HTTP client instance
final baseOptions = BaseOptions(
  baseUrl: 'https://api.company.com',
  connectTimeout: const Duration(seconds: 5),
  receiveTimeout: const Duration(seconds: 5),
  sendTimeout: const Duration(seconds: 5),
);

final dioClient = Dio(baseOptions)
  ..interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        // Inject auth header
        options.headers['Authorization'] = 'Bearer token';
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        // Execute automatic retry under transient conditions
        if (e.type == DioExceptionType.connectionTimeout) {
          // Process custom retry logic
        }
        return handler.next(e);
      }
    )
  );
```

---

## 6. Error Handling & Flow Control

### Rules
- **ALWAYS** configure global application-level error boundaries using `ErrorWidget.builder`, `FlutterError.onError`, and `PlatformDispatcher.instance.onError` to prevent crashing visually (e.g. Red Screen of Death).
- **ALWAYS** wrap main startup functions with `runZonedGuarded` to capture unhandled asynchronous zone errors.
- **NEVER** expose raw technical stack traces or debug errors directly to users; map them to friendly user-facing messages.

### Correct Patterns

```dart
import 'dart:async';
import 'package:flutter/material.dart';

void main() {
  runZonedGuarded(() {
    WidgetsFlutterBinding.ensureInitialized();
    
    // Configure global error widgets
    ErrorWidget.builder = (FlutterErrorDetails details) {
      return const Scaffold(
        body: Center(child: Text('An unexpected visual error occurred.')),
      );
    };
    
    runApp(const MyApp());
  }, (error, stackTrace) {
    // Structured background logging of uncaught exceptions
    debugPrint('UNCAUGHT EXCEPTION: $error');
  });
}
```

---

## 7. Caching Systems

### Rules
- **ALWAYS** store highly sensitive credentials, auth keys, and tokens within hardware-backed encrypted storage (`flutter_secure_storage`).
- **NEVER** save plain JSON tokens inside unencrypted settings (`shared_preferences`).
- **ALWAYS** validate cache expiration timelines before displaying outdated offline contexts.

---

## 8. Dependency Injection / Lifetime Management

### Rules
- **ALWAYS** manage application component references securely using a centralized service locator container (e.g. `GetIt`).
- **ALWAYS** register dependencies using strict lifecycles to prevent Captive Dependency states.

### Lifetime Mapping Table

| Scope | Registration | Description |
|---|---|---|
| **Singleton** | `registerSingleton()` | Initialized immediately at startup; persists permanently. |
| **Lazy Singleton** | `registerLazySingleton()` | Initialized only when first called; persists permanently. |
| **Factory** | `registerFactory()` | Creates a new instance every time it is resolved. |

```dart
import 'package:get_it/get_it.dart';

final sl = GetIt.instance;

void setupDependencyInjection() {
  // Singleton
  sl.registerLazySingleton<ApiClient>(() => ApiClient());
  
  // Factory (resolved on build)
  sl.registerFactory<OrderBloc>(() => OrderBloc(apiClient: sl<ApiClient>()));
}
```

---

## 9. Structured Logging

- **ALWAYS** write logs structured as typed levels (`info`, `warning`, `error`) utilizing print-safe utilities (`developer.log`).
- **NEVER** use standard print statements (`print()`) in production builds.

```dart
import 'dart:developer' as developer;

void logInfo(String message) {
  developer.log(message, name: 'com.company.app', level: 800);
}
```

---

## 10. GC / Runtime Tuning & Profiling

- **ALWAYS** run memory profiling using Flutter DevTools regularly to detect leaks or frame-render performance issues.
- **NEVER** release debug configuration binaries to App Stores; compile strict optimized binaries (`flutter build apk --release`).

---

## 11. Multi-Replica API K8s Guardrails (Mobile Context)

> The mobile app must interact with a multi-replica, horizontally autoscaled backend (3-10 replicas).

### 11.1 State & Stickiness
- **NEVER** build the mobile app with the assumption that a single replica will maintain backend state; treat all requests as completely stateless.

### 11.2 Distributed Locking Conflict
- **ALWAYS** handle `409 Conflict` or lock-related HTTP responses gracefully inside the mobile app. Implement standard randomized retry-with-backoff delays to yield to server-side distributed locks (`redlock` / `SETNX`).

### 11.3 Offline Synchronization
- **ALWAYS** design all mutating POST/PUT network requests with a persistent offline queue to support offline-first usage. Synchronize changes using sequential idempotency parameters.

### 11.4 Graceful Degradation under Pod Termination
- When the backend scales down or restarts (SIGTERM), connections may drop. The app **MUST** handle `503 Service Unavailable` or connection reset errors seamlessly by auto-retrying.

### 11.5 Health Checks Retry
- Avoid cascading API server failure under heavy startup/readiness conditions; implement custom backoffs when health checking downstream systems.

### 11.6 Connection Pooling & HTTP/2
- Enable HTTP/2 or Keep-Alive connection reuse in your HTTP client (`Dio`) to reduce connection setup overhead under high API scale.

### 11.7 Mobile Resource Optimization
- Keep background syncing routines highly optimized to prevent high battery drain and excess network usage.

### 11.8 API Keys & Dart Define Configs
- **ALWAYS** inject environment settings dynamically at build time using Dart variables: `flutter build --dart-define=API_URL=https://api.com`.

### 11.9 Idempotency Keys (Mobile Execution)

To prevent duplicate processing on the backend when requests are retried over unstable networks, the app **MUST** attach a unique, persistent Idempotency Key to every mutation request payload.

```dart
import 'package:uuid/uuid.dart';

Future<void> placeOrderResiliently(OrderPayload payload) async {
  // Persist the idempotency key locally inside SQLite/Hive
  final String idempotencyKey = const Uuid().v4();
  
  await dioClient.post(
    '/api/orders',
    data: payload.toJson(),
    options: Options(
      headers: {
        'Idempotency-Key': idempotencyKey, // Survives retries over weak cells!
      },
    ),
  );
}
```

---

## 12. Magic Values & Typings

- **ALWAYS** capture system configurations and theme metrics in type-safe class constants.

```dart
class AppConfig {
  static const double defaultPadding = 16.0;
  static const int maxConnectionRetries = 3;
}
```

---

## 13. Open Source & Dependency Policy

> See global policy: [`engineer/knowledge/ABI FOSS Policy.md`](../ABI%20FOSS%20Policy.md)

Verify and compile all imported pub.dev dependencies using locked configuration rules (`pubspec.lock`).

---

## 14. Authentication & Authorization

### 14.1 Authentication — Keycloak SSO Mobile App Integration

Authentication on mobile devices must follow the OpenID Connect (OIDC) Authorization Code Flow with PKCE via standard secure storage mechanisms.

```dart
import 'package:flutter_appauth/flutter_appauth';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class KeycloakAuthService {
  final FlutterAppAuth _appAuth = const FlutterAppAuth();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  Future<void> authenticateWithKeycloak() async {
    try {
      final AuthorizationTokenResponse? result = await _appAuth.authorizeAndExchangeToken(
        AuthorizationTokenRequest(
          'my-service-client-id',
          'com.company.app://oauth-callback', // Redirect URL schema
          issuer: 'https://keycloak.company.com/realms/my-realm',
          scopes: ['openid', 'profile', 'email', 'offline_access'],
        ),
      );

      if (result != null && result.accessToken != null) {
        // Encrypt and persist token securely in iOS Keychain / Android Keystore
        await _secureStorage.write(key: 'access_token', value: result.accessToken);
        await _secureStorage.write(key: 'refresh_token', value: result.refreshToken);
      }
    } catch (e) {
      debugPrint('Keycloak auth error: $e');
    }
  }
}
```

### 14.2 Authorization — Local UI Role Guards

Check user roles contained in the authenticated claims to toggle app functions or screens dynamically.

```dart
class RoleGuard extends StatelessWidget {
  final List<String> requiredRoles;
  final Widget child;
  final Widget fallback;

  const RoleGuard({
    super.key,
    required this.requiredRoles,
    required this.child,
    required this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    // Fetch and decode roles from local token store
    final List<String> userRoles = authProvider.currentUserRoles;
    
    final bool hasAccess = requiredRoles.any((role) => userRoles.contains(role));
    
    return hasAccess ? child : fallback;
  }
}
```
