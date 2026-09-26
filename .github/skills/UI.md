# UI Skill: shadcn/ui + Tailwind Conventions

Purpose
- Provide authoritative UI implementation guidance for contributors and Copilot-generated code.

Key Rules
- Use only `shadcn/ui` components; do not introduce alternative UI libraries or custom component libraries.
- Prefer composition of shadcn primitives and patterns over creating bespoke components.
- Use Tailwind CSS v4 utility classes and the project's design tokens (defined in `src/app/globals.css`).
- Use `date-fns` for all date formatting and parsing. Avoid manual date string construction in UI code.
- Prefer server components by default; opt into client components only when interactivity is required.

Patterns
- Layouts and pages: place in `src/app` following App Router conventions.
- Shared UI: add only small reusable pieces in `src/components/ui/` and register them with existing patterns.
- Accessibility: ensure components use semantic HTML and shadcn accessibility props (labels, roles).

Checklist for PRs
- Uses `shadcn/ui` components (yes/no)
- Contains new custom UI components (yes/no — explain why)
- Date handling via `date-fns` (yes/no)
- Server vs Client component choice justified (yes/no)
