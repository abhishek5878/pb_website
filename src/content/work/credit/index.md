---
updated: 2026-10-22
---

This quarter I'm working on a system in design for lending in India: a score apart from the current CIBIL and Experian score. It's early. There's no model yet, and nothing about it is public.

It sits on work I've done at finbud this year. A lot of that isn't public either, and not in the form it was built. Some of what's underneath:

- A way to freeze a borrower's state at a given month, then watch what happens over the next 3, 6 and 12 months, with zero lookahead. The check that it doesn't cheat: a feature that can't predict anything scores an AUC of about 0.49, while real ones reach 0.7 to 0.86.
- A loop that takes a plain-English hunch about borrowers, turns it into a signal, backtests it, and says honestly whether it's new or already covered. Most hunches come back already covered. That's the library being thorough.
- A note I wrote early on: pull deep, not just wide. Dated records for every loan and every enquiry, not only the aggregates, so the same data could later feed a model that reads a credit history as a trajectory.

That last line is where the score comes from. More here once there's something to show.
