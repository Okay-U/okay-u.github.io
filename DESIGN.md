---
name: Riftcount Deck Board
description: An exchange-floor split-flap board that prices every Riftbound card in the deck being built.
colors:
  steel: "#17181a"
  rule: "#2d2f33"
  rule-hi: "#3d3f45"
  well: "#0f1011"
  key-face: "#2a2c30"
  flap: "#0b0b0c"
  flap-top: "#161618"
  paint: "#efe9dd"
  paint-dim: "#b3ad9f"
  paint-mute: "#8a857b"
  amber: "#f3a72a"
  amber-ink: "#1a1204"
  up: "#57bd7c"
  up-ink: "#07170d"
  down: "#ec6347"
  down-ink: "#1d0702"
  fury: "#dc4a3f"
  calm: "#43a874"
  mind: "#4789e0"
  body: "#ec8f30"
  chaos: "#9a68e0"
  order: "#dcb63a"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "clamp(26px, 3.2vw, 40px)"
    fontWeight: 780
    lineHeight: 1.02
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 74"
  flap:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontWeight: 640
    lineHeight: 1.32
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 72"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 86"
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    fontVariation: "'wdth' 100"
  row-name:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 620
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 75"
  key:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 620
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 80"
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 640
    letterSpacing: "0.12em"
    fontVariation: "'wdth' 80"
  mono:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "13px"
    lineHeight: 1.5
rounded:
  none: "0px"
spacing:
  hair: "2px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "26px"
components:
  key:
    backgroundColor: "{colors.key-face}"
    textColor: "{colors.paint}"
    typography: "{typography.key}"
    rounded: "{rounded.none}"
    padding: "0 14px"
    height: "34px"
  key-hover:
    backgroundColor: "#31343a"
  key-pressed:
    backgroundColor: "{colors.paint}"
    textColor: "#121212"
  key-amber:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    typography: "{typography.key}"
    rounded: "{rounded.none}"
    padding: "0 14px"
    height: "34px"
  key-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.paint}"
    rounded: "{rounded.none}"
  key-small:
    padding: "0 10px"
    height: "28px"
  room-tab:
    backgroundColor: "{colors.well}"
    textColor: "{colors.paint-mute}"
    typography: "{typography.key}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "34px"
  room-tab-active:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
  flap-cell:
    backgroundColor: "{colors.flap}"
    textColor: "{colors.paint}"
    typography: "{typography.flap}"
    rounded: "{rounded.none}"
  search-field:
    backgroundColor: "{colors.flap}"
    textColor: "{colors.paint}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "34px"
  board-row:
    textColor: "{colors.paint}"
    typography: "{typography.row-name}"
    padding: "3px 12px 3px 18px"
    height: "34px"
  tape-buy:
    backgroundColor: "{colors.up}"
    textColor: "{colors.up-ink}"
    typography: "{typography.label}"
  tape-sell:
    backgroundColor: "{colors.down}"
    textColor: "{colors.down-ink}"
    typography: "{typography.label}"
  tape-pair:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    typography: "{typography.label}"
  toast:
    backgroundColor: "{colors.paint}"
    textColor: "#121212"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  sheet:
    backgroundColor: "#111214"
    textColor: "{colors.paint}"
    rounded: "{rounded.none}"
    width: "min(560px, 100vw)"
---

<!-- Scope: this file describes the Deck Board surface at /deck/ only. The marketing home (/index.html, /style.css) and the /amber/ ledger page are separate surfaces with their own older look and are NOT governed by this system. -->

# Design System: Riftcount Deck Board

## Overview

**Creative North Star: "The Exchange Floor Board"**

The deck is a live price board on a trading floor. A brushed-steel ground carries matte black flap faces; off-white painted characters sit in individual hinged cells and flip when a value changes. Every card has a price from Riot's cost ledger, shown in amber, and the board re-prices it inside the deck, ticking green when partners lift it and vermilion when the deck drags it down. The card art is the only full colour in the room; everything else is steel, black, paint and three lamp colours.

Density is a trading terminal's: tight 34px rows, 1px black rules, uppercase narrow labels, numbers in tabular flap cells. The layout is a carried object between rooms. The deck board stays pinned on the right at full height while the left corridor switches between the Build, Analyze and Test rooms; on a phone the board becomes its own dock tab, and a strip of its headline values stays pinned under the rail.

The world refuses the genre's gold-on-black gallery: no glowing tiles, no soft rounded panels, no neon borders around cards. Depth is mechanical, with recessed faces in steel bezels, raised switch-plate keys and a hinge line through every flap.

**Key Characteristics:**
- Split-flap cells for every headline number, with a hinge line through the middle and a tabular, 72%-width face.
- One grotesque (Archivo) used across its width axis, from 72% condensed flaps to 100% body text.
- Square corners everywhere; 1px black rules and 3px brushed-steel bezels instead of cards.
- Amber means price and the primary action; green and vermilion only mean up and down.
- Motion is mechanical: flips, wipes and slides with a hard ease-in going out and a long expo-out settle coming in.

## Colors

A near-monochrome steel and black board, lit by amber lamps and two tick colours, with Riot's card art as the only full colour.

### Primary
- **Ledger Amber** (amber): The price lamp. Ledger values in flap cells, the active room tab, the active dock tab, the active cost filter, the Run agent key, the focus underline on the deck title and the search focus ring, link text, log bullets and gauge bars. Text set on amber always uses **Amber Ink** (amber-ink), a near-black brown.

### Secondary
- **Signal Green** (up): Values that rose against their reference, completed counts (40/40 main deck, 12/12 runes, 3/3 battlefields), the legal status lamp, finished log steps and Buy tags on the tape. Ink on green is **Green Ink** (up-ink).
- **Tick Vermilion** (down): Values that fell, over-limit counts, the illegal status lamp, flagged or banned rows and Sell tags. Ink on vermilion is **Vermilion Ink** (down-ink).

### Tertiary
- **Domain pips** (fury, calm, mind, body, chaos, order): Riftbound's six domains. Used only as small square pips: the 8px filter dots, the 6px power pips in board rows, the 10px rune dots, and chart stacks, where the build mixes them 74% into #16171a so the bars sit back from the art.

### Neutral
- **Brushed Steel** (steel): The page ground, layered with two hairline vertical grain stripes and a top-to-bottom gradient from #1a1b1e to #121315.
- **Flap Black** (flap): The lower half of every flap cell, every recessed face (panels, search well, textareas, verdict) and the tile art backdrop.
- **Flap Lip** (flap-top): The upper half of a flap cell; the hard 50% split between it and Flap Black is the hinge.
- **Floor Well** (well): The trough behind segmented controls (room switch, zone filter).
- **Plate Steel** (key-face): The top of a switch-plate key gradient (#2a2c30 to #202226).
- **Rule** (rule) and **Rule High** (rule-hi): Internal dividers between segments, rows and list items, and key/select borders. Outer edges of panels are pure #000.
- **Paint** (paint): Primary text and flap characters; also the pressed/selected state fill for keys, zone filters and agent style keys, with #121212 ink.
- **Paint Dim** (paint-dim): Lede and body copy on the board, section headings, cost numerals.
- **Paint Mute** (paint-mute): Labels, captions, hints, inactive tabs, empty values.

### Named Rules
**The Art Is the Colour Rule.** Card art is the only full-colour content. Surfaces are steel and black; colour elsewhere is a lamp, a tick or a domain pip, never a fill behind content.

**The Amber Is Price Rule.** Amber marks ledger value and the single primary action in view (Run agent, the active room). Green and vermilion are reserved for direction against a reference or a limit; they never decorate.

**The Dark Ink Rule.** Text on a lamp colour uses that lamp's own near-black ink (amber-ink, up-ink, down-ink), never white.

## Typography

**Display Font:** Archivo (with Helvetica Neue, Arial, system-ui), variable on wdth 62–125 and wght 300–800
**Body Font:** Archivo, same family
**Label/Mono Font:** ui-monospace (SF Mono, Menlo) only for decklist import/export text and calculation notes

**Character:** One condensed grotesque doing every job by moving along its width axis: flap characters at 72%, row names at 75%, labels and keys at 78–84%, titles at 86–90%, body text at 100%. Weight sits in the 620–780 band for anything painted on the board.

### Hierarchy
- **Display** (780, clamp(26px, 3.2vw, 40px), 1.02, 74% width, uppercase): The Build room intro headline.
- **Flap** (640, 72% width, tabular nums, cell height 1.32em): Every flap readout. Size is set per context: 40px deck values (32px on phones), 34px room titles (26px on phones), 22px board title, 21px ticker, 17px phone strip, 12–18px rows, tiles and gauges.
- **Title** (700, 19px, 86% width): The editable deck name in the rail (17px on phones). Verdict heads use 720 at 18px, 84%.
- **Body** (400, 15px, 1.45, 100% width): Running copy. Ledes cap at 70ch, verdict and report text at 64–72ch, tape reasons at 80ch.
- **Row name** (620, 13px, 75% width, 0.06em, uppercase): Card names in board rows and on the tape (13.5px, 660 on the tape).
- **Key** (620, 12px, 80% width, 0.06em, uppercase): Key, select and tab labels; tabs run 640 at 78% with 0.08em.
- **Label** (640, 10px, 80% width, 0.12em, uppercase): Ticker captions, group labels, section heads (10.5–11px, 0.14em). Column heads go to 9.5px at 700.

### Named Rules
**The Numbers Live in Flaps Rule.** Headline numbers (counts, ledger value, in-deck value, verdict score, gauge values, odds percentages, rune counts) render as split-flap cells, one cell per character, tabular, never as plain text.

**The One Family, Many Widths Rule.** Hierarchy comes from Archivo's width and weight axes and from case, not from a second typeface. The only other face is system monospace for raw decklist text.

## Layout

A fixed desktop floor under a sticky 58px rail. The rail is a five-column grid: wordmark in flap cells, editable deck name, status lamp, room switch, rail keys. Below it the floor is two columns: a corridor (minmax(0, 1fr)) holding stacked, absolutely positioned rooms that each scroll on their own, and the pinned board (clamp(360px, 31vw, 470px)) scrolling independently with a sticky head. The floor fills the viewport height (100dvh minus the rail).

Spacing rhythm: 2px between flap cells, 6–8px between keys and grid gaps, 12px phone gutters and row padding, 18px board gutters, 20px gallery gutters, 22–26px room padding. The gallery is an auto-fill grid of minmax(148px, 1fr) with 18px row and 14px column gaps. Board rows use a five-column grid (34px quantity, 30px cost, name, value, in-deck value).

Responsive behaviour:
- **≤1180px:** rail gap tightens to 12px; rail keys collapse to Decks only.
- **≤900px (phone):** rail drops to 52px and loses the wordmark and room switch; the status lamp loses its text. A 46px ministrip pins under the rail with main count, in-deck value and its tick, and Run agent. A fixed four-tab dock (58px plus safe-area inset) replaces the room switch: Cards / Deck / Agent / Test. Corridor and board stack in the same box; the board shows only as the Deck tab. The gallery drops to minmax(104px, 1fr), captions lose subtitles, row controls become always visible, and rows drop the cost and ledger columns. Filters fold into a tray toggle. The sheet goes full width and card detail stacks.
- **≤560px:** agent style keys stack their name over their description.
- Charts in the Test room auto-fit at a 180px minimum, so they reflow with the board width rather than the viewport.
- **Divider (desktop):** the board edge is a 10px col-resize handle; dragging sets `--board-w` between 340px and 62% of the floor (max 820px), arrow keys step 24px, double click resets. The gallery tile minimum (`--tile`) steps through 112 / 130 / 148 / 172 / 204px. Both persist per browser and are hidden on phones.

## Elevation & Depth

Depth is mechanical. Data sits on black faces recessed into the steel; controls are raised plates. Nothing floats on a soft drop-shadow cloud. The recurring vocabulary is a 1px top highlight (white at 3–7%) over a hard 1px black under-edge, which reads as machined metal at any size.

### Shadow Vocabulary
- **Bezel** (`border: 3px solid transparent; border-image: linear-gradient(180deg, #44474e 0%, #24262a 45%, #303238 100%) 1; box-shadow: 0 0 0 1px #000, inset 0 0 0 1px #000, 0 12px 22px -16px #000`): Every data panel (charts, tape, agent styles, verdict, deck values, gauges, odds, intro steps and values, ledger, deck list) is a black face in a brushed-steel frame.
- **Flap cell** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 1px 0 rgba(0,0,0,.7)` plus a 1px rgba(0,0,0,.85) hinge line at 50%).
- **Switch plate** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.07), 0 2px 0 -1px rgba(0,0,0,.9), 0 3px 6px -3px rgba(0,0,0,.6)`): Raised keys; pressing moves the key 1px down and swaps to an inner shadow.
- **Lit plate** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 2px 0 -1px #5c3a06, 0 6px 14px -8px rgba(243,167,42,.5)`): The amber key only; a short amber spill under a lit switch.
- **Lamp halo** (`box-shadow: 0 0 0 2px rgba(<lamp>, .18)`): The 9px square status lamp when lit.
- **Well** (`box-shadow: inset 0 2px 4px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.04)`): Search field and textareas, sunk into the steel.
- **Lift** (`0 14px 22px -12px rgba(0,0,0,.95)`): Gallery tile art on hover; the loupe and sheet use longer black throws (`0 34px 60px -26px #000`, `-30px 0 60px -30px rgba(0,0,0,.9)`).

### Named Rules
**The Recessed Face Rule.** Content panels are black faces set into a 3px steel bezel with a black outer and inner line. Don't build a panel from a lighter fill with a soft shadow.

**The Lamps Glow, Tiles Don't Rule.** Light spill belongs to lit hardware: status lamps and the amber key. Card tiles lift with black shadow only and never take a coloured glow or border highlight.

## Shapes

Square corners everywhere (rounded.none). Edges are 1px rules: pure black on the outside of panels and segment groups, rule or rule-hi between segments and rows. Segmented controls (room switch, zone filter, cost filter, dock) are flush runs of cells divided by 1px rules inside a black border, never separate pills. Lamps, pips, rune dots and log bullets are small squares (6–10px). Reveals use straight-edged clip-path wipes rather than fades from a rounded mask. Card art keeps its native proportions (744/1039, battlefields rotated) and is never clipped to a new silhouette.

### Named Rules
**The Square Corner Rule.** border-radius is 0 on every element the board draws. Rounding is what the genre does; the exchange board doesn't.

## Components

### Buttons (switch-plate keys)
Tactile and mechanical, like a recessed switch on a trading desk.
- **Shape:** square (0px), 1px rule-hi border, 34px tall.
- **Default:** plate-steel gradient (#2a2c30 to #202226), paint text, key type (12px, 620, 80% width, uppercase, 0.06em), 0 14px padding, switch-plate shadow.
- **Hover / Active:** gradient lightens to #31343a/#25272b; press translates 1px down with an inner shadow (120ms expo-out). Focus is a 2px paint outline at 2px offset.
- **Pressed toggle:** paint fill with #121212 text.
- **Amber:** the lit primary action (Run agent): amber gradient #f7b444 to #e39718, #a86c10 border, amber-ink text, lit-plate shadow. One per view.
- **Quiet:** transparent, rule border, no shadow; for secondary actions inside the board (Change legend).
- **Small / Icon:** 28px tall at 11px, or a 30px square icon key.
- **Disabled:** 45% opacity, not-allowed cursor.

### Room switch and segmented filters
- **Style:** a flush row of cells in a black-bordered well; cells divided by 1px rules; uppercase key-type labels in paint-mute.
- **State:** the active room, active dock tab and active cost filter fill amber with amber-ink; active zone filters and agent style keys fill paint with dark ink. Hover lifts the label to paint.
- **Domain filters:** 30px rule-bordered chips with an 8px square pip in the domain colour at 35% opacity, full when pressed.

### Split-flap readout (signature)
- **Cell:** one per character, 2px gap, min 0.72em wide (0.38em for spaces), 1.32em tall; flap-top over flap black split at 50%, with a 1px black hinge line.
- **Colour classes:** paint by default; amber for ledger values; up/down for direction or limits; paint-mute when empty ( -- ).
- **Motion:** only changed cells flip, left to right with a 34ms stagger capped at 260ms. Each flip falls to -90deg in 70ms (ease-in cubic-bezier(.55,0,.75,.2), brightness to .55), passes through a decoy digit (target +7), falls again in 60ms, then settles from 90deg in 150ms (expo-out cubic-bezier(.16,1,.3,1)). At most about 60 flips run at once; beyond that cells snap. First render, hidden tabs and reduced motion snap instantly.

### Status lamp
- A 9px square lamp plus uppercase label in paint-dim. Unlit #3a3530; lit up, amber or down with an 18% halo ring. On phones the lamp shows without the label.

### Inputs / Fields
- **Search:** 34px flap-black well, black border, inset shadow; focus adds a 1px amber ring.
- **Select:** 34px, rule-hi border, #1c1d20 fill, a drawn paint-dim triangle, uppercase key type.
- **Deck name:** borderless title type on the rail with a dashed rule-hi underline on hover and an amber underline on focus.
- **Textarea:** flap-black well with inset shadow, monospace 13px/1.5.

### Board row
- 34px min height, five-column grid, rgba(255,255,255,.025) top hairline, faint white wash on hover. Name in row-name type, amber on hover; quantity, ledger value and in-deck value in flap cells with a ▲/▼ tick in up/down. Hover or focus swaps the values for − / + controls in place. Flagged rows paint the name vermilion; the champion row carries an amber "Champion" suffix.
- **Motion:** new rows wipe in from the left (clip-path, 380ms expo-out); removed rows wipe out to the right (170ms ease-in).

### Board header, quick add and view bar
- The board head scrolls away except its quick-add strip, which pins at the top of the board (`top: calc(-1 * var(--pin))`, measured by a ResizeObserver).
- **Quick add:** the search well with a listbox drop below it: square rows on flap black, name in row-name type, a muted meta line, the ledger value in amber; the active row fills amber with amber-ink. A one-line muted hint lists Enter / Shift+Enter / Alt+Enter.
- **View bar:** a two-cell segmented List / Stacks switch (paint fill when pressed) plus 28px Group and Sort selects. Group headers are full-width text buttons with a drawn caret that turns -90deg when folded.

### Visual stacks
- Each group is a column (CSS columns, 150px minimum); cards overlap so only a 30px strip shows (`margin-top: calc(var(--peek) - 139.65%)`), the last card in full. The strip carries quantity, name in row-name type and the in-deck flap value on a left-to-right black gradient so the art shows at the right.
- Hover or focus lifts a card 8px out of the stack (z-index raise, black lift shadow). Switching to Stacks deals the cards in from -18px with a 14ms stagger (capped 420ms).

### Row menu
- A fixed bezel panel of uppercase key-type items divided by rule lines; the hovered or focused item fills amber with amber-ink; move items carry the copy count (×3). Opens with a top-down clip wipe (200ms expo-out); Escape, outside press, scroll or Tab closes it. Arrow keys move focus.

### Drag and drop
- Gallery tiles and board rows drag natively. The section under the pointer takes a 5% amber wash and its heading turns amber with a muted "drop to add" suffix; no outlines or stripes.

### Tape (agent buys and cuts)
- A bezel panel of rows: a 42px side tag (Buy on up, Sell on down, Pair on amber, Hold on #2e3035), the card name in row-name type, flap values, and a muted reason line underneath.

### Cards / Containers
- **Corner Style:** square.
- **Background:** flap black face inside the steel bezel (see Elevation).
- **Internal Padding:** 10–12px rows, 12–16px panel interiors, 18–20px for the verdict.
- **Gallery tile:** no frame at all; the card art sits on #0a0a0b with a black under-shadow, the caption below in 12.5px 620 at 90% width with an amber flap value. Hover lifts the art 4px (260ms expo-out); press settles to -1px and 98.5% (80ms). Unavailable cards go grayscale .85 and brightness .45. Preview and ban tags are square paint or vermilion corner labels.

### Navigation
- **Rail:** sticky, #202124 to #18191b gradient, black bottom edge with a 4% white highlight.
- **Dock (≤900px):** fixed four-cell bar, uppercase 11px labels at 78% width, rule dividers, the active cell filled amber with amber-ink, the deck count in tabular numerals.
- **Room change:** the outgoing room slides 28px and fades in 160ms ease-in; the incoming room slides from 36px with a 30% clip wipe in 380ms expo-out. Opening the board tab on phones lifts it 22px in 300ms.

### Test room additions
- **Headline gauges:** a bezel strip of flap readouts (cards, average energy and power, units, in-deck value in amber), auto-fit at 120px.
- **Curve drill-down:** energy bars are buttons; picking one dims the other stacks to 30% and lists the cards at that cost below as small art tiles with quantity and name.
- **Odds calculator:** a bezel panel of uppercase-labelled wells (card, copies, cards seen, at least) and a large flap percentage, green at 80% or more, vermilion under 50%.

### Sheet, toast and loupe
- **Sheet:** a right-edge dialog, up to 560px wide, #111214, black left edge, long black throw, backdrop rgba(5,5,6,.62); slides in 40px over 380ms. Titles in 22px, 760, 80% width, uppercase.
- **Toast:** a square paint slip with #121212 text, bottom left above the dock; rises 16px in 280ms.
- **Loupe:** a 300px card preview for fine pointers only, after a 260ms hover; revealed top-down with a clip wipe in 240ms.

## Do's and Don'ts

### Do:
- **Do** render every headline number as split-flap cells, one per character, tabular, at 72% width.
- **Do** set all chrome text in Archivo and move along its width axis for hierarchy (72% flaps to 100% body).
- **Do** seat data panels as black faces in the 3px brushed-steel bezel with black outer and inner lines.
- **Do** use amber for ledger value and the single primary action, green and vermilion only for direction against a reference or a limit.
- **Do** put lamp colours under their own dark ink (amber-ink, up-ink, down-ink).
- **Do** keep motion mechanical: ease-in cubic-bezier(.55,0,.75,.2) for anything leaving or falling, expo-out cubic-bezier(.16,1,.3,1) for anything arriving or settling.
- **Do** honour reduced motion: CSS transitions and animations drop to 1ms and every scripted flip, wipe, slide and deal is skipped.

### Don't:
- **Don't** round any corner; border-radius is 0 throughout.
- **Don't** put a glow, neon border or coloured outline around card tiles or panels; spill light belongs only to status lamps and the lit amber key.
- **Don't** use domain colours as fills behind content; they stay small square pips and chart stacks.
- **Don't** set white text on amber, green or vermilion.
- **Don't** add a second display or body typeface; monospace is reserved for raw decklist text and calculation notes.
- **Don't** build a panel from a lighter fill with a soft, diffuse shadow; depth comes from bezels, plates, wells and hard black under-edges.
