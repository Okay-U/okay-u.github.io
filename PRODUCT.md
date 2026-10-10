# Product

<!-- impeccable:product-schema 1 -->

<!-- Written 2026-10-10 without an interview: the owner asked for no questions while away. Facts marked (inferred) come from the brief and the repo, not from a confirmed answer. -->

## Platform

web

## Users
Riftbound trading card game players who build decks: the owner (Okay, Riftcount developer and competitive player) first, then Riftcount app users. They build at home on a laptop and check or tweak lists on a phone at the store or between tournament rounds (inferred from "so I can have it on my phone").

## Product Purpose
okay-u.github.io hosts the Riftcount marketing page, the app's legal pages and data feeds (cards.json, playriftbound-ops.json). The `/amber/` ledger and the `/deck/` deckbuilder are free web tools beside the app, not part of it. The deckbuilder lets a player build a legal deck by hand and, on demand, run an agent that evaluates the deck: card value against Riot's own cost ledger (AMBER), value inside this specific deck (combos), role gaps, and in-color card suggestions with reasons.

## Positioning
Other Riftbound builders (Piltover Archive is the reference) show cards, curves and community decks. This one prices every card against the designers' recovered cost ledger (Chen & Lee 2026) and then re-prices it inside the deck being built, so a player sees which cards are over or under budget and which ones only become strong together. The math is shown, never hidden.

## Operating Context
- Deck rules: 1 Legend, 1 Chosen Champion (a Champion unit matching the legend), 40-card main deck including the champion, max 3 copies per card, 3 Signature cards max, 3 battlefields, 12 runes split over the legend's two domains, optional 10-card sideboard. Standard ban list from Riot's rules page.
- Decklist text format shared with the Riftcount app and other builders: sections Legend:/Champion:/MainDeck:/Battlefields:/Runes:/Sideboard:, lines "N Card Name, Subtitle".
- Data: /cards.json (refreshed daily from Riot's card gallery), /amber/amber.json (ledger values). Card art from Riot's CDN.

## Capabilities and Constraints
- Static GitHub Pages site: no server, no accounts, no build step required. Decks live in the visitor's browser and in shareable URLs.
- The agent runs in the browser, deterministic, with several work styles. (inferred: no paid API dependency)
- Must work on phones.
- Must not copy Piltover Archive's code, assets or data (their terms forbid scraping); only the workflow is a reference.
- Riot "Legal Jibber Jabber" statement and Digital Tools Policy attribution on every page; previews labelled.

## Brand Commitments
- Name: Riftcount. Owner brief for the deckbuilder: fancy, modern, smooth animations; must not look AI-made; no rounded-rectangle cards and no neon border highlighting.

## Evidence on Hand
- Real card data and art (Riot), ledger values for 931 cards with calculations, synergy tags generated for this project.
- No usage numbers, testimonials or meta statistics; none may be invented.

## Product Principles
1. Show the math: every number the agent states can be traced to a card, a price or a rule.
2. Build first, advise second: manual building is the main path; the agent is invoked, never pushy.
3. Value is not strength: label designer value, practical value and in-deck value honestly.
4. Phone-ready: every core task works one-handed on a phone.
