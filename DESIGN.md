---
name: YourWeekend
description: Warm trip-planning UI with airy neutrals, confident blue accent, and serif display moments.
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  bg-page: "#f0f4f9"
  surface: "#ffffff"
  text-primary: "#0f172a"
  text-secondary: "#64748b"
  text-placeholder: "#94a3b8"
  text-on-primary: "#ffffff"
  text-accent: "#2563eb"
  border: "#e2e8f0"
  nav-border: "#00000012"
typography:
  display:
    fontFamily: "var(--font-playfair), ui-serif, Georgia, serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "normal"
  headline:
    fontFamily: "var(--font-playfair), ui-serif, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  title:
    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-on-primary}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1.25rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.text-on-primary}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1.25rem"
  chip-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    padding: "0.5rem 1rem"
  search-shell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "0"
---

# Design System: YourWeekend

## Overview

**Creative North Star: "The Open Itinerary"**

YourWeekend reads as a **bright, approachable trip companion**: cool page wash, white surfaces, and a single **electric blue** accent that marks progress, selection, and the primary action. **Playfair Display** carries emotional headlines and section titles; **Inter** carries UI chrome, inputs, and dense copy. Density stays **product-comfortable**: generous radius on the hero search module, soft dropdowns, and quick-pick chips that feel tappable, not corporate.

The system **rejects generic SaaS monoculture** called out in PRODUCT.md: no purple-gradient heroes, no decorative gradient text, no identical icon-title-card grids as the default layout language, and no modal-first flows where inline steps would be clearer. Warmth shows up as **clear hierarchy, friendly microcopy slots, and serif personality on hero moments**, not as noisy decoration.

**Key Characteristics:**

- **Restrained accent discipline** — blue signals action, verification, and selection; neutrals carry structure.
- **Serif for story, sans for work** — display moments are editorial; forms and nav stay utilitarian.
- **Soft containment** — `rounded-2xl` shells and `shadow-sm` / `shadow-lg` separate layers without heavy skeuomorphism.
- **Three modes, one chrome** — mode switcher, inputs, and submit share one search bar vocabulary across plan, event, and inspire.

## Colors

The palette is **cool-air neutral** (page wash `#f0f4f9`) plus **white surfaces** and **slate text**, with **blue 600/700** as the only strong chroma for interactive emphasis.

### Primary

- **Horizon Blue** (`#2563eb`): Primary buttons, links, active nav, mode checkmarks, verified-location icon, chip hover border/text accent. Carries "let's go" energy without neon.
- **Approach Blue** (`#1d4ed8`): Hover background for filled primary controls only.

### Neutral

- **Page Mist** (`#f0f4f9`): Default `body` background; hover wash inside menus (`bg-bg-page`); subtle canvas behind white cards.
- **Surface White** (`#ffffff`): Nav, cards, search shell, dropdowns, mobile sheet.
- **Ink Slate** (`#0f172a`): Primary text and icons on light surfaces.
- **Mist Gray** (`#64748b`): Secondary labels, supporting city lines, de-emphasized nav when idle.
- **Placeholder Haze** (`#94a3b8`): Input placeholders, idle map-pin icons in lists.
- **Rule Line** (`#e2e8f0`): Default borders on shells, dividers, chip outlines.
- **Nav Hairline** (`rgba(0,0,0,0.07)`): Header bottom edge for separation without heaviness.

### Named Rules

**The One Accent Rule.** Strong blue appears where the user commits or orients: CTAs, selected rows, verified state, text links. Do not spray mid-blue as large background fields on whole sections.

**The No-Pure-Black Rule.** Text and borders use slate neutrals, not `#000`, keeping the cool mist page harmonious.

## Typography

**Display Font:** Playfair Display (via `--font-playfair`, fallbacks `ui-serif`, Georgia, serif)  
**Body Font:** Inter (via `--font-inter`, fallbacks `ui-sans-serif`, system-ui, sans-serif)  
**Label/Mono Font:** Inter (same stack; no separate mono in the current system)

**Character:** The pairing is **magazine headline meets planning app**: Playfair adds warmth and trip romance on the hero and saved-trip headings; Inter keeps search, dates, and navigation legible and calm.

### Hierarchy

- **Display** (700, `clamp(2.25rem, 5vw, 3.75rem)`, line-height ~1.15): Hero only, e.g. "Design your *perfect* escape." One italic accent word in primary color is allowed here as emphasis, not as gradient text.
- **Headline** (700, ~1.25rem): Section titles like "Your last saved trip" where a serif section header is needed.
- **Title** (600, 1rem): Card titles, dense headings inside components when sans is clearer.
- **Body** (400, 15px with 1.5 line-height): Form inputs, autocomplete rows, explanatory lines. Keep paragraph blocks under **65–75ch** where long copy appears.
- **Label** (600, 0.875rem, sentence case): Mode selector, button labels, nav items. Chips use the same family at 0.875rem with medium weight.

### Named Rules

**The Serif Containment Rule.** Playfair is for **hero and selective section headers**, not for buttons, labels, or table data.

## Elevation

Depth is **ambient, not theatrical**: most structure comes from **white on mist** contrast and **1px borders**. Shadows appear on **floating overlays** (dropdowns, autocomplete, account menu, mobile nav panel, hover lift on trip cards).

### Shadow Vocabulary

- **Resting card** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): Matches Tailwind `shadow-sm` on the main search shell.
- **Overlay float** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): Dropdowns and popovers (`shadow-lg`).
- **Card hover** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): Saved trip card hover (`shadow-md`).

### Named Rules

**The Flat Page Rule.** The page background stays flat; elevation belongs to **interactive layers** (menus, cards, shell) that sit above it.

## Components

### Buttons

- **Shape:** Primary actions use **12px radius** (`rounded-xl`); full pill for quick-pick chips (`rounded-full`).
- **Primary:** Filled `#2563eb`, white label, semibold, horizontal padding ~20px, vertical ~10px on desktop; full-width on small breakpoints inside the search shell.
- **Hover / Focus:** Background shifts to `#1d4ed8`; `transition-colors`. Disabled uses **40% opacity** and `cursor-not-allowed`, no hover lift.
- **Ghost / outline:** Account icon uses `bg-primary/10` circle with primary glyph; hover `bg-primary/20`. Menu rows use text color shift and `hover:bg-bg-page`.

### Chips

- **Style:** White fill, `border-border`, secondary text; **hover** promotes border and text to primary (outline chip, not solid fill).

### Cards / Containers

- **Corner Style:** Large surfaces use **16px** (`rounded-2xl`) on saved-trip cards and dropdowns; the unified search bar uses **16px** outer radius.
- **Background:** White on page mist; hero image area can be full-bleed inside the card with overflow hidden.
- **Shadow Strategy:** `shadow-sm` at rest for the search shell; `shadow-md` on interactive card hover; `shadow-lg` for detached menus.
- **Border:** `1px` `border-border` on shells and dropdowns.
- **Internal Padding:** Mode column and inputs use **12–16px** horizontal rhythm; submit column padded separately on mobile stack.

### Inputs / Fields

- **Style:** Transparent field backgrounds inside the shell; **15px** body size; placeholder uses placeholder token; **no visible box** until error patterns are introduced later.
- **Focus:** Rely on implicit focus ring from browser or future tokenized `focus-visible` ring; keep outlines from being removed without replacement.
- **Verified state:** Leading check icon switches to primary color when city is locked in.

### Navigation

- **TopNav:** Sticky white bar, hairline bottom border, max width **72rem** centered, height **56px / 64px**. Logo image (VOYA mark) left. Desktop links: **8px** radius hover, active link = primary color + semibold. Account: circular soft-primary wash. Mobile: hamburger, full-width sheet, scrim `black/40`.

## Do's and Don'ts

### Do:

- **Do** keep the **mist page + white surface + blue action** triangle for new screens so the app stays recognizable in planning moments.
- **Do** use **Playfair** for hero and major section titles, **Inter** for everything interactive or data-dense.
- **Do** use **primary/10** washes for selected rows and active mobile nav items, reserving solid primary for one primary CTA per view where possible.
- **Do** respect PRODUCT.md: **three modes, one product** — shared search-bar anatomy for plan, event, and inspire.

### Don't:

- **Don't** lean into **Generic SaaS / "AI product" monoculture** as defined in PRODUCT.md: purple-gradient hero clichés, identical icon+title+card grids as the default pattern, **side-stripe accent borders** as fake structure, **gradient text** on headings, or **modal-first** flows when progressive inline steps would serve trust better.
- **Don't** produce **interchangeable template travel** UIs: avoid layouts that could be swapped with any other category app by changing the logo alone.
- **Don't** set body or long UI copy in Playfair; it erodes scanning for dates, cities, and prices.
- **Don't** use pure `#000` or `#fff` as system-wide text or page colors; stay on the defined slate and mist tokens.
