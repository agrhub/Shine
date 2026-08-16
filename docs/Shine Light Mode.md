---
name: Shine Light Mode Design System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3d4a41'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6c7a70'
  outline-variant: '#bbcabe'
  surface-tint: '#006c45'
  primary: '#006c45'
  on-primary: '#ffffff'
  primary-container: '#3ecf8e'
  on-primary-container: '#005434'
  inverse-primary: '#51df9c'
  secondary: '#585f64'
  on-secondary: '#ffffff'
  secondary-container: '#dce3e9'
  on-secondary-container: '#5e656a'
  tertiary: '#575f65'
  on-tertiary: '#ffffff'
  tertiary-container: '#b1b9c0'
  on-tertiary-container: '#424a4f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#71fcb6'
  primary-fixed-dim: '#51df9c'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#005233'
  secondary-fixed: '#dce3e9'
  secondary-fixed-dim: '#c0c7cd'
  on-secondary-fixed: '#161d21'
  on-secondary-fixed-variant: '#41484c'
  tertiary-fixed: '#dce3ea'
  tertiary-fixed-dim: '#c0c7ce'
  on-tertiary-fixed: '#151d21'
  on-tertiary-fixed-variant: '#40484d'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1200px
  sidebar-width: 280px
  gutter: 24px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is engineered for high-productivity AI workflows, balancing professional utility with a modern, "AI-native" aesthetic. The brand personality is efficient, precise, and encouraging. It targets creative professionals and technical users who require a focused workspace that minimizes cognitive load while providing high-quality visual feedback.

The style is a hybrid of **Corporate Modern** and **Minimalism**, characterized by:
- **High-Utility Whitespace:** Generous breathing room between functional groups to maintain clarity during complex multi-step processes.
- **Subtle Precision:** Light borders and soft tints replace heavy shadows to define structure without adding visual noise.
- **Contextual Intelligence:** Using color and typography to indicate active AI logic and system states.

## Colors

The palette is anchored by a vibrant Mint Green, used strategically to signal "action," "active state," or "AI-generated success." 

- **Primary (#3ECF8E):** Reserved for primary call-to-actions, selected card borders, and active progress indicators.
- **Backgrounds:** The primary workspace uses a pure white (#FFFFFF) to maximize contrast for text. Secondary containers, sidebars, and inactive UI elements utilize a soft light grey (#F8F9FA) to create subtle depth.
- **Neutral/Text:** High-contrast charcoal (#11181C) is used for headings to ensure maximum legibility, while a mid-tone grey (#687076) handles secondary body text and metadata.

## Typography

This design system utilizes **Inter** exclusively to achieve a clean, systematic feel. The hierarchy is established through significant weight shifts and tight letter-spacing on larger headings to create a "locked-in" professional look.

- **Headlines:** Use Bold (700) or SemiBold (600) weights with slight negative letter-spacing to provide a modern, authoritative tone.
- **Body:** Standard body text is set at 16px for optimal readability. Secondary information and descriptions use 14px in a lighter grey tone.
- **Labels:** Small labels (e.g., "Step 1", "AI Tip") use uppercase styling with increased letter spacing to distinguish them from interactive content.

## Layout & Spacing

The layout follows a **Fixed Grid** approach for the main content area to maintain a focused reading width, paired with a persistent sidebar for navigation and context.

- **Desktop:** A 12-column grid with a 24px gutter. The sidebar is fixed at 280px, while the main content is centered with a max-width of 1200px.
- **Tablet:** The sidebar collapses into a drawer or top-bar; margins reduce to 24px.
- **Mobile:** Single column layout with 16px safe-area margins.
- **Vertical Rhythm:** Spacing follows an 8px base unit. Use 32px to separate major sections and 16px for internal card padding.

## Elevation & Depth

This design system avoids heavy drop shadows in favor of **Tonal Layers** and **Subtle Outlines**.

- **Level 0 (Base):** Pure white or light grey (#F8F9FA) depending on the container role.
- **Level 1 (Cards):** Defined by a 1px solid border (#E6E8EB). No shadow is used for inactive states.
- **Level 2 (Active/Hover):** When a card is selected, the border color transitions to the Primary Mint Green (#3ECF8E).
- **Floating Elements:** Primary buttons and "Next Step" controls use a very soft, high-diffusion shadow (Opacity 10%, Blur 12px) to signify they sit above the content layer.

## Shapes

The shape language is modern and approachable without appearing "juvenile." 

- **Standard Radius:** 0.5rem (8px) for buttons and input fields.
- **Container Radius:** 1rem (16px) for cards and main workspace modules (e.g., the AI Tip box).
- **Progress/Chips:** 2rem (32px) or full pill-shape for progress indicators and visual style presets to differentiate them from actionable cards.

## Components

### Buttons
- **Primary:** Dark charcoal background with white text for high-impact actions (e.g., "Next Step"). These often feature a trailing icon.
- **Secondary/Ghost:** Mint Green border with Mint Green text for secondary navigation.
- **Tertiary:** Pure text-based links for actions like "Save Draft."

### Cards (Selection)
- Interactive cards feature a top-aligned icon (often with a soft color background), a bold title, and a multi-line description.
- Selection is indicated by a Primary Green border and a "Selected" badge at the bottom.

### Inputs & Fields
- Use a 1px border (#E6E8EB) and 8px roundedness. Active fields should use a 1px Primary Green stroke.

### AI Tips
- Stylized as call-out boxes with a light grey background and a small icon. These use specific typography (e.g., italicized body or small labels) to denote they are system-generated suggestions.

### Visual Style Presets (Chips)
- Pill-shaped elements used for quick filtering or selection. Unselected states should have a subtle border; selected states should have a solid Primary Green border.