# GOOGLE STITCH 19-SCREEN MANDATORY CODE CONVERSION REGISTRY & ARCHITECTURE

## ⚠️ ABSOLUTE DIRECTIVE FOR ALL DEVELOPERS & AI AGENTS

**DO NOT GUESS OR INVENT ANY UI PAGE LAYOUTS, TEXT, OR STYLING.**
For EVERY page implemented or refactored, the 3-step Google Stitch HTML Conversion Workflow is enforced:

1. **Step 1 (Locate Screen Folder):** Find the screen folder in `docs/stitch_shine_app_design/<screen_folder_name>`.
2. **Step 2 (Read Local HTML/Design):** Open and read the `code.html` template or `screen.png` image directly from that folder.
3. **Step 3 (Refactor Vue Page):** Translate downloaded HTML 100% into Vue 3 + **Element Plus (`element-plus`)** components.

---

## 1. Component Shell & Modal Architecture (User Design Mandate)

- **New Series Wizard (`SeriesWizardModal.vue`)**:
  - Encapsulates Step 1 (Core DNA), Step 2 (Trend Hunt), Step 3 (Compliance) into a single 3-step wizard inside an `<el-dialog>`.
  - Launched from Dashboard (`/dashboard`) and My Projects (`/projects`) CTA buttons.

- **Unified Project Workspace (`ProjectWorkspacePage.vue`)**:
  - Single detail view at route `/projects/:id`.
  - Integrates 5 top tabs using `<el-tabs>`:
    1. **Overview**: `ProjectOverview.vue`
    2. **Episodes**: `ProjectEpisodes.vue`
    3. **Analysis & Retention**: `ProjectAnalysis.vue`
    4. **Distribution**: `DistributionPage.vue`
    5. **Revenue**: `ProjectRevenue.vue`

- **Episode Studio Workspace (`StudioWorkspaceModal.vue`)**:
  - Fullscreen `<el-dialog>` workspace with a left sidebar `<el-tabs>` to switch between production surfaces:
    1. `script`: `ScriptStudio.vue` (Script & Scene Assembly)
    2. `editor`: `EditPage.vue` (9:16 Timeline Video Editor)
    3. `voice`: `VoiceDubbingPage.vue` (Neural Voice & Affect Steering)
    4. `captions`: `CaptionsPage.vue` (Subtitles Studio & Caption Designer)
    5. `export`: `PublishPage.vue` (Smart Cover Generator & Export Config)

- **Modals**:
  - **`MasterScriptModal.vue`**: Master Plan Script breakdown dialog triggered from Episode actions or Project header.
  - **`CharacterPersonaModal.vue`**: Persona Studio & Facial Consistency Anchors dialog triggered when selecting character avatars.

- **Synchronized Auth Suite (`AuthLayout.vue`)**:
  - Standardized Light Mint Brand Hero panel matching Stitch Signup design (Image 2) across `Signup`, `Login`, `ForgotPassword`, and `ResetPassword`.

---

## 2. Complete 19-Screen Mapping Table

| # | Target Vue File Path | Route / Component Container | Stitch Screen Title | Stitch Screen ID (`projects/11466822328114768539/screens/...`) |
| :- | :--- | :--- | :--- | :--- |
| 1 | `src/pages/Home.vue` | `/` | `Shine - AI Micro-Drama Studio Landing Page` | `175840307a274a24b5bcfa395116e4d0` |
| 2 | `src/pages/auth/Login.vue` | `/auth/login` | `Login - Shine AI Studio` | `53e4d5f590634e1b87d5e267b6d67bbe` |
| 3 | `src/pages/auth/Signup.vue` | `/auth/signup` | `Signup - Shine AI Studio` | `c906b8d12b3d4d73a929067dcc0df309` |
| 4 | `src/pages/dashboard/index.vue` | `/dashboard` | `Project Hub Dashboard - Light Mode` | `12881573168441930751` |
| 5 | `src/pages/projects/ProjectOverview.vue` | Tab 1 in `ProjectWorkspacePage` | `Shine Project Overview - Light Mode` | `13620879570122709638` |
| 6 | `src/pages/projects/ProjectEpisodes.vue` | Tab 2 in `ProjectWorkspacePage` | `Shine Project Episodes - Aligned Light Mode` | `8104298670513728376` |
| 7 | `src/pages/projects/ProjectAnalysis.vue` | Tab 3 in `ProjectWorkspacePage` | `Shine Project Analysis - Aligned Light Mode` | `17195845267597029307` |
| 8 | `src/views/workspace/DistributionPage.vue` | Tab 4 in `ProjectWorkspacePage` | `Distribution - The Neon Betrayal` | `75dfd782f6f040d497a8e470ffa34f59` |
| 9 | `src/pages/projects/ProjectRevenue.vue` | Tab 5 in `ProjectWorkspacePage` | `Shine Project Revenue Dashboard - Aligned Light Mode` | `16184137747845329538` |
| 10 | `src/views/analytics/AnalyticsPage.vue` | `/analytics` | `Shine AI Analytics - Light Mode` | `12953174379253973739` |
| 11 | `src/views/team/TeamSharedPage.vue` | `/team` | `Shine Team Shared Workspace` | `95d9a1c795a444bc94638feefb505576` |
| 12 | `src/components/wizard/SeriesWizardModal.vue` | Modal (Step 1) | `Shine New Series Wizard: Core DNA (Step 1)` | `11140778263560975410` |
| 13 | `src/components/wizard/SeriesWizardModal.vue` | Modal (Step 2) | `Shine Wizard: Trend Hunt (Step 2)` | `17533407975003517667` |
| 14 | `src/components/wizard/SeriesWizardModal.vue` | Modal (Step 3) | `Shine Wizard: Compliance (Step 3)` | `16081193168861025981` |
| 15 | `src/pages/script/ScriptStudio.vue` | Tab 1 in `StudioWorkspaceModal` | `Script & Assembly - Shadows in the Code` | `9c1b87572ad3455b9c4c21922c815eba` |
| 16 | `src/views/workspace/EditPage.vue` | Tab 2 in `StudioWorkspaceModal` | `Episode Editor - Shadows in the Code` | `051bfc4eb3984724932723e6c1d70b73` |
| 17 | `src/views/workspace/VoiceDubbingPage.vue` | Tab 3 in `StudioWorkspaceModal` | `Voice & Music - Shadows in the Code` | `25df126fad9b4e709ae3037c88d44744` |
| 18 | `src/views/workspace/CaptionsPage.vue` | Tab 4 in `StudioWorkspaceModal` | `Caption Management - Shadows in the Code` | `b3a499baa5ff44d686ca59ab589b61d8` |
| 19 | `src/views/workspace/PublishPage.vue` | Tab 5 in `StudioWorkspaceModal` | `Export & Publish - Shadows in the Code` | `169c2eb110124f1c91ffbe9ceeb372ad` |
