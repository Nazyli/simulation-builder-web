---
name: Simulation Builder Frontend
description: Restrained, production-grade workflow tooling for building and operating simulations.
colors:
  primary: '#9929EA'
  secondary: '#D8AEF7'
  brand-accent-fill: '#9929EA'
  canvas: '#FAF5FE'
  surface: '#FFFFFF'
  text-primary: '#172033'
  text-secondary: '#64748B'
  border: '#DBE3EC'
  border-strong: '#C6D2DF'
  accent-tint: '#F5E7FF'
  accent-text: '#5B148F'
  destructive: '#DC2626'
  status-amber-bg: '#FFFBEB'
  status-amber-border: '#FDE68A'
  status-amber-text: '#B45309'
typography:
  page-title:
    fontFamily: 'Plus Jakarta Sans Variable, Arial, sans-serif'
    fontSize: '20px'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.02em'
  page-title-mobile:
    fontFamily: 'Plus Jakarta Sans Variable, Arial, sans-serif'
    fontSize: '18px'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.02em'
  display:
    fontFamily: 'Plus Jakarta Sans Variable, Arial, sans-serif'
    fontSize: 'clamp(1.5rem, 3vw, 2rem)'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.02em'
  title:
    fontFamily: 'Plus Jakarta Sans Variable, Arial, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: '-0.015em'
  body:
    fontFamily: 'Plus Jakarta Sans Variable, Arial, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Plus Jakarta Sans Variable, Arial, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: '0.01em'
rounded:
  sm: '2px'
  md: '4px'
  lg: '6px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  xxl: '32px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '#FFFFFF'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: '8px 14px'
  button-primary-hover:
    backgroundColor: '#7D1FC2'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.text-secondary}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    padding: '6px 8px'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.md}'
    padding: '8px 10px'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.lg}'
    padding: '16px'
---

# Design System: Simulation Builder Frontend

## Overview

**Creative North Star: "Quiet control room"**

Simulation Builder is an operational workflow tool, so the interface should feel calm, dense, and dependable during repeated daily use. Visual hierarchy comes from typography, proximity, alignment, and restrained contrast rather than decoration. The primary accent is reserved for actions, active states, focus, and selected surfaces.

The application has three visual modes: workbench surfaces for Studio and Runner, operations surfaces for History, Timers, and Master Data, and reference/configuration surfaces for Documentation and Settings. Each mode shares the same visual language while adapting density and structure to the task.

**Key Characteristics:**

- Quiet, professional, and information-dense.
- Flat surfaces with structural borders and selective elevation.
- One recognizable violet accent used sparingly and consistently.
- Responsive layouts that use available space without page-level overflow.

## Colors

The palette combines a cool near-white canvas, white working surfaces, slate text, and one violet brand accent.

### Theme customization

The shared header's Theme button opens a compact drawer with two editable colors:
Primary and Surface. Controls appear first, followed by a read-only preview of
the automatic Secondary and Background colors and twenty-one presets in two columns.
Each preset shows only its Primary and Surface swatches. Default is always first
and retains primary `#9929EA` and surface `#FFFFFF`.
Other presets are Ocean, Teal, Indigo, Emerald, Rose, Slate, Amber, Orange, Coral,
Ruby, Pink, Sky, Mint, Olive, Sand, Coffee, Midnight, Charcoal, Forest Night,
and Material Palenight.
Palettes use ui-ux-pro-max catalog colors and variants adapted for this dashboard.
Material Palenight uses the purple and second background from
the [Material Theme palette](https://material-theme.com/docs/reference/color-palette/)
as primary `#C792EA` and surface `#34324A`.
Secondary mixes primary toward surface (62% on light surfaces, 30% on dark).
The light canvas blends 4.5% primary into surface. The dark canvas darkens surface
22% then blends 3.5% primary; relative surface luminance below 0.179 selects dark.
All presets and custom colors follow this same rule so each palette stays in one
color family. Text and interaction contrast are resolved separately.
The center scrolls while header and footer remain visible. Changes apply live;
Reset to default restores the base colors and regenerates their companions.

The theme module in `src/shared/theme/` validates and stores a versioned palette
in `simulation-builder.theme.v1` localStorage with version 2 containing only the
base colors. Version 1 preferences retain Primary and Surface and regenerate
the supporting colors. Startup applies it before rendering.
Denied storage does not prevent live changes. Foregrounds, selected states,
hover/focus treatments, and neutrals adapt from the palette. UI panels use
`bg-card`; page and workspace backgrounds use `--color-canvas`. Status and action
colors, backend catalog node/port/edge colors, and embedded content retain their
domain meanings. Theme preferences are local to the browser.

Theme and Actor share a compact drawer with a maximum width of 320 px, 8 px
viewport insets, rounded corners, consistent 12 px content insets, 13 px titles,
and short transitions that respect reduced motion. Preset rows and contact rows
use quiet hover fills and a clear selected tint instead of individual borders.
Actor keeps the search and group filter together, groups contacts with readable
labels/counts, and shows the current selection above its confirmation button.

AI usage charts and calendar intensities derive from the current primary,
secondary, and surface; graph path highlights derive against the canvas.
Documentation navigation/links and Studio controls use the same theme tokens.
Flow, Edit, and Reschedule are neutral slate actions, with blue informational
actions and red destructive actions retaining their meanings. New visual groups
default to slate; explicitly stored group colors remain authored content.

### Primary

- **Simulation Builder Violet** (`{colors.primary}`): Primary actions, active navigation, focus rings, and selected controls.
- **Soft Violet** (`{colors.secondary}`): Secondary brand expression and restrained hover or supporting accents.
- **Brand Accent Fill** (`{colors.brand-accent-fill}`): Small brand-specific surfaces only, never as a general page background or text treatment.

### Neutral

- **Cool Canvas** (`{colors.canvas}`): Main application page background.
- **Surface White** (`{colors.surface}`): Forms, tables, panels, cards, and dialogs.
- **Ink** (`{colors.text-primary}`): Headings, primary values, and important labels.
- **Slate** (`{colors.text-secondary}`): Descriptions, metadata, helper text, and secondary controls.
- **Structural Border** (`{colors.border}`): Dividers, table boundaries, and panel edges.
- **Strong Border** (`{colors.border-strong}`): Focused or emphasized controls.
- **Accent Tint** (`{colors.accent-tint}`): Selected or active backgrounds paired with `{colors.accent-text}`.

### Status

- **Amber Status Background** (`{colors.status-amber-bg}`), **Amber Border** (`{colors.status-amber-border}`), and **Amber Text** (`{colors.status-amber-text}`): Locked, warning, or usage states.
- **Destructive** (`{colors.destructive}`): Delete and irreversible actions only.

**The One Accent Rule.** Violet is an interaction signal, not a decorative fill. Do not introduce a different accent color for each menu item or feature.

## Typography

**Display Font:** Plus Jakarta Sans Variable (with Arial, sans-serif fallback)

**Body Font:** Plus Jakarta Sans Variable (with Arial, sans-serif fallback)

**Character:** The type system is compact, clear, and slightly technical without using a costume monospace face. Weight and spacing create hierarchy; large display text is used sparingly.

### Hierarchy

- **Page title** (600, `20px`, 1.25; `18px` up to 620px): Plain, left-aligned titles through `PageHeader`, without decorative icons or a surrounding card.
- **Title** (600, `1.125rem`, 1.35): Section titles and meaningful panel headings.
- **Body** (400, `0.875rem`, 1.5): Main interface copy and form content.
- **Label** (600, `0.75rem`, 1.35, slight positive tracking): Compact metadata, controls, and status labels.
- **Micro metadata** (500–600, `0.68rem–0.75rem`): Counts, compact state text, and supporting context; never below readable contrast.

**The No-Display-Costume Rule.** Do not use gradient text, oversized headings, all-caps decoration, or monospace text unless the content is genuinely code or measurement data.

## Layout

Use a 4px spacing rhythm. `PageFrame` owns all page geometry: 20px padding on desktop, 18px at widths up to 900px, and 12px at widths up to 620px, with a 16px gap between page sections. The `--page-inset` and `--page-gap` tokens in `src/index.css` also align the shell header and nested workspace content. Modes and typography density do not change page spacing. Avoid page-level padding, gap, background, and width overrides.

Pages use the available content width. A readable form or article may constrain its own content width, while its page frame retains the same gutters as other pages. `SurfaceSection variant="panel"` provides the shared 16px panel inset through `--panel-inset`.

Page headers sit directly on the canvas without a background, border, or shadow. Keep descriptions and metadata only when they help the task; retain functional actions on the right, wrapping below on mobile. The Studio editor keeps its compact workspace toolbar and structural divider, with the group name as 12px semibold inline text rather than a page heading.

Full-bleed canvases use `PageFrame edgeToEdge` with zero outer padding and gap. `PageContent` and `PageHeader`/`PageToolbar` with `inset` provide standard gutters for non-canvas content inside those pages. `viewport="fill"` bounds a workspace to the visible height; the default `viewport="minimum"` fills at least that height without clipping long content. Both use the actual 40px application header height. Grid column ratios, channel splits, and form/control spacing may vary according to content; they do not override page geometry.

Workbench pages prioritize the editor, canvas, channel workspace, and selection panels. Operations pages are table-first and use compact heading and summary rows. Documentation keeps a readable article measure while Settings uses clearly separated configuration sections.

Desktop keeps the persistent sidebar. Tablet layouts collapse or overlay secondary panels when necessary. Mobile uses the existing drawer behavior and allows headings/actions to wrap without overlap. Horizontal scrolling is local to genuinely wide data regions; the application shell must not create page-level horizontal scrolling.

Long names and descriptions truncate or line-clamp intentionally. Grid cards use flex columns so footers align at the bottom even when content lengths differ. Focus order follows DOM order at every breakpoint.

## Elevation & Depth

The default system is flat and structural. Borders, surface contrast, and spacing establish most hierarchy. Use a small soft shadow only for real elevation such as dialogs, popovers, floating controls, or a card responding to hover. Avoid combining heavy shadows with decorative borders.

### Shadow Vocabulary

- **Resting surface:** No shadow; use a structural border when separation is needed.
- **Hover lift:** A subtle `0 4px 12px rgba(15, 23, 42, 0.08)` shadow paired with a modest border-color change.
- **Overlay:** A stronger but soft shadow reserved for dialogs, popovers, and floating panels.

**The Flat-by-Default Rule.** A surface should earn elevation through interaction or overlay behavior; never add a shadow only to make a component look modern.

## Shapes

Use one restrained corner scale: 2px (`rounded-sm`) for badges, checkboxes, and menu items; 4px (`rounded-md`) for buttons, inputs, selects, and textareas; and 6px (`rounded-lg`) for cards, panels, graph nodes, and dialogs. The `--corner-compact`, `--corner-control`, and `--corner-surface` tokens in `src/index.css` own this scale. Avatars, status dots, connection handles, slider thumbs, and progress tracks retain their functional circular geometry. Borders are 1px and use the structural border token. Avoid making every element pill-shaped or using oversized rounded containers.

Cards and panels should have one clear boundary. Do not nest cards inside cards when spacing and a divider can establish the same relationship. Status chips and badges may use compact rounded corners when they communicate a real state.

## Components

### Buttons

- **Shape:** Consistent 4px corners with a minimum usable touch target.
- **Primary:** Simulation Builder Violet background, white text, semibold label, and compact horizontal padding.
- **Hover / Focus:** Slightly darker violet on hover; visible violet focus ring with no glow effect.
- **Secondary / Ghost:** Neutral text and surface treatment; hover changes contrast or background subtly.
- **Destructive:** Red is reserved for irreversible actions and should not dominate the default interface.

### Inputs / Fields

- **Style:** White surface, 1px structural border, 4px corners, readable body text, and compact vertical padding.
- **Focus:** Strong border or violet focus ring; focus must remain visible without relying on hover.
- **Error / Disabled:** Use explicit text and contrast changes; do not communicate errors by color alone.

### Cards / Containers

- **Corner Style:** 6px by default.
- **Background:** White surface on the cool canvas.
- **Shadow Strategy:** Flat at rest; subtle hover lift only when the card is interactive.
- **Border:** Structural border at rest, slightly stronger or accent-tinted on interaction.
- **Internal Padding:** 12–16px using the spacing rhythm.
- **Interactive list cards:** Keep the title bounded, description line-clamped, actions near the title, and metadata/status in a dedicated footer when alignment matters.

### Status Badges

Use compact 2px corners rather than pill shapes. Use a badge only when it conveys a meaningful state such as locked, warning, active, or ready. Keep the palette restrained: amber for usage/lock warnings, slate for neutral readiness, and violet for selected/active state.

### AI usage analytics

Pair the time trend with the Request activity calendar on the overview, with
one column on mobile. The calendar shows one month of daily SQL request counts,
independent of weekly/monthly trend aggregation. Use a primary-tinted intensity
scale with adaptive readable numbers, fill in-range inactive days with zero, and mark
days outside the selected range. Follow with activity type and node type comparisons
in two columns (one on mobile). Activity uses stacked horizontal bars for input/
output composition, node types use vertical columns for recorded totals, models
use a dot ranking, and simulations use a donut for token proportions. Keep direct
values and readable labels; palette and typography remain consistent. Stacked
series share semantic tokens derived from the selected theme's primary and
secondary colors, adjusted to at least 3:1 contrast against surface. Category
colors add neutral slate and amber. Chart surfaces and separators follow surface
and border tokens. Actions, links, and the primary total follow the selected brand;
text contrast adapts independently. Legend and tooltip text stay neutral,
separate from data colors.
CSS semantic tokens
own chart colors, including native charts and Recharts. Stacked
segments represent input/output counts, while recorded total is labeled separately
because it can differ from their sum. Show eight comparison categories initially
with an expand control. Donuts use at most five segments, grouping smaller
simulations as Other while retaining the complete breakdown in an expandable list.
Use 0% for zero-token usage. Preserve null node types as Unspecified. The trend uses
distinct line patterns, keyboard-accessible values, sparse date labels, and a
collapsible data table. Explain automatic weekly/monthly aggregation when the
requested daily range exceeds 90 days.

Participant totals and request history use the shared server DataTable with
independent loading, retry, search, sorting, and page-size controls. Changing table
pages must keep the summary and charts stable. Participant detail always shows
all recorded usage for the path participant, without overview filters, date
controls, or an interval selector. Its trend granularity is selected by the
backend over the full history. Request history keeps search/sort/pagination.
Place participant charts and Request history side by side, with 40% of the available
column space for charts and 60% for request history. Stack activity and node charts
in the left column; show the token trend above them only when more than one period
exists. A single-period total repeats the KPI summary and should not get its own
panel. Keep model and simulation breakdowns below the workspace. Align the columns
at the top and stack them below 1100px; wide tables scroll within their panel.
Keep the Request size scatter above the request history table, sharing the same
page data and following its search/sort. Label the visible request range and
total so the page sample's scope is clear. It must not fetch all events or reload
summary charts when the table page changes.

API responses match the data rendered by each view. Overview summary includes
participant count; detail summary includes input/output instead. Omit detail
trend and interval entirely for a single period. Breakdown payloads contain their
own identifiers and required metrics: activity input/output/count/total, node
count/total, simulation total, and model count/total. Only the detail model table
needs model input/output and costs. Keep provider/model/service identity distinct.
Request history only receives the displayed columns plus usageId for row identity.
Do not retain unused token categories, event metadata, composition adapters, or
client-side analytics aggregation; analytics belong to the backend. Keep the
shared pagination contract intact.

### Navigation

Navigation uses concise labels, consistent icon sizing, and a quiet active state. The persistent sidebar owns navigation grouping and its responsive drawer/collapse behavior. Content headers should not duplicate sidebar taxonomy; they should show only the local context needed to orient the user.

## Do's and Don'ts

### Do:

- **Do** use Plus Jakarta Sans Variable throughout the application UI.
- **Do** use the shared shadcn/ui primitives and Tailwind utilities before creating custom components or global CSS.
- **Do** use `{colors.primary}` for meaningful actions and active/focus states.
- **Do** use spacing, typography, alignment, and contrast to establish hierarchy.
- **Do** keep responsive overflow local to the region that needs it.
- **Do** preserve semantic headings, labels, focus rings, and usable touch targets.

### Don't:

- **Don't** reintroduce decorative gradients for new elements.
- **Don't** use large decorative gradients, glassmorphism, glow, or heavy shadowed cards.
- **Don't** turn every element into a pill, card, badge, or nested surface.
- **Don't** introduce a different color for each navigation item or feature.
- **Don't** put business rules, node definitions, ports, or API contracts in the visual layer.
- **Don't** create page-level horizontal scrolling to solve a local layout problem.
