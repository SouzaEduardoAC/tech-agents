# Knowledge: Design & Architectural Patterns

## 1. Object-Oriented Principles (OOAD)
- **SOLID:** Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- **GRASP:** Information Expert, Creator, Controller, Low Coupling, High Cohesion, Polymorphism, Pure Fabrication, Indirection, Protected Variations.
- **KISS/DRY/YAGNI:** Essential for maintainable, lean codebases.

## 2. Local Design Patterns (GoF)
- **Creational:** Factory Method, Abstract Factory, Builder, Singleton, Prototype.
- **Structural:** Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy.
- **Behavioral:** Command, Interpreter, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor.

## 3. Enterprise Integration Patterns (EIP)
- **Messaging:** Pub/Sub, Point-to-Point, Request-Reply, Dead Letter Channel.
- **Routing:** Content-Based Router, Splitter, Aggregator, Dynamic Router.
- **Transformation:** Content Enricher, Normalizer, Canonical Data Model.

## 4. Architectural Styles
- **Clean / Hexagonal / Onion:** Strict separation of concerns; business logic at the core, independent of UI, DB, or Frameworks.
- **Microservices:** Independent deployment, domain-based scaling (Bounded Contexts).
- **Event-Driven (EDA):** Asynchronous, decoupled, reactive systems using event streams.
- **CQRS:** Command Query Responsibility Segregation for high-performance scaling.
- **Serverless:** Event-based, ephemeral execution with managed infrastructure.
