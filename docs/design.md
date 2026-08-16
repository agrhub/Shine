# Design System Reference Specification: Shine

This document defines the official design system, typography, color palette, UI component library guidelines, and visual standards for the **Shine** web application. All frontend pages and features built inside [`apps/shine/client`](../client) MUST strictly use **Element Plus (`element-plus`)** components with `@element-plus/icons-vue`. The authoritative design source for all screen layouts is **Google Stitch local design assets in `docs/stitch_shine_app_design/`** using the local design files in `docs/stitch_shine_app_design/`.

---

## 1. Element Plus Component Library & Google Stitch MCP Reference

- **Primary UI Component Framework:** **Element Plus (`element-plus`)** (Import path: `element-plus`, icons: `@element-plus/icons-vue`).
- **UI DESIGN GROUND TRUTH SOURCE:** **Google Stitch local design assets in `docs/stitch_shine_app_design/`** (`https://stitch.withgoogle.com/projects/11466822328114768539`). Developers and AI Agents MUST use local design files in `docs/stitch_shine_app_design/` to retrieve exact screen layouts, HTML structures, and screenshot previews.
- **MANDATORY UI IMPLEMENTATION RULE:** All views MUST use native Element Plus (`element-plus`) components (`<el-button>`, `<el-card>`, `<el-table>`, `<el-tabs>`, `<el-dialog>`, `<el-drawer>`, `<el-select>`, `<el-input>`, `<el-tag>`, `<el-menu>`, `<el-steps>`, etc.) and `@element-plus/icons-vue` when building or modifying any page or interactive view.

### 1.1 UI Ground Truth Design Mockup Catalog (`apps/shine/docs/stitch_shine_app_design/`)

- **ABSOLUTE UI GROUND TRUTH MANDATE:** The official visual design, layout structure, panel arrangements, color scheme, and component positions for ALL application pages are strictly defined by the local design folders inside [`D:\Workspace\Gits\CamHub\openvideo\apps\shine\docs\UI`](stitch_shine_app_design).
- **MANDATORY DESIGN VIEWING PROTOCOL:** Developers and AI Agents MUST use `view_file` to open and inspect the corresponding PNG mockup file in `apps/shine/docs/stitch_shine_app_design/` before implementing or modifying any view/page component. Agents are STRICTLY PROHIBITED from inventing custom layouts or arbitrary UI placements that deviate from `apps/shine/docs/stitch_shine_app_design/*.png`.

| Route Path | Target View Component | UI Ground Truth Design File (`apps/shine/docs/stitch_shine_app_design/`) | Key Panel Layout & Components |
| :--- | :--- | :--- | :--- |
| `/dashboard` | `src/views/dashboard/index.vue` | [`dashboard.png`](../docs/stitch_shine_app_design/project_hub_dashboard_light_mode/screen.png) | Top KPI metric cards, series grid with genre tags, left navigation menu |
| `/series/create` | `src/views/series/create.vue` | [`drama-project-creating.png`](../docs/stitch_shine_app_design/shine_new_series_wizard_core_dna_step_1/screen.png) | 3-step genre selection wizard, lighting & AI engine selector |
| `/script/*` | `src/views/script/index.vue` | [`workspace-scripts.png`](../docs/stitch_shine_app_design/script_assembly_shadows_in_the_code/screen.png) | Left: Character bible & tone; Center: Script editor; Right: Scene storyboard grid |
| `/editor/*` | `src/views/editor/index.vue` | [`workspace-editor.png`](../docs/stitch_shine_app_design/episode_editor_shadows_in_the_code/screen.png) | Left: Media Assets; Center: 9:16 vertical canvas & timeline; Right: Inspector & production balance |
| `/captions/*` | `src/views/captions/index.vue` | [`workspace-captions.png`](../docs/stitch_shine_app_design/caption_management_shadows_in_the_code/screen.png) | Left: 9:16 caption preview; Center: Cue timeline; Right: Transcription & style presets |
| `/export/*` | `src/views/export/index.vue` | [`workspace-episode-export.png`](../docs/stitch_shine_app_design/export_publish_shadows_in_the_code/screen.png) | Left: Cover generator & preview; Right: Social platform targets & viral caption |
| `/dubbing/*` | `src/views/dubbing/index.vue` | [`workspace-voice-dubbing.png`](../docs/stitch_shine_app_design/voice_music_shadows_in_the_code/screen.png) | Left: Voice profiles; Center: Emotional curve; Right: Neural engine performance controls |
| `/persona/*` | `src/views/persona/index.vue` | [`workspace-characters-2.png`](../docs/stitch_shine_app_design/character_profile_modal_mara_vance/screen.png) | Left: Character list; Center: Facial anchors & outfit continuity; Right: Generation mode |
| `/analytics/*` | `src/views/analytics/index.vue` | [`analytics.png`](../docs/stitch_shine_app_design/shine_ai_analytics_light_mode/screen.png) & [`workspace-episode-analytic.png`](../docs/stitch_shine_app_design/shine_project_analysis_aligned_light_mode/screen.png) | KPI stats, retention curve line chart, platform revenue donut chart, top episodes table |
| `/audio/*` | `src/views/audio/index.vue` | [`audio-mixing.png`](../docs/stitch_shine_app_design/voice_music_shadows_in_the_code/screen.png) | Left: Master VU meters & auto-ducking; Center: Multi-track audio timeline; Right: Parametric EQ |
| `/environment/*` | `src/views/environment/index.vue` | [`workspace-eposode-scene-environment.png`](../docs/stitch_shine_app_design/episode_editor_shadows_in_the_code/screen.png) | Top: Prompt bar; Left: Mood presets; Center: 9:16 background preview; Right: Camera & lighting engine |
| `/reviews/*` | `src/views/reviews/index.vue` | [`workspace-reviews.png`](../docs/stitch_shine_app_design/episode_editor_shadows_in_the_code/screen.png) | Center: Frame-accurate video preview with pin markers; Right: Real-time feedback panel |
| `/library/*` | `src/views/library/index.vue` | [`asset-library.png`](../docs/stitch_shine_app_design/shine_team_shared_workspace/screen.png) & [`workspace-library.png`](../docs/stitch_shine_app_design/shine_team_shared_workspace/screen.png) | Left: Collections & LoRA trainer; Center: Character LoRA card grid |


### 1.2 Application Layout Shells (`src/layouts/`)

The application defines 5 core layout shells to encapsulate structural UI patterns:

1. **`DefaultLayout.vue`**: Simple layout for static and legal pages (`/terms`, `/privacy`, `/contact`, `/manual`). Features clean footer, `<router-view />`, no sidebar.
2. **`HomeLayout.vue`**: Dedicated marketing landing layout for `/`. Features marketing header with Logo, nav links (Features, Pricing, Use Cases, Blog), LanguageSelect, Sign In button, Get Started button, clean footer, `<router-view />`, no sidebar.
3. **`AuthLayout.vue`**: Authentication layout (`/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`). Features left column Image/Video/Brand hero illustration (Shine branding) + right column centered card with `<router-view />`.
4. **`AppLayout.vue`**: Main workspace management layout (`/dashboard`, `/projects`, `/team`, `/assets`, `/analytics`). Features `.g-sub-sidebar` collapsible menu (Series Dashboard, My Projects, Team Shared, Assets Library, Analytics; top logo icon menu and bottom user profile menu with Profile, Settings, LanguageSelect, Dark/Light toggle, logout and collapse toggle button at the bottom) + `.g-main-area` content space.
5. **`StudioLayout.vue`**: Dedicated video production studio layout (`/wizard`, `/script/*`, `/editor/*`, `/persona/*`, `/dubbing/*`, `/captions/*`, `/audio/*`, `/environment/*`, `/reviews/*`, `/export/*` / `/publish/*`). Features `.g-header` logo with back to dashboard/my project/team shared button and tabs (Script, Editor, Characters, Library, Voice & Dubbing, Captions, Analytics, Export & Publish) + `.g-main-area` content space.

---

## 2. Color Palette & Theme Tokens (OKLCH Color Space)

The application enforces a dark-first aesthetic tailored for cinematic video editing, with smooth transition support for light mode. All color variables are defined in OKLCH color space for maximum color consistency across high-DPI displays.

### 2.2 STRICT PROHIBITION OF GRADIENTS & AD-HOC CUSTOM STYLES ("NO GRADIENTS / NO NEON GLOWS")

> [!CAUTION]
> **STRICT PROHIBITION OF PURPLE NEON & GRADIENT STYLES:**
> - Agents MUST NOT add purple linear gradients (`background: linear-gradient(...)`, `bg-gradient-to-r`, `purple-600`, `violet-500`), neon box-shadow glows, or bright purple borders around cards/buttons.
> - Look at the 15 PNG mockups in [`apps/shine/docs/stitch_shine_app_design/`](stitch_shine_app_design): The interface is clean, professional, dark-slate gray (`#121218`), with subtle border outlines (`#2d2e3a`).
> - Flashy gradients, neon glow borders, and ad-hoc custom styles are STRICTLY FORBIDDEN.

1. **MANDATORY SLATE COLOR TOKENS & NATIVE COMPONENTS:**
   - Page backgrounds MUST strictly use standard OKLCH dark slate `--background` (`#121218`).
   - Card surfaces MUST strictly use standard OKLCH card background `--card` (`#1a1b23`).
   - Borders MUST strictly use subtle dark slate `--border` (`#2d2e3a`).
   - Active selection states MUST use clean highlight or subtle accent tokens matching `apps/shine/docs/stitch_shine_app_design/*.png`.
2. **MANDATORY USE OF ELEMENT PLUS COMPONENTS:**
   - ALL cards, forms, buttons, inputs, tabs, and modals MUST use native Element Plus (`element-plus`) components.
   - Custom inline CSS style overrides or ad-hoc custom HTML element creation are strictly prohibited.
| `--primary-foreground` | `oklch(0.205 0 0)` | Text inside primary CTA buttons |
| `--secondary` | `oklch(0.269 0 0)` | Subtle action buttons, tag badges, secondary pills |
| `--muted` | `oklch(0.269 0 0)` | Inactive tab backgrounds, disabled button states |
| `--muted-foreground` | `oklch(0.708 0 0)` | Muted secondary text, metadata timestamps, subtitle cues |
| `--accent` | `oklch(0.269 0 0)` | Hover state overlays, highlighted timeline clips |
| `--accent-foreground` | `oklch(0.985 0 0)` | Text inside highlighted element |
| `--destructive` | `oklch(0.704 0.191 22.216)` | Danger actions, delete clip, cancel job alerts (`#f87171`) |
| `--border` | `oklch(0.252 0 0)` | Subtle divider lines, timeline track borders (`#2d2e3a`) |
| `--input` | `oklch(0.341 0 0)` | Form input background & search bar border |
| `--ring` | `oklch(0.556 0 0)` | Focus ring outline for keyboard accessibility |

---

## 3. Typography & Text Hierarchy

| Level | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | `32px` (2rem) | 800 (Extrabold) | 1.2 | Landing hero, major module headers |
| **Section Heading** | `24px` (1.5rem) | 700 (Bold) | 1.3 | Card titles, modal headers |
| **Subheading** | `18px` (1.125rem) | 600 (Semibold) | 1.4 | Form section headers, timeline track labels |
| **Body Text** | `14px` (0.875rem) | 400 (Regular) | 1.5 | Primary UI text, table cell values, descriptions |
| **Caption & Meta** | `12px` (0.75rem) | 500 (Medium) | 1.4 | Badges, timecodes, muted metadata |

---

## 4. Multi-Language (i18n) UI Guidelines & Key Naming Convention

All user-facing UI text MUST be bound to `vue-i18n` translation keys (`$t('...')` / `useI18n()`). Zero hardcoded text strings are allowed in templates.

1. **Locale Dictionaries (`src/locales/`):** Maintain complete key-value pairs in 6 locale files: `en.json`, `vi.json`, `zh.json`, `jp.json`, `es.json`, `fr.json`.
2. **Translation Key Hierarchy:**
   - `nav.*`: Navigation items (`nav.dashboard`, `nav.manual`, `nav.login`).
   - `dashboard.*`: Dashboard stats, series creation modal, table headers.
   - `auth.*`: Login, signup, password reset form labels and buttons.
   - `common.*`: Standard button labels (`common.confirm`, `common.cancel`, `common.save`).

### 4.1 Component Rules

1. **Buttons (`<el-button>`):**
   - Must use `cursor: pointer` explicitly on non-disabled states.
   - Action icons must use Lucide Icons (`@lucide/vue`) or Iconify (`@iconify/vue`).
2. **Form Controls (`<el-input>`, `<el-select>`, `<el-switch>`):**
   - Dark background (`oklch(var(--input))`), subtle border (`oklch(var(--border))`), 4px border radius (`var(--radius)`).
   - Clear focus state outline using `--ring` token.
3. **Cards & Modals (`<el-card>`, `<el-dialog>`):**
   - Dark card background (`oklch(var(--card))`), glassmorphic backdrop-filter overlay for popovers.
4. **9:16 Vertical Video Preview Canvas:**
   - Aspect ratio strictly locked to 9:16 (vertical portrait mode: `2160x3840` rendering space).
   - Canvas container padded with dark velvet violet surround and smooth WebGL preview controls.
5. **Timeline Track Layout:**
   - Multi-track stacked NLE layout: `VIDEO 1` (scene clips), `AUDIO 1` (voiceovers & ambience), `SUBS` (kinetic captions).
   - Timecode ruler on top with millisecond tick marks (`00:00.00`).

---

## 5. Micro-Animations & Interactivity

- **Transitions:** Smooth 150ms–200ms ease-in-out transitions on hover, tab switching, and button clicks (`transition-all duration-200 ease-in-out`).
- **Loading States:** Shimmer pulse animation (`animate-pulse` / `vite-plugin-app-loading`) during AI generation jobs (Vertex AI / Flow Pool).
- **Toast Notifications:** Standardized toast alerts powered by `vue-sonner`.

---

## 6. Verification Checklist for Developers & AI Agents

Before submitting code or ending a Sprint turn, verify:
- [ ] `main.ts` in `apps/shine/client` imports design tokens and CSS bundle from `vue-element-plus`.
- [ ] No raw unstyled HTML elements appear on screen (Background is dark, font is Inter/Outfit, buttons have rounded corners and hover states).
- [ ] All user-facing text strings are bound to `$t('...')` / `useI18n()` translation keys across 6 locale dictionaries (`en`, `vi`, `zh`, `jp`, `es`, `fr`). Zero hardcoded English strings!
- [ ] Playwright E2E computed style and language switching assertions pass cleanly.

---

## 7. Multi-Language (i18n) UI Guidelines & Key Naming Convention

To guarantee seamless global usability across 6 languages (`en`, `vi`, `zh`, `jp`, `es`, `fr`), all Vue templates MUST follow these localization rules:
### 7.1 Translation Key Naming Convention
All keys in `src/locales/*.json` MUST follow dot-notation structured by domain:
- **Common Actions & Labels:** `common.ok`, `common.cancel`, `common.save`, `common.delete`, `common.loading`, `common.search`, `common.language`
- **Navigation & Shell:** `nav.home`, `nav.dashboard`, `nav.editor`, `nav.persona`, `nav.analytics`, `nav.settings`
- **Marketing Landing Page:** `home.heroTitle`, `home.heroSubtitle`, `home.getStartedBtn`, `home.featuresHeading`
- **Authentication Pages:** `auth.loginTitle`, `auth.emailLabel`, `auth.passwordLabel`, `auth.loginBtn`, `auth.signupPrompt`
- **Dashboard & Series Workspace:** `dashboard.title`, `dashboard.newSeriesBtn`, `dashboard.totalSeries`, `dashboard.recentProjects`
- **AI Director & Script Studio:** `script.title`, `script.genreLabel`, `script.generateScriptBtn`, `script.sceneHookBtn`
- **OpenVideo Timeline Editor:** `editor.timelineTitle`, `editor.videoTrack`, `editor.audioTrack`, `editor.subsTrack`, `editor.previewBtn`

### 7.2 Vue Component Template Pattern

```vue
<!-- CORRECT: Bound via vue-i18n $t() -->
<template>
  <div class="header">
    <h1>{{ $t('dashboard.title') }}</h1>
    <FaButton type="primary" @click="createSeries">
      <FaIcon><Plus /></FaIcon>
      <span>{{ $t('dashboard.newSeriesBtn') }}</span>
    </FaButton>
    <FaSelect v-model="$i18n.locale" class="w-32">
      <FaOption label="English" value="en" />
      <FaOption label="Tiếng Việt" value="vi" />
      <FaOption label="中文" value="zh" />
      <FaOption label="日本語" value="jp" />
      <FaOption label="Español" value="es" />
      <FaOption label="Français" value="fr" />
    </FaSelect>
  </div>
</template>
<!-- INCORRECT (FORBIDDEN): Hardcoded string -->
<template>
  <div>
    <h1>Dashboard Overview</h1>
    <FaButton>+ New Series</FaButton>
  </div>
</template>
```

### 7.3 JavaScript/TypeScript Logic Pattern (Toasts, Pinia Stores, Composables & Axios Interceptors)

All notification toast messages, confirm dialogs, form validation errors, and Pinia store notifications inside `.ts` / `.js` script files MUST use `i18n.global.t('...')` or `useI18n().t('...')`.

```typescript
// CORRECT: Internationalized Toast in Pinia Store / Component Logic
import { i18n } from '@/locales';
import { toast } from 'vue-sonner';

// In store action or composable handler:
toast.success(i18n.global.t('toast.seriesCreatedSuccess'));
toast.error(i18n.global.t('toast.failedToLoadData'));

// INCORRECT (FORBIDDEN): Hardcoded English string in TS logic
toast.success("Series created successfully");
toast.error("Failed to load data");
```