---
updated: 2026-10-22
---

Warehouses in India, from satellite images. Client work, for a warehouse marketplace. A lot of India's storage is informal and has no online presence at all, so the only way to find it is from above.

The pipeline ran one industrial zone at a time. Grid maths and OpenStreetMap first, with no model involved, because none was needed. Then a vision model over satellite tiles, flagging candidate sheds. Then enrichment from public listings and registries, deduplication within 80 metres, a quality gate, and last, a guess at the bookable sub-units inside each warehouse. Empty tiles got cached too, so a re-run never paid twice to look at nothing.

I don't have counts or results to show, and the code isn't on my machine anymore.
