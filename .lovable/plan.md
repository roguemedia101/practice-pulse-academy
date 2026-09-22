# PyCademy Public Landing Page

## Goal
Build a polished, dark public landing page that demonstrates PyCademy as a serious learn-by-doing developer platform. All interactions will be frontend simulations only.

## Page structure
- Sticky desktop and mobile navigation with PyCademy branding and the requested links/actions.
- Product-first hero with strong typography and an interactive Python editor, simulated Run flow, terminal output, cursor activity, and restrained depth effects.
- Connected five-stage learning loop: Learn → Practice → Feedback → Revision → Project, with scroll/selection states rather than five isolated cards.
- Five visually distinct learning paths using controlled semantic accents and concise, non-invented descriptions.
- Simulated AI tutor interaction showing explanation, hint, and corrected code without a real AI service.
- Project-based learning showcase with miniature code/terminal interfaces for the four provided example projects.
- A second visual learning-loop sequence made from compact product interface states.
- Strong final call to action with restrained technical scenery.

## Interaction and motion
- Simulated code editing and Run/output updates in the hero.
- Selectable learning stages and paths, animated progress, project preview switching, hover depth, and selective scroll reveals.
- Mobile navigation with clear touch targets.
- Reduced motion support and simplified decorative depth on smaller screens.

## Visual system
- Deep navy/slate foundation with cyan as primary, purple for AI, green for security, and amber for data/projects.
- Space Grotesk for display, Inter for body/UI, and JetBrains Mono for code.
- Product interface imagery remains the focal point; no stock people, generic illustrations, giant glow blobs, or excessive glass/card treatments.
- Subtle CSS-built dimensional technical objects and layered interface planes; no heavy 3D runtime dependency.

## Technical details
- Implement as the `/` route only in the existing TanStack Start application.
- Keep all data mocked locally; CTA and login links remain non-auth prototype actions.
- Define semantic colors, type, shadows, motion, and surfaces centrally in the design system.
- Add route-specific title, description, Open Graph, and Twitter metadata.
- Verify the page visually at desktop and mobile widths, test the key interactions, and resolve preview/build errors.
