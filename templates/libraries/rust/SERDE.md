<!-- SERDE:START -->
# Serde Rules

## Conventions
- Derive `Serialize, Deserialize` on data types; add `#[serde(deny_unknown_fields)]` on strict API contracts to reject unexpected keys
- Use `#[serde(rename_all = "camelCase")]` at the struct level instead of per-field `rename` for consistent naming conventions
- Mark optional fields with `#[serde(skip_serializing_if = "Option::is_none")]` to keep serialized output clean
- Use `#[serde(default)]` on fields that should fall back to `Default::default()` when the key is absent during deserialization
- For enums, use `#[serde(tag = "type")]` (internally tagged) or `#[serde(untagged)]` to control the wire representation explicitly
- Use `#[serde(with = "module")]` or `#[serde(serialize_with / deserialize_with)]` to apply custom logic to individual fields without newtype wrappers

## Avoid
- Do not use `serde_json::Value` as a field type when the shape is known — use a concrete type for compile-time guarantees
- Do not derive `Deserialize` on types with `#[non_exhaustive]` without `#[serde(deny_unknown_fields)]`; silent data loss is likely
- Do not mix `#[serde(flatten)]` with `#[serde(deny_unknown_fields)]` on the same struct — the combination is unsupported and panics at runtime
<!-- SERDE:END -->
