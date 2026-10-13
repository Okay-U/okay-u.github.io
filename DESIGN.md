---
name: Riftcount Deck Board
description: A Riftbound deckbuilder in the Riftcount app's black instrument panel, pricing every card against par.
colors:
  bg: "#000000"
  surface: "#0f0f11"
  card: "#161618"
  raise: "#1f1f22"
  seg: "#2c2c2e"
  seg-hi: "#3a3a3c"
  popover: "#1c1c1e"
  sheet-phone: "#0c0c0e"
  line: "rgba(255,255,255,.06)"
  line-2: "rgba(255,255,255,.1)"
  line-3: "rgba(255,255,255,.18)"
  text: "#ffffff"
  text-2: "#8e8e93"
  text-3: "#6c6c70"
  green: "#30d158"
  green-soft: "rgba(48,209,88,.16)"
  green-ink: "#002a0f"
  red: "#ff453a"
  red-soft: "rgba(255,69,58,.16)"
  orange: "#ff9f0a"
  orange-soft: "rgba(255,159,10,.16)"
  gold: "#ffd60a"
  fury: "#e5484d"
  calm: "#30a46c"
  mind: "#3e8ef7"
  body: "#f76b15"
  chaos: "#8e4ec6"
  order: "#e2b931"
typography:
  readout:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "'tnum' 1"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    letterSpacing: "-0.015em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "'tnum' 1"
  body-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  micro:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 600
  mono:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "13px"
    lineHeight: 1.5
rounded:
  bar: "2px"
  art: "5px"
  sm: "6px"
  well: "8px"
  lg: "10px"
  sheet: "14px"
  pill: "999px"
spacing:
  hair: "2px"
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  gutter: "16px"
  gutter-gallery: "18px"
components:
  button:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  button-hover:
    backgroundColor: "{colors.raise}"
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.green-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.sm}"
  button-small:
    padding: "0 10px"
    height: "28px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.sm}"
    size: "30px"
  segmented:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text-2}"
    typography: "{typography.label}"
    rounded: "{rounded.well}"
    padding: "2px"
    height: "34px"
  segmented-active:
    backgroundColor: "{colors.seg}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
  toggle:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    padding: "0 11px"
    height: "30px"
  toggle-on:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green}"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text-2}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 9px"
    height: "26px"
  status-ok:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 11px"
    height: "28px"
  status-warn:
    backgroundColor: "{colors.orange-soft}"
    textColor: "{colors.orange}"
  status-bad:
    backgroundColor: "{colors.red-soft}"
    textColor: "{colors.red}"
  select:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 28px 0 10px"
    height: "30px"
  search:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "0 10px 0 12px"
    height: "36px"
  grouped-panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
  row:
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "6px 12px"
    height: "44px"
  row-hover:
    backgroundColor: "{colors.raise}"
  popover:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "5px"
  popover-item-active:
    backgroundColor: "{colors.seg}"
    rounded: "{rounded.sm}"
  tag-buy:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green}"
    typography: "{typography.micro}"
    rounded: "{rounded.pill}"
  tag-sell:
    backgroundColor: "{colors.red-soft}"
    textColor: "{colors.red}"
    typography: "{typography.micro}"
    rounded: "{rounded.pill}"
  tag-pair:
    textColor: "{colors.gold}"
    typography: "{typography.micro}"
    rounded: "{rounded.pill}"
  toast:
    backgroundColor: "{colors.seg}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    width: "min(560px, 100vw)"
  peek-bar:
    backgroundColor: "{colors.sheet-phone}"
    textColor: "{colors.text}"
    rounded: "{rounded.sheet}"
    padding: "12px 16px 8px"
    height: "64px"
---

<!-- Scope: this file describes the Deck Board surface at /deck/ only. The marketing home (/index.html, /style.css) and the /amber/ ledger page are separate surfaces with their own look and are NOT governed by this system. Recorded from the shipped build (commits 84f8acc, cc7daa7); it replaces the earlier split-flap exchange-board system, which was rejected and is obsolete. -->

# Design System: Riftcount Deck Board

## Overview

**Creative North Star: "The Black Instrument Panel"**

The deck builder looks like the Riftcount iOS app it sits beside: a true black ground, grouped panels a few steps above it, white hairlines, system type in normal case and one system green. The card art is the only full colour on screen; everything the board draws around it is quiet, so counts, legality and value read at a glance and no control has to be hunted for.

Density is roomy rather than terminal-tight: 44px deck rows, 30-36px controls, 16-18px gutters, and two panes that each scroll on their own. The gallery owns the left of the screen; the deck sits in a resizable panel on the right with Deck, Stats, Hand and Coach one tab apart. On a phone the gallery takes the full screen and the deck becomes a bottom sheet behind a peek bar.

Value is the one idea the board draws in its own way. Every value is a ratio against par (1.00), and it is shown as a bar growing from a centre par line: green to the right above par, red to the left below, softer inside the normal band. The world refuses the genre's gold-trimmed gallery, glows and neon outlines, and the enlarged hover loupe.

**Key Characteristics:**
- True black ground with tonal grouped panels; no bezels, no glow, hairlines only.
- System UI type in normal case, tabular numbers everywhere.
- One accent: system green for legal, complete, selected-as-on and above par.
- Red only below par and for errors; gold only for the rare Pair highlight.
- Subtle 6px corners on controls, 10px on grouped panels, capsules for pills.
- Values drawn as centre-par bars on a ratio scale.

## Colors

Monochrome black and grey in the iOS dark-mode grouped style, with one green, a red for under par and errors, and Riot's card art as the only full colour.

### Primary
- **System Green** (green): The single accent. The legality pill when legal, completed counts in chips (40/40, 12/12, 3/3), the primary button, pressed toggles (Values, In deck only), the active Coach style, the "Adding here" target label, the drop-to-add hint, finished log steps, the right-hand fill of value bars and every readout above the band (over 1.17). Its 16% soft fill (green-soft) backs pills and toggles; text set on solid green uses **Green Ink** (green-ink).

### Secondary
- **System Red** (red): Below par and errors only. Readouts under the band (below 0.86), the left-hand fill of value bars, over-limit counts, the illegal pill, Sell tags, ban tags and the drag-out bar. Soft fill red-soft at 16%.
- **System Orange** (orange): The legality pill's "still building" state and nothing else, on orange-soft.

### Tertiary
- **System Gold** (gold): The Pair tag in the Coach tape, on a 14% gold wash. Rare by design.
- **Domain colours** (fury, calm, mind, body, chaos, order): Riftbound's six domains as stack fills in the Stats charts; everywhere else a domain is shown by its rune symbol (below). Never a fill behind text or a panel.
- **Card symbols** (deck/glyphs, js/glyphs.js): Riot's own glyphs from the card gallery, the set the Riftcount app bundles. Domain runes and energy discs (0-12, white with the number) keep their colours as images; might, exhaust, colorless, champion and the card types are white masks tinted with the surrounding text colour. They stand in wherever a game concept would otherwise be a word or a dot: domain filter chips, energy cost buttons, type toggles, gallery captions, deck rows, group headings, the legend's domains, rune counters, Stats axes, quick add and the card detail (stat chips and inline in the ability text, with [Keywords] in bold). Sizes: 15-16px beside 12-13px labels, 18-20px on their own, 1.2em inline in text.

### Neutral
- **True Black** (bg): Page ground, top bar, deck panel, sticky bars at 90-92% with blur.
- **Grouped Panel** (card): Every grouped panel, button, select, search well, chip and segmented track.
- **Inset** (surface): Art backdrops while images load, and the side sheet.
- **Raised** (raise): Hover for buttons, rows and selects; current row in lists; ledger totals.
- **Segment** (seg) and **Segment High** (seg-hi): Selected segment, field fill, cost badges, popover active item; seg-hi for hovered steppers and the neutral curve bars.
- **Popover** (popover): Quick-add list and context menu.
- **Phone Sheet** (sheet-phone): The phone bottom sheet, its peek bar and tab bar.
- **Hairlines** (line, line-2, line-3): 6% for dividers between rows and bars, 10% for pill outlines and menu rules, 18% for focus-within rings and hover underlines.
- **Text** (text), **Secondary Text** (text-2), **Tertiary Text** (text-3): Primary copy; labels, captions and inactive tabs; counts, hints and empty values.

### Named Rules
**The One Green Rule.** Green is the only accent. It means legal, complete, on, or above par. Nothing decorative is green.

**The Red Means Under Rule.** Red appears only for a value below par or an error or limit breach. A low number that is not a fault stays white or grey.

**The Art Is the Colour Rule.** Card art is the only full-colour content. Gold, ornament and colour inside the art are Riot's, not the board's; the board's own gold is limited to the Pair tag.

## Typography

**Display Font:** System UI (-apple-system, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, Arial)
**Body Font:** the same system stack
**Label/Mono Font:** ui-monospace (SF Mono, Menlo, Consolas) only for decklist text, deck codes and calculation notes

**Character:** One native system face in normal case, as the iOS app sets it. Hierarchy comes from size and a narrow weight band (400-700), never from capitals or letterspacing.

### Hierarchy
- **Readout** (700, 30px, 1, -0.02em): The deck value in the value band and the Coach verdict score; the odds calculator result sits at 28px.
- **Headline** (650, 20px, -0.015em): Intro headline and sheet titles; Stats headline numbers use 20px at 700.
- **Title** (650, 16px, -0.01em): Legend name in the identity row, verdict heading. The wordmark and deck name use 15px at 650/600.
- **Body** (400, 15px, 1.4): Default text, row card names. Body copy caps at 62-68ch.
- **Body small** (400, 14px): Fields, search, menu items, rune names, Claude read text.
- **Label** (600, 13px): Section and chart headings in secondary text; buttons, tabs and segments use 13px at 500-600.
- **Caption** (400, 12px): Subtitles, chips, chart titles, gauge labels.
- **Micro** (600, 11px): Tags, hints, curve axis numbers.

### Named Rules
**The Tabular Rule.** Every number is set with tabular figures (set on body), so columns of counts and ratios line up and do not jitter when they change.

**The Normal Case Rule.** No uppercase labels, no tracked-out caps, no condensed widths. Labels are sentence case at 12-13px.

## Layout

Two panes under a sticky 52px top bar (wordmark, deck name, legality pill, Import / Export / Share). The floor is a grid of the gallery (minmax(0, 1fr)) and the deck panel (clamp(380px, 34vw, 540px)); both fill the viewport height and scroll independently. A 10px invisible divider on the panel edge resizes it (a 2px hairline shows on hover or focus); the gallery's tile size steps with − / +. Both persist per browser.

The gallery toolbar is sticky, two rows: search with a card count and a type segmented control; then domain chips, cost buttons 0-7+, type and sort selects, More. The gallery is an auto-fill grid of minmax(150px, 1fr) with 18px row and 14px column gaps and 18px gutters. The deck panel stacks tabs (sticky), identity row, count chips, the quick-add field (sticky under the tabs), the value band, and the main deck in one of three views: Cards (default; 84px thumbnail grid), Rows (44px rows in a grouped list) or Stacks (two 150px columns of overlapping art with a 30px peek strip). Group (type, energy, domain) and sort apply to all three; a Values toggle hides the value band and every value bar.

Spacing rhythm: 2px inside segmented tracks, 6-8px between controls and chips, 10-14px panel padding and grid gaps, 16px panel gutters, 18px gallery gutters.

**Phone (≤900px):** the top bar drops to 48px with the wordmark, separator and top actions folded into a ⋯ menu. The gallery goes full screen at minmax(104px, 1fr) with 12px gutters; filters fold behind a Filters button and each open filter row swipes sideways. The deck panel becomes a fixed bottom sheet (88dvh, 14px top corners) that rests as a 64px peek bar (grab handle, legend thumbnail, deck name, count, legality and value) and opens by tap or drag. Rows show their menu control permanently.

## Elevation & Depth

Flat and tonal, like iOS grouped lists. Depth comes from stepping greys over true black (bg → card → raise → seg), not from shadows. Shadows appear only where a layer genuinely floats over another: a hovered card, a popover, the side sheet, the phone sheet, a toast. They are always black and soft, never coloured.

### Shadow Vocabulary
- **Card lift** (`box-shadow: 0 14px 24px -14px rgba(0,0,0,.95)`): gallery art on hover/focus with a 3px rise; deck thumbnails use `0 10px 18px -12px` with 2px.
- **Popover** (`box-shadow: 0 0 0 1px rgba(255,255,255,.1), 0 18px 36px -14px rgba(0,0,0,.9)`): quick-add list and context menu.
- **Side sheet** (`box-shadow: -24px 0 48px -24px rgba(0,0,0,.9)`): dialog sheet over a 60% black backdrop.
- **Phone sheet** (`box-shadow: 0 -18px 40px -18px rgba(0,0,0,.95)`): the bottom sheet.
- **Toast** (`box-shadow: 0 12px 28px -12px rgba(0,0,0,.9)`).

### Named Rules
**The Tonal Step Rule.** A panel is a lighter grey on black, never a bordered box. Borders are hairlines between rows, not frames around panels.

**The No Glow Rule.** No coloured shadow, glow or neon outline anywhere. Focus is a 2px white (85%) outline at 2px offset; field focus is an inset 1px line-3 ring.

## Shapes

Gentle iOS corners. Controls, fields, buttons and segments are 6px; grouped panels, menus and the value band are 10px; segmented tracks are 8px so the 6px selected segment sits concentric inside 2px padding. Card art keeps its native proportions (744/1039, battlefields rotated 1039/744) at 6px in the gallery and 5px in the denser deck views. Pills, chips, toggles, tags, the legality pill and toasts are full capsules, as the app's own pills are. Dots (legality, log) are circles; value and gauge bars are 4px tall with 2px ends.

## Components

### Buttons
Quiet and native; the panel does the work, buttons just sit in it.
- **Shape:** 6px, 32px tall, no border.
- **Default:** grouped-panel fill, white 13px/500 label; hover steps to raise; press scales to 98%.
- **Primary:** solid green with green-ink text at 600 (Pick a legend, Run). One per view at most.
- **Quiet / Icon:** transparent with secondary text; icon buttons are 30px squares with 16px stroke icons (1.8 stroke); hover fills card.
- **Small:** 28px at 12px. **Disabled:** 40% opacity.
- **Link:** green 13px/500 text, underline on hover.

### Segmented controls and tabs
- **Style:** a card-grey track with 2px padding and 8px corners; segments 30px tall, secondary text, 13px.
- **State:** the selected segment fills seg with white text; counts inside segments sit in tertiary text. Deck panel tabs (Deck / Stats / Hand / Coach) are a four-column segmented control in a sticky blurred bar. View switch (Cards / Rows / Stacks) and the gallery type filter use the same control.

### Chips and toggles
- **Count chips:** card-grey capsules, 26px, 12px secondary label with a bold white count; the count turns green when complete, red when over.
- **Toggles:** 30px capsules with a 10% hairline outline; on = green-soft fill, green text, no outline.
- **Domain and type filter chips:** outlined capsules with a 16px rune or type symbol; pressed = card fill, white text. Energy cost buttons are the 20px energy symbols in 30px squares; while one is pressed the others dim to 45%.
- **Active filter chips:** card-grey capsules with a tertiary ×.

### Legality pill
A 28px capsule with a 7px dot and 13px/600 label: green-soft/green when legal, orange-soft/orange while building, red-soft/red when illegal, neutral card/secondary before a legend is picked.

### Inputs / Fields
- **Search:** 36px card-grey well, 6px, tertiary search icon and placeholder, a card count and a `/` key hint at the right; focus-within adds an inset line-3 ring.
- **Field / number input:** 34px, seg fill (card fill inside panels), 14px.
- **Select:** 30px card-grey, drawn grey chevron, 13px; hover steps to raise.
- **Textarea:** black well, 10px corners, 10% hairline, monospace 13/1.5.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** card grey on black; no border, no shadow (see Elevation).
- **Internal Padding:** 10-16px; lists clip their rows and divide them with 6% hairlines.
- **Gallery tile:** no frame; art on an inset backdrop, caption below with the name (13px/600, ellipsis), the value readout right-aligned, and a 12px secondary subtitle. Cards in the deck carry a dark capsule stepper (− count +) at the bottom of the art with the count in green. Unplayable cards drop to grayscale .8 and brightness .5. Hover lifts the art 3px; it never enlarges.

### Value readout and value bar (signature)
- **Readout:** a plain tabular number to two decimals (en dash when absent). White inside the normal band 0.86-1.17, green above it, red below it; a change fades in from 35% opacity over 220ms.
- **Bar:** a 4px track at 8% white with a 1px par line at the centre (32% white). The fill grows from the par line on a log ratio scale where a full half is 3.00 (or 0.33): right and green above par, left and red below. Inside the normal band the fill draws at 50% opacity.
- **Value band:** a grouped panel heading the deck: the readout at 30px, a caption, the bar, one sentence comparing in-deck value with Riot's ledger, and an 8-column energy curve in seg-hi grey. Hidden with the Values toggle.

### Deck views
- **Cards (default):** 84px thumbnails at 5px, a dark capsule copy count (×3) bottom-right, a hover stepper bottom-left on fine pointers, readout and bar below.
- **Rows:** 44px rows in a 10px grouped list: quantity (15px/650), the energy symbol with the power cost as rune symbols, the name over its value bar, the readout; hover fills raise and reveals − / + / ⋯ in place.
- **Stacks:** overlapping art showing a 30px strip (quantity, name, readout on a left-to-right dark gradient); hover or focus lifts a card 8px out of the stack.
- Group headers are 12px/600 secondary text buttons with a chevron that turns -90° when folded.

### Navigation
- **Top bar:** sticky, black, 6% bottom hairline; wordmark with an 18px green rounded square mark; deck name as a borderless field that fills card grey on hover or focus.
- **Phone peek bar:** sticky top of the bottom sheet, 36px grab handle, legend thumbnail, deck name (15px/600) over a 12px status line, a chevron that flips when open.

### Popover menu, sheet and toast
- **Popover:** popover grey, 10px, 5px padding, 14px items at 6px that fill seg on hover or focus; dividers are 10% hairlines.
- **Sheet:** right-edge dialog up to 560px on the inset grey with a 10% left hairline; slides in 32px over 280ms. Full width on phones.
- **Toast:** a seg-grey capsule centred above the peek bar, 14px/500; rises 12px.

### Coach tape
A grouped list of agent moves: a 44px capsule side tag (Buy green-soft/green, Sell red-soft/red, Pair gold wash/gold, Hold seg/secondary), the card name at 14px/600, readouts, and a 12.5px secondary reason line.

## Do's and Don'ts

### Do:
- **Do** keep the ground true black and build panels from the tonal steps card (#161618), raise and seg.
- **Do** use green as the only accent, at full strength for text and fills that mean on, legal, complete or above par, and at 16% (green-soft) behind pills.
- **Do** show value as a two-decimal tabular readout plus a bar growing from the centre par line at 1.00, green right, red left, softer inside 0.86-1.17.
- **Do** set every number in tabular figures and every label in normal case system type.
- **Do** use 6px corners on controls, 10px on grouped panels, and capsules for pills, chips and tags.
- **Do** keep motion short and native: cubic-bezier(.2,.8,.2,1) at 150-320ms, and honour reduced motion (transitions drop to 1ms, scripted fades and slides are skipped).

### Don't:
- **Don't** use red for anything but below-par values, limit breaches and errors.
- **Don't** add a glow, coloured shadow or neon outline to tiles, panels or buttons.
- **Don't** enlarge card art on hover; a 2-3px lift is the whole hover.
- **Don't** set uppercase, tracked or condensed labels, and don't render numbers as split-flap cells.
- **Don't** frame panels with borders or bevels; depth is a tonal step.
- **Don't** use gold outside the Pair tag, or domain colours as fills behind text.
