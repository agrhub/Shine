---
name: Shine Dark Mode Design System
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#38393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#bbcabe'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#869489'
  outline-variant: '#3d4a41'
  surface-tint: '#51df9c'
  primary: '#60eca8'
  on-primary: '#003822'
  primary-container: '#3ecf8e'
  on-primary-container: '#005434'
  inverse-primary: '#006c45'
  secondary: '#c8c6c5'
  on-secondary: '#303030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#d5d2d2'
  on-tertiary: '#313030'
  tertiary-container: '#b9b7b7'
  on-tertiary-container: '#494848'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#71fcb6'
  primary-fixed-dim: '#51df9c'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#005233'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
---

## Brand & Style

This design system is built for a high-end AI video editing platform, prioritizing utility, precision, and a developer-centric aesthetic. It leverages a high-contrast, minimalist approach to ensure that the complex interface of a video editor remains legible and focused.

The brand personality is **technical, sophisticated, and efficient**. It avoids the "softness" of consumer apps in favor of a robust, tool-like feel. The visual language is inspired by technical dashboards—utilizing solid blocks of color, crisp dividers, and a complete absence of gradients to communicate stability and raw power.

The style is **Modern Corporate/Minimalist**, characterized by:
- A rigid adherence to a monochrome base.
- High-contrast interactions.
- A "flat-plus" depth model where hierarchy is established through solid borders and tonal shifts rather than shadows or blurs.

## Colors

The palette is strictly controlled to maintain a professional, high-end aesthetic. 

- **Primary:** Supabase Green (#3ecf8e) is used exclusively for primary actions, success states, and key progress indicators. It provides the "shine" against the monochrome backdrop.
- **Dark Mode (Default):** Deep grays and blacks create a focused workspace. The background uses #171717, while elevated surfaces use #282828. Borders use a slightly lighter #303030 to define structure without adding bulk.
- **Light Mode:** Uses a stark white background (#ffffff) with subtle off-white surfaces (#f9f9f9).
- **Monochrome Accents:** We use a scale of grays from pure black to pure white for text and secondary UI elements. No colorful tints are allowed in the neutral scale.

## Typography

This design system uses **Inter** for all UI elements to ensure maximum legibility and a systematic feel. For developer-specific contexts or metadata (like timestamps in the editor), **JetBrains Mono** is introduced as a supporting technical typeface.

- **Headlines:** Use tighter letter-spacing and heavier weights to feel impactful and "engineered."
- **Body Text:** Standardized on a 16px base for desktop to accommodate density.
- **Labels:** Small labels use a semi-bold weight and occasional uppercase styling to differentiate from interactive body text.

## Layout & Spacing

The layout is built on a **4px base grid**, favoring a high-density, functional environment. 

- **Grid:** A 12-column fluid grid is used for dashboard views. In the Editor view, a "No Grid" contextual model is used, relying on fixed-width side panels (280px-320px) and a flexible central viewport.
- **Dividers:** Use 1px solid lines (#303030 in dark mode) to separate sections. We prefer dividers over whitespace to maintain a sense of structural rigidity.
- **Margins:** Desktop views maintain a 24px outer margin. Mobile views collapse this to 16px with a stacked vertical flow.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Low-Contrast Outlines**. We reject all traditional drop shadows.

- **Level 0 (Background):** Pure background color (#171717).
- **Level 1 (Surface):** Default container color (#282828). Used for cards and sidebar panels.
- **Level 2 (Popovers/Modals):** A slightly lighter gray (#333333) with a 1px solid border (#444444).
- **Borders:** All interactive elements must have a 1px solid border. This replaces depth, creating a "blueprint" aesthetic.

## Shapes

The shape language is sharp and precise. We use **Soft (0.25rem / 4px)** rounding as the standard for all UI elements like buttons, inputs, and cards. This provides a hint of modernity without sacrificing the professional, "square" feel of a production tool.

- **Standard Elements:** 4px radius.
- **Large Containers:** 8px radius (rounded-lg).
- **Status Indicators:** 2px radius or sharp.

## Components

### Buttons
- **Primary:** Solid #3ecf8e background, #171717 text. 4px radius. No shadow.
- **Secondary:** Transparent background, 1px solid border (#303030), white text.
- **Ghost:** No border or background unless hovered.

### Input Fields
- Dark gray background (#1c1c1c), 1px solid border (#303030).
- On focus: Border changes to #3ecf8e. No glow/outer shadow.

### Cards
- Background: #282828.
- Border: 1px solid #303030.
- Padding: 24px (md).

### Timeline/Editor Specifics
- **Playhead:** 2px solid #3ecf8e.
- **Clips:** Solid fills using a range of muted monochrome grays, with the active clip outlined in primary green.
- **Icons:** 20px or 24px stroke-based icons (1.5pt weight) for a clean, minimalist look.

### Lists
- Separated by 1px dividers.
- Hover state: Slight background lighten (#2f2f2f).