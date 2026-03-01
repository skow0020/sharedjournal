# UI Coding Standards

These standards apply to all UI work in this project.

## Component Library

- Use **only** `shadcn/ui` components for UI implementation.
- Do not introduce custom UI components.
- Do not use alternative component libraries for UI elements.

## Styling and Composition

- Compose screens and features from existing `shadcn/ui` building blocks.
- If a required UI pattern is missing, add it via the standard `shadcn/ui` component workflow rather than creating bespoke custom components.

## Date Formatting

- Use `date-fns` for all date formatting and date display logic in the UI.
- Avoid manual date string formatting for user-facing dates.

## Enforcement

- All pull requests should be reviewed against this document.
- Changes that add custom UI components or non-`date-fns` date formatting should be updated before merge.
