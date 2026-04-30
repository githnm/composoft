# Changelog

## 0.1.0-alpha.1

Fixes for adopting the composer against a registry that lives outside the composoft monorepo.

- `--registry` now accepts a relative path (`./my-registry`), an absolute path, a single-file entry path, or a bare module name. The CLI resolves whichever form the user passed and reads the registry's `package.json` to recover the actual package name.
- The generated `package.json` no longer pins the registry as `workspace:*`. It writes a `file:` dep computed relative to the output directory, so `pnpm install` works regardless of where the registry sits on disk.
- `@composoft/runtime` is pinned to the composer's own version (read from the running composer's `package.json`) instead of `workspace:*`, so generated apps install a published runtime that matches the composer that emitted them.
- The Tailwind config's third content glob is now derived from the resolved registry directory instead of a hardcoded `../../registry-example-postgres/...` path.
- `lib/registry.ts` re-exports by package name (read from the registry's `package.json`), not by whatever string the user passed to `--registry`.

## 0.1.0-alpha.0

Initial alpha release.
