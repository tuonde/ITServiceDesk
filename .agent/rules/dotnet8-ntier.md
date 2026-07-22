\# .NET 8 N-Tier Architecture Rules

1\. TECHNOLOGY STACK STRICTNESS

\- Use C# 12 features (primary constructors, collection expressions).

\- Use ASP.NET Core 8 Web API.

\- Use Entity Framework Core 8 (Code First approach).

2\. ARCHITECTURE \& LAYERS

\- The project strictly follows Layered/N-Tier Architecture.

\- Layers: Core (Entities), Data (DbContext, Repositories), Service

(Business Logic, DTOs, Validations), API (Controllers).

\- NEVER access DbContext directly from Controllers.

\- Controllers must only communicate with Interfaces located in the Service

layer.

3\. REQUIRED LIBRARIES \& PATTERNS

\- Logging: Always use Serilog. Inject ILogger<T> into services.

\- Mapping: Always use AutoMapper. Define Profiles in the Service layer.

\- Validation: Always use FluentValidation. Do not use Data Annotations on

Entities for validation.

\- Response: Use a generic `ApiResponse<T>` wrapper class for all controller

responses.

4\. NAMING CONVENTIONS

\- Entities: Singular (e.g., Ticket, User).

\- Controllers: Plural (e.g., TicketsController).

\- Interfaces: Prefixed with 'I' (e.g., ITicketService).

\- Async Methods: Must end with "Async" (e.g., GetTicketByIdAsync).

