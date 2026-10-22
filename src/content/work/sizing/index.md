---
updated: 2026-10-23
---

Every partner conversation started the same way: how many people in your data match this audience, and if it's enough, can we have them as a list? For two years the answer was a one-off Python script per partner, with no audit trail and no way to reproduce it six months later.

So I built a workbench, at the fintech company I work with part-time. You write a small YAML spec: who's in the universe, a fixed date to count from, filters from a registered vocabulary. It compiles to the same SQL every time and returns a count. Counts are free. A list of real people needs a human click and a line in the audit log. There's no free SQL, on purpose. When the pressure comes to just give them SQL, the answer is to extend the vocabulary, not the access.

The spec is the asset; the script is commodity. A new client conversation shouldn't need new engineering, just a new spec. Ten engagements were already written as specs when I handed it over in June 2026. It's live inside the company, behind a login.
