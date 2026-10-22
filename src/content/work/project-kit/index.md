---
updated: 2026-10-22
---

How every new thing starts. It's my recipe for starting a project with Claude Code as a compounding engineering partner, not a glorified autocomplete.

You drop an idea in, and it comes out distilled, questioned, validated, specified, built, shipped and measured. Nine stages, from intake to learn, each with one exit file and one gate only I can approve. "Looks fine" is not a yes, and an agent never approves its own gate. Files are the handoff, not memory, so any fresh session can pick up where the last one stopped. And the guardrails are code, not hopes: one hook stops agents writing into my original notes, another blocks force-pushes and deletes.

Underneath are a few rules from my own setup doc:

- Context is state. Every hard-earned lesson that isn't written back into the setup is a tax you pay in future sessions.
- Discipline over cleverness.
- Adversarial framing by default, because the model is trained to agree with you.

I built it in a day, 18 September 2026, and tested it the same day on a throwaway project, every stage in its own fresh session. That run caught seven defects, and they were all in the handoffs between stages, not inside them. Signal Spark was the first real thing built with it.

A lot of it is borrowed, and the README says so: Karpathy's guidelines, Matt Pocock's skills, obra's superpowers, Addy Osmani's agent skills. The setup doc is mine. The kit is the third version of a discipline I'd been using since May, first for life_agent, then Rocky.

There's no public copy.
