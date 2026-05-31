<!-- PYDANTIC:START -->
# Pydantic Rules

## Conventions
- Use Pydantic v2 (`BaseModel` from `pydantic`); annotate all fields with explicit Python types — avoid `Any` except at genuine boundaries.
- Use `model_validator(mode="before")` for cross-field normalization and `field_validator` for single-field constraints.
- Define `model_config = ConfigDict(...)` on the class instead of an inner `class Config` (v2 style).
- Use `model.model_dump(exclude_unset=True)` for partial updates so unset fields are not sent downstream.
- Prefer `Annotated[T, Field(...)]` for reusable constraints (min/max length, regex, ge/le) over bare `Field()` inside the model.
- Use `RootModel[T]` for typed list/dict wrappers instead of wrapping a single field named `__root__`.

## Avoid
- Using `dict(model)` — use `model.model_dump()` to respect aliases and serialization settings.
- Mutating model instances after creation unless `model_config = ConfigDict(frozen=False)` is intentional.
- Relying on implicit coercion for strict domains (IDs, enums) — use `model_config = ConfigDict(strict=True)` or `StrictInt`/`StrictStr`.
- Mixing v1 (`@validator`, inner `Config`) and v2 APIs in the same model.
<!-- PYDANTIC:END -->
