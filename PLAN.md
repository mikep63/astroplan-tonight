# AstroPlan Tonight — web companion

A static GitHub Pages site mirroring the "Tonight" view from the AstroPlan
iOS app: which *popular* deep-sky targets are up tonight from the visitor's
location. No backend, no accounts — everything computes client-side in the
browser.

## Scope

- **Popular targets only** — the 97-object curated set from AstroPlan's
  `popularity.json`, not the full ~13,800-object catalog.
- **Fixed default filters** — mirrors the app's Tonight defaults: 30° minimum
  altitude during darkness, no magnitude cap. No favorites, no imaging log,
  no per-user personalization — those are per-device SwiftData state in the
  app with no web equivalent, and out of scope here by design.
- **Location** — browser Geolocation API, same UX role as CoreLocation in
  the app (permission prompt, no server round-trip).

## Decisions (as of 2026-07-24)

- **Astronomy math**: use an existing JS astronomy library rather than
  porting `AstroPlan/Services/AltAzCalculator.swift` line-for-line. Faster to
  ship; the tradeoff is this site won't be bit-for-bit identical to the
  app's twilight/transit algorithm. Library choice: TBD.
- **Separate repo from AstroPlan**: different toolchain (JS vs. Swift/
  Python) and deploy lifecycle (GitHub Pages vs. Xcode archive/App Store).
  Sibling directory to `AstroPlan` and `astroplan-docs` on disk.

## Open items

- [ ] Pick the JS astronomy library
- [ ] Data sync script — copy the relevant slice of `AstroPlan/popularity.json`
      (name, common name, RA/Dec) into this repo, in the spirit of
      AstroPlan's existing `Tools/` scripts. Needs re-running whenever the
      app's popular list changes (see AstroPlan's `Tools/make_popularity.py`).
      No such script exists yet.
- [ ] Page layout — port of `AstroPlan/Views/TonightView.swift`'s structure:
      sun/moon summary, ranked target list (by transit time), each row
      showing peak altitude and transit time tonight.
- [ ] GitHub Pages deploy config (serve from `main` root, or `/docs`, or a
      build step — TBD once the JS tooling is picked)

## Source of truth

The AstroPlan app repo remains authoritative for the actual popular-target
list and common names (`AstroPlan/popularity.json`,
`AstroPlan/Models/CatalogLists.swift`). This site is a read-only mirror of a
slice of that data, not an independent editorial source.
