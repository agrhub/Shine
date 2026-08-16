---
name: Shine Intelligence
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#3d4a41'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#6c7a70'
  outline-variant: '#bbcabe'
  surface-tint: '#006c45'
  primary: '#006c45'
  on-primary: '#ffffff'
  primary-container: '#3ecf8e'
  on-primary-container: '#005434'
  inverse-primary: '#51df9c'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#5f5e5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#b9b7b7'
  on-tertiary-container: '#484848'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#71fcb6'
  primary-fixed-dim: '#51df9c'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#005233'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-md:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '450'
    lineHeight: 20px
  label-xs:
    fontFamily: Outfit
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1440px
---

## Brand & Style
The design system for this product is a sophisticated blend of **Enterprise Minimalism** and **Technical Brutalism**. It is designed to evoke the precision of a professional developer environment while maintaining the premium allure of a high-end creative studio. 

The aesthetic is characterized by:
- **Luminous Clarity:** A clean light-mode interface that focuses the user's attention on video content and high-density data through high readability.
- **Precision Engineering:** Subtle borders and monospaced-style layouts that signal AI-driven accuracy.
- **Glassmorphism:** Functional transparency used for overlays and navigation to maintain visual context without clutter.
- **High-Performance Aura:** A visual language that feels fast, responsive, and robust, catering to professional creators who require an "Enterprise-grade" workflow.

## Colors
The palette is rooted in a "Canvas" philosophy, using clean whites and light grays to create an open workspace for micro-drama production.

- **Primary (Supabase Green):** Reserved for high-priority actions, success states, and indicating active AI processes. It should be used sparingly to maintain its impact.
- **Surface Architecture:** We use a bright neutral as the base canvas. Components sit on slightly varied surface containers to define hierarchy.
- **Functional Grays:** Text and iconography utilize a scale of grays to establish hierarchy, with deep charcoals reserved for primary headings and mid-tones for supporting metadata.

## Typography
The typography strategy creates a unified, modern experience by utilizing a single geometric sans-serif.

- **Headlines (Outfit):** Clean, modern, and geometric. Used for page titles and high-level marketing copy to give a premium, open feel.
- **UI & Body (Outfit):** The workhorse of the interface. Selected for its exceptional legibility and friendly but professional tone in high-density data views and property panels.
- **Technical Accents (Outfit):** Used for metadata, AI prompts, and timestamps. By using the same typeface at smaller scales and specific weights, we maintain a systematic, "under-the-hood" feel without introducing font discord.

## Layout & Spacing
The design system employs a strict **8px grid system** to ensure mathematical consistency. 

- **Layout Philosophy:** A fixed-sidebar, fluid-content model. The left sidebar (navigation) and right sidebar (properties/inspector) remain fixed, while the central workspace (video stage) scales to fill the viewport.
- **Density:** High-density by default. Margins between interactive elements are kept tight (8px-12px) to allow for professional editing workflows where many controls must be visible simultaneously.
- **Breakpoints:**
  - **Mobile (<768px):** Single column. Sidebars collapse into a bottom sheet or hamburger menu.
  - **Tablet (768px - 1280px):** Single sidebar (navigation) remains visible; inspector is hidden behind an icon.
  - **Desktop (>1280px):** Three-pane layout for maximum productivity.

## Elevation & Depth
In a light interface, we use **Tonal Layering** and **Subtle Outlines** to define hierarchy.

- **Z-Index 0 (Canvas):** Primary background base.
- **Z-Index 1 (Panels):** Elevated surface containers with 1px solid borders.
- **Z-Index 2 (Popovers/Modals):** Glassmorphism effect. Background: semi-transparent white with a `backdrop-filter: blur(12px)`.
- **Active State:** Elements do not "lift" with heavy shadows; instead, they are outlined with the Primary Green or a higher-contrast neutral.

## Shapes
The shape language is "Modern-Organic." We utilize high roundedness to create a friendly, premium interface that feels approachable.

- **Components:** Primary buttons and input fields use a 1rem (Pill-shaped) radius.
- **Containers:** Large cards and workspace panels use a 2rem radius.
- **Video Thumbnails:** 1.5rem radius to distinguish content from the UI while maintaining the system's organic curve.
- **Interactive Indicators:** Radio buttons and checkboxes use rounded forms to remain consistent with the broader aesthetic.

## Components
- **Buttons:** 
  - *Primary:* Solid `#3ECF8E` with high-contrast text. Pill-shaped (1rem radius).
  - *Secondary:* Ghost style with 1px border and high-contrast text.
- **Input Fields:** Light backgrounds with 1rem roundedness and subtle 1px borders. Focus state should trigger a 1px `#3ECF8E` border glow. Labels use `label-xs` Outfit.
- **Cards:** Subtle borders. Use a 1px border with 2rem roundedness. For "featured" drama cards, use very soft elevation or tonal shifts.
- **Chips/Status Tags:** Fully rounded pill containers. Use `rgba(62, 207, 142, 0.1)` background for "Active" states.
- **Timeline/Player:** The central component. Use a high-contrast playhead in Supabase Green. Keyframes should be small 6px circles, matching the organic shape language.
- **The "AI Prompt" Bar:** A prominent, glassmorphic input area at the bottom of the stage with maximum roundedness, utilizing a glowing green border to indicate the system is ready for user input.