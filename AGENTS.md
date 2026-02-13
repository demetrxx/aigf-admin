# AIgf Admin — Project Context

## Overview
AIgf Admin is an internal SPA for managing the AIgf (ai-girlfriend) product.
The app is used by customers and developers for operations, configuration, and support workflows.
Minimalism and clarity matter more than visual flair.

## Architecture
- SPA built with Vite + React + TypeScript.
- Data fetching via TanStack Query.
- Communicates with NestJS backend via HTTP APIs.
- Auth: cookie-based sessions (httpOnly, handled by backend).
- Styling: CSS Modules + CSS variables for tokens.
- UI primitives: Radix UI headless components only.

## UX Principles (Non-negotiable)
- Admin-first: tables, forms, and actions are primary; avoid ornamental UI.
- Calm hierarchy: near-white canvas with subtle panels; spacing over decoration.
- Minimalism over configurability: expose only necessary controls; reduce noise.
- Internal tool tone: precise, neutral copy; no marketing voice.

## Auth & Copy
- Auth flow is already implemented; do not change logic.
- Replace any remaining Echo text with AIgf Admin copy.

## Design System
### Colors
- Ink: #1C232B
- Muted: #5B6675
- Border: #E4EAF0
- Background: #F7FAFC
- Surface: #FFFFFF
- Accent: #4AA3F0
- Accent tint: #E3F1FD
- Accent only for primary actions, focus states, active navigation.
- No gradients, no bright colors.

### Radius & Shadows
- Small, restrained radius (4-8px max).
- Avoid shadows almost entirely; prefer borders and spacing.

### Typography
- UI and content font: Inter.
- Headings remain sans (Inter).
- Base size: 15-16px, line-height 1.5-1.6, max width 60-70ch for long text.

## Component Philosophy
- Small internal UI kit (not a full design system).
- Prefer composition over prop explosion.
- Keep JSX clean; styling lives in CSS Modules.

## UI Kit Usage Rules (Use These Components)
### Buttons & Navigation
- Button, IconButton, ButtonGroup
- Navigation

### Typography
- Typography (h1/h2/h3/body/meta/caption/control/prose/proseCompact)

### Forms
- Field, FormRow
- Input, Textarea, Select
- Checkbox, Switch, Radio, RadioGroup

### Feedback
- Alert, Toast, EmptyState, Skeleton, Progress

### Layout
- Card, Section, Divider, Stack, Grid, Container

### Data Display
- Badge, Tag, Avatar, List, Table

### Navigation Components
- Tabs, Breadcrumbs, Pagination

### Overlays
- Modal, Popover, Dropdown, Tooltip

## Required Replacements
- Use `Button` instead of raw `button` and link-styled buttons.
- Use `Typography` instead of raw `p`, `span`, `h1-h3` for UI text.
- Use `Input`, `Textarea`, `Select` instead of raw form elements.
- Use `Field` + `FormRow` to structure form layouts.

## Accessibility
- Internal tooling: keep basic keyboard navigation and focus-visible styles via Radix.

## What Not To Do
- No heavy cards, shadows, or decorative UI.
- No gradients or bright colors.
- No marketing or consumer-facing styling.
- No Tailwind utility soup.
