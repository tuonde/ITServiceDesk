# Feature Development Workflow
When asked to "create a new feature" or "add a new module", strictly follow
this sequence step-by-step. Do not skip steps.
STEP 1: CORE LAYER (Entities)
- Create the Entity class inheriting from BaseEntity (if exists).
- Add navigation properties for EF Core relationships.
STEP 2: DATA LAYER (Persistence)
- Add the DbSet to ApplicationDbContext.
- Create Entity-specific configurations (IEntityTypeConfiguration).
- Create I[Entity]Repository interface and [Entity]Repository
implementation.
STEP 3: SERVICE LAYER (Business Logic & Mapping)
- Create Create[Entity]Dto, Update[Entity]Dto, and [Entity]ResponseDto.
- Create the AutoMapper profile.
- Create FluentValidation rules for DTOs.
- Create I[Entity]Service interface and [Entity]Manager (implementation).
- Implement business rules and call Repository methods.
STEP 4: API LAYER (Presentation)
- Create [Entities]Controller.
- Inject I[Entity]Service.
- Add standard CRUD endpoints (Get, Post, Put, Delete).
- Apply [Authorize] attribute where necessary and add Swagger summaries.