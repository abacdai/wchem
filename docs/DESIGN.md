---
name: Kinetic Lab
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444653'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757684'
  outline-variant: '#c5c5d5'
  surface-tint: '#3f56bc'
  primary: '#3f56bc'
  on-primary: '#ffffff'
  primary-container: '#7f95ff'
  on-primary-container: '#03268f'
  inverse-primary: '#b9c3ff'
  secondary: '#495e87'
  on-secondary: '#ffffff'
  secondary-container: '#bacffd'
  on-secondary-container: '#435880'
  tertiary: '#00677e'
  on-tertiary: '#ffffff'
  tertiary-container: '#00aacd'
  on-tertiary-container: '#003946'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#001257'
  on-primary-fixed-variant: '#233ca3'
  secondary-fixed: '#d7e2ff'
  secondary-fixed-dim: '#b1c7f5'
  on-secondary-fixed: '#001b3f'
  on-secondary-fixed-variant: '#31476d'
  tertiary-fixed: '#b4ebff'
  tertiary-fixed-dim: '#3cd7ff'
  on-tertiary-fixed: '#001f27'
  on-tertiary-fixed-variant: '#004e5f'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-tech:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin: 32px
---

## Brand & Style
The brand personality is precise, visionary, and intellectually stimulating. It targets researchers and students within a virtual environment, requiring a UI that feels like an advanced scientific instrument rather than a standard web interface.

The design system utilizes **Glassmorphism** and **Modern Corporate** influences to create a "high-fidelity" aesthetic. The interface should feel like light projected onto glass panes within a physical laboratory. Key characteristics include:
- **Optical Clarity:** High transparency combined with significant backdrop blurring to ensure legibility against complex 3D environments.
- **Precision:** Thin strokes and technical details that evoke laboratory equipment.
- **Atmospheric Depth:** A sense of spatial hierarchy where tools and data float at different Z-depths relative to the user.

## Colors
The palette is rooted in scientific rigor. **Science Blue** (#7F95FF) acts as the primary action color, providing a vibrant, energetic contrast to the **Deep Navy** (#10284D) used for high-level branding and structural elements. 

A tertiary **Cyan** (#00D4FF) is reserved for data visualization and success states to reinforce the high-tech theme. The background utilizes a very light blue tint with subtle radial gradients to prevent visual fatigue during long VR sessions, simulating a clean-room environment. Surfaces are never fully opaque; they rely on alpha-transparency to maintain the glass effect.

## Typography
The system uses **Inter** for its exceptional legibility and systematic feel across all primary reading experiences. To inject a "high-tech" laboratory feel, **Space Grotesk** is introduced for labels, data readouts, and technical indicators.

Hierarchy is maintained through tight leading in headlines and generous tracking in technical labels. For VR legibility, body text should rarely go below 16px to avoid "shimmering" on lower-resolution headsets. Display styles use a tight letter spacing to feel "locked-in" and engineered.

## Layout & Spacing
This design system employs a **Fluid Grid** model designed for spatial canvases. Since VR interfaces often "float" in a 3D field, the layout relies on a modular 8px baseline grid to ensure all components align precisely.

- **Desktop/Large HUD:** 12-column grid with 24px gutters.
- **Tablet/Handheld Tooltip:** 6-column grid with 16px gutters.
- **Mobile/Contextual Menu:** 4-column fluid stack.

In a VR context, "Safe Areas" are critical. Keep primary interactive elements within the central 60-degree field of view to prevent neck strain. Outer margins should be dynamic based on the user's distance from the UI panel.

## Elevation & Depth
Depth is the core of this system's spatial logic. Instead of traditional dark shadows, we use **Luminous Elevation**:

1.  **Base Layer:** Background radial gradient (environment).
2.  **Surface Layer (Level 1):** Glass panels with `backdrop-filter: blur(20px)` and a 1px internal white border at 40% opacity.
3.  **Active Layer (Level 2):** Floating elements use a soft, wide Science Blue shadow (`0px 20px 40px rgba(127, 149, 255, 0.15)`) to indicate they are closer to the user.
4.  **Interaction Layer (Level 3):** Buttons and active inputs utilize a "glow" effect rather than an "offset" shadow, simulating light emission from the UI.

## Shapes
The shape language is "Rounded" (0.5rem base) to feel approachable yet sophisticated. Sharp corners are avoided to maintain the soft, futuristic aesthetic, but the curves are not so extreme as to appear "bubbly."

- **Panels:** `rounded-xl` (1.5rem) to differentiate large containers from interactive elements.
- **Buttons/Inputs:** `rounded-md` (0.5rem) for a precise, mechanical feel.
- **Progress Indicators:** Fully rounded (pill) for fluid movement.

## Components
- **Buttons:** Primary buttons use a Science Blue gradient with white text. Ghost buttons use the `glass_border` for their outline. All buttons should have a hover state that increases the `backdrop-filter` intensity.
- **Glass Cards:** The primary container for experimental data. Feature a subtle top-down linear gradient (white at 10% to white at 2%).
- **Technical Chips:** Use **Space Grotesk** for the text. Backgrounds are low-opacity Deep Navy with a Science Blue left-accent border.
- **Input Fields:** Semi-transparent Navy backgrounds with a "glow" focus state. The cursor should be a Science Blue vertical bar.
- **Molecular Visualizers:** Dedicated glass containers with no borders, using only depth and blur to separate them from the background.
- **Status Indicators:** Pulsing glow animations for active chemical reactions or ongoing data processing.