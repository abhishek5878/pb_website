---
links:
  - { label: "indiastox.vercel.app", url: "https://indiastox.vercel.app", kind: demo }
  - { label: "indiastox_agent on GitHub", url: "https://github.com/abhishek5878/indiastox_agent", kind: repo }
examples:
  - { src: ./shot-1.png, caption: "The live console, running on synthetic personas. Every number on it came back from a tool call.", url: "https://indiastox.vercel.app" }
updated: 2026-10-22
---

A brief asked for a working miniature of an analytics platform in 48 hours, on synthetic data I'd generate myself, for a product where every user action is a market call, bull or bear. I gave it ten days in May 2026, and the demo is still live.

The bet: when every action is also a scored market bet, the analytics layer has to be a place agents act through, not just a place humans look at. So every number on the console comes back from a tool call: the same tool the growth agent calls, the same one the critic checks proposals with, the same one the support agent sends nudges through. Dashboards are a degraded read of it, not the product.

Inside: a week of synthetic traffic for about 2,000 personas across five messy sources, identity matching that returns a confidence instead of a yes or no, twelve versioned metrics that each carry their sample size, a critic agent with five confounder checks, and an eval that fails the build if the agent scores too well.

Before any product code, I set up the scaffold. That was the assignment I gave myself.
