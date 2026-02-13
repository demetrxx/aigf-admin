Ниже — **чёткое, инженерное описание фронтенд-проекта**, которое можно напрямую скормить Codex / Cursor / Copilot как *project context*. Без маркетинга, без воды, с фокусом на архитектуру, стиль и ограничения.

---

## Project: AIgf Admin — Frontend Application

### Overview

AIgf Admin is an internal web application for managing the AIgf (ai-girlfriend) product.
It is used by customers and engineers for operations, configuration, and support workflows.

The frontend is a **SPA** that communicates with an existing **NestJS backend** via HTTP APIs.
The marketing website is separate; this project is the authenticated app only.

Auth is cookie-based sessions (httpOnly, handled by the backend). The auth flow already works; update copy only.

---

## Tech Stack

* **Framework:** React (SPA)
* **Build tool:** Vite
* **Language:** TypeScript
* **Routing:** React Router (or TanStack Router)
* **State / data fetching:** TanStack Query
* **Styling:**

    * CSS Modules
    * CSS variables for design tokens
    * No Tailwind
* **UI primitives:** Radix UI (headless components only)
* **Auth:** Cookie-based sessions (httpOnly, handled by backend)

---

## Core UX Principles (Very Important)

1. **Admin-first**

    * Tables, forms, and actions are the primary objects on screen.
    * No ornamental UI, heavy cards, or decorative panels.
    * Content sits on a clean near-white canvas.

2. **Calm hierarchy via background, not decoration**

    * Main content area: white / near-white
    * Sidebars / context / navigation: slightly muted gray
    * Accent color is subtle and reserved for primary actions.

3. **Minimalism over configurability**

    * Expose only necessary controls.
    * Reduce noise, avoid visual clutter.
    * Keep workflows clear and linear.

4. **Internal tool tone**

    * Copy is precise, neutral, and utilitarian.
    * Avoid marketing or consumer-facing language.

---

## Design System

### Colors

* Ink: **#1C232B**
* Muted: **#5B6675**
* Border: **#E4EAF0**
* Background: **#F7FAFC**
* Surface: **#FFFFFF**
* Accent: **#4AA3F0**
* Accent tint: **#E3F1FD**
* Accent is used only for:

    * primary actions
    * focus states
    * active navigation
* No gradients, no bright colors.

### Border Radius

* Small and restrained.
* 4–8px max.
* No pill shapes.
* No rounded cards everywhere.

### Shadows

* Avoid shadows almost entirely.
* Use borders and spacing instead.

---

## Typography

### Fonts

* **UI font:** Inter
* **Content font:** Inter

### Usage rules

* UI elements (buttons, labels, navigation): **Inter**
* Content text: **Inter**
* Headings stay **sans-serif** (Inter).

### Content text

* 15-16px
* Line-height: ~1.5-1.6
* Max width: ~60-70ch for long-form text

Typography is restrained and functional.

---

## Key Screens / Pages

* TBD later. Do not invent pages without a spec.

---

## Components Philosophy

* Build a **small internal UI kit**, not a full design system.
* Core components:

    * Button
    * Input / Textarea
    * Select / Dropdown
    * Tabs
    * Dialog / Popover
* Prefer composition over props explosion.
* Keep JSX clean; styling lives in CSS Modules.

---

## Accessibility

* Not a user-facing app; a11y is not a primary constraint.
* Still keep baseline keyboard navigation and focus-visible styles via Radix where applicable.

---

## What NOT to do

* No heavy cards, shadows, or decorative UI.
* No gradients, bright colors, or flashy effects.
* No marketing or consumer-facing styling.
* No Tailwind utility soup.
* Do not refactor the auth flow; update copy only.

---

## Mental Model to Preserve

> "I come here to operate and inspect.
> The system stays out of the way."

---

If ты хочешь, следующим шагом я могу:

* адаптировать это описание под **Cursor rules / system prompt**
* или сделать **более короткую версию** (10–15 строк) специально под Copilot
* или описать **один ключевой экран** (Theme / Editor) максимально детально для генерации компонентов
