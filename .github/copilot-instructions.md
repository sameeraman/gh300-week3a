# Repository Instructions

- Use strict TypeScript and preserve all strict compiler checks. Do not introduce `any` unless an external API makes it unavoidable and the boundary is documented.
- Validate all untrusted input at the HTTP boundary before it reaches application or storage logic.
- Return errors through the shared JSON envelope: `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
- Add or update tests for every behavior change, including success statuses, validation failures, and relevant not-found behavior.
- Keep the Express application separate from the listening server so tests can construct isolated application instances.