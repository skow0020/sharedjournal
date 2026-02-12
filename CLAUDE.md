# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SharedJournal is a Next.js 16 application using the App Router architecture. It uses TypeScript, Tailwind CSS v4, and React 19.

## Development Commands

- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Build production bundle
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npx tsc --noEmit` - Run TypeScript typecheck (no errors currently)

## Architecture

### App Router Structure
- Uses Next.js App Router (`src/app/` directory)
- `layout.tsx` - Root layout with font configuration (Geist Sans/Mono)
- `page.tsx` - Main page component
- `globals.css` - Global styles with Tailwind CSS v4 using `@import "tailwindcss"`

### Tailwind CSS v4
- Uses inline theme configuration in `@theme inline` block
- CSS custom properties for color scheme variables (`--background`, `--foreground`)
- Dark mode support via `prefers-color-scheme: dark` media query
- Font variables: `--font-geist-sans` and `--font-geist-mono`

### Path Aliases
- `@/*` maps to `./src/*` (configured in tsconfig.json)

### TypeScript Config
- Strict mode enabled
- Target: ES2017
- Module resolution: bundler
- JSX: react-jsx

### ESLint
- Uses `eslint-config-next` with core-web-vitals and TypeScript rules
- Note: `next-env.d.ts` is explicitly ignored (line 14 of eslint.config.mjs), but still included in TypeScript compilation