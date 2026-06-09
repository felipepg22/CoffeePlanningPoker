<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->
---
name: CoffePlanningPoker
description: Playful coffee-room planning poker for live team estimation.
---

# Design System: CoffePlanningPoker

## 1. Overview

**Creative North Star: "The Drenched Coffee Room"**

The physical scene: a late-afternoon coffee counter during sprint planning, warm light on the table, quick votes, one small joke, then back to the decision. The app should feel playful and occasionally comic, but the workflow stays in charge: room state, task selection, voting, reveal, discussion, and final estimate remain the visual priority.

This is a product UI with a drenched coffee atmosphere. The surface can carry the coffee identity more strongly than a restrained utility app, but high-contrast controls and readable panels must keep the live session fast. The system rejects casino poker cues, generic SaaS landing-page composition, and cartoon clutter that makes the tool feel unserious.

**Key Characteristics:**
- Warm, playful, collaborative product UI.
- Coffee-session atmosphere without gambling visuals.
- Dense enough for repeated team use.
- Comic moments used as feedback, not decoration.
- Keyboard-visible and readable under meeting pressure.

## 2. Colors: The Drenched Coffee Palette

The palette starts from a warm coral / burnt-orange seed and resolves into a deliberate coffee-room surface during implementation.

### Primary
- **Burnt Coffee Coral** ([to be resolved during implementation]): The primary brand anchor for room shell moments, primary actions, voting emphasis, and reveal energy. It should stay close to the generated warm coral / burnt-orange seed hue.

### Secondary
- **Espresso Ink** ([to be resolved during implementation]): The high-contrast text and control color. It must carry body text and labels clearly on drenched surfaces.

### Tertiary
- **Foam Highlight** ([to be resolved during implementation]): A light contrast role for selected cards, empty states, and small comic feedback moments. It should not become a cream-beige default background.

### Neutral
- **Counter Surface** ([to be resolved during implementation]): The main readable panel surface for tasks, participants, and controls.
- **Steam Line** ([to be resolved during implementation]): Borders, dividers, and inactive outlines.
- **Muted Roast** ([to be resolved during implementation]): Secondary text, timestamps, and helper labels. It must remain readable against its surface.

### Named Rules

**The Drenched, Not Beige Rule.** The coffee identity may live in the room shell and primary surfaces, but the implementation must not fall back to a pale cream AI-default page.

**The Action Rarity Rule.** The strongest saturated color is for voting, reveal, selection, and primary actions. If every panel shouts, the room state becomes harder to read.

## 3. Typography

**Display Font:** [single warm sans family to be chosen at implementation]
**Body Font:** [same warm sans family to be chosen at implementation]
**Label/Mono Font:** [optional, only if task metadata needs stronger scanning]

**Character:** Use one warm sans family with enough weight range to handle controls, task titles, participant names, and compact metadata. The type should feel friendly, not childish; precise, not sterile.

### Hierarchy
- **Display** ([weight and size to be resolved], [line-height to be resolved]): Room title, major empty states, and occasional onboarding moments only.
- **Headline** ([weight and size to be resolved], [line-height to be resolved]): Active task title and reveal-state messaging.
- **Title** ([weight and size to be resolved], [line-height to be resolved]): Panel titles, task rows, participant groups, and dialogs.
- **Body** ([weight and size to be resolved], [line-height to be resolved]): Main interface copy, capped at readable line lengths for explanatory text.
- **Label** ([weight and size to be resolved], [letter-spacing to be resolved]): Buttons, tabs, cards, vote states, and compact metadata. Do not use all-caps body copy.

### Named Rules

**The One Friendly Voice Rule.** Use a single warm sans family first. Add another font only if implementation proves a real scanning or brand need.

## 4. Elevation

The system should be flat by default and layered by tone, border, and state. Shadows are allowed for focused dialogs, popovers, dragged task rows, and active cards, but static panels should not look like a stack of decorative cards.

### Named Rules

**The State Creates Lift Rule.** Elevation appears when the user acts: hover, focus, active voting, drag, reveal, or dialog focus. Resting layout uses contrast and spacing first.

## 6. Do's and Don'ts

### Do:
- **Do** make the first screen usable app UI for creating or joining rooms, not a marketing landing page.
- **Do** use the coffee-room atmosphere to support live estimation, especially voting feedback, reveal moments, and facilitator clarity.
- **Do** keep participant state, selected task, voting progress, reveal status, and final estimate visible without instruction-heavy copy.
- **Do** use real controls with visible focus states, keyboard access, readable contrast, and reduced-motion alternatives.
- **Do** let playful or comic details appear in feedback moments, empty states, and microcopy where they reduce meeting tension.

### Don't:
- **Don't** make it feel like a casino poker app: no green felt, chips, gambling-table drama, or card-table theatrics.
- **Don't** make it feel like a marketing landing page, generic SaaS hero, or decorative card grid.
- **Don't** turn the product into a toy-like card game with cartoon clutter that slows estimation.
- **Don't** use heavy dark dashboard gloom as the default atmosphere.
- **Don't** let jokes, mascots, or comic visual beats compete with voting, task selection, or facilitation.
