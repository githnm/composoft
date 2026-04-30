# Changelog

## 0.1.0-alpha.3

Version bump for sync with composer 0.1.0-alpha.3 (shadcn chrome). No code changes.

## 0.1.0-alpha.2

Adds product/branding metadata to the spec.

- New types: `NavigationItem`, `ProductInfo`. New validator: `validateProductInfo` (with `productInfoSchema`).
- `Registry.product?: ProductInfo` — optional registry-level field. Carries product name, accent color, and primary nav. Consumed by `@composoft/composer` to render real B2B chrome (navbar, sidebar, page headers) in generated apps. Registries without it still generate bare-layout apps.

## 0.1.0-alpha.1

Version bump for sync with composer 0.1.0-alpha.1. No code changes.

## 0.1.0-alpha.0

Initial alpha release.
