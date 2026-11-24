---
links:
  - { label: "fewwords on GitHub", url: "https://github.com/abhishek5878/fewwords", kind: repo }
  - { label: "fewword-ai.fly.dev", url: "https://fewword-ai.fly.dev", kind: demo }
  - { label: "The benchmarks, every trace", url: "https://fewword-ai.fly.dev/benchmarks", kind: page }
examples:
  - { src: ./shot-1.png, caption: "The public site, still up.", url: "https://fewword-ai.fly.dev" }
  - { src: ./shot-2.png, caption: "The benchmarks page: every number, every trace, every reason.", url: "https://fewword-ai.fly.dev/benchmarks" }
updated: 2026-11-24
---

<p class="thesis">Stop your AI agent from doing something stupid.</p>

I hit this myself. Kairos once produced a confident, well-sourced investment thesis on the wrong company: a handle resolved to a store abroad with the same name as the Indian brand I was tracking. Every tool fired correctly, on the wrong founders, and the AI judge called it "coherent". I caught it only because I knew the founders. The fix was one line. That check didn't belong in my repo. It belonged to everyone.

## What I believed

**"Helpful" isn't a contract.** Check an agent against rules you wrote, not against another model's opinion. An AI grading an AI is two interns grading each other's homework.

**The judge wasn't wrong. It saw the wrong thing.** A run can look polite at every step and still be broken as a sequence. So the sequence is the unit: search before reply, validate before submit, never the dangerous call.

**Stop it before it runs.** Detection without prevention is a smoke detector that gets muted in a week.

**Same input, same verdict, forever.** No model in the loop, so the answer never changes its mind, and it comes back in a fraction of a millisecond. Why waste time say lot word, when few word do trick.

## What it taught me

- **Rules beat the judge where rules apply.** On my own audit of 300 agent runs, fewwords agreed with an independent policy audit 80–82% of the time. A leading model acting as judge managed 54–62%.
- **And rules only reach so far.** It covers about a quarter of the violation patterns, and misses more on the conditional, fuzzy ones. I published both numbers.
- **I dated my own moat.** My honest horizon for this being useful: 18 to 24 months.
- **AI makes you faster only if you've already decided what "good" looks like.** Clarity produces velocity. Velocity alone produces noise.

Ten days, 139 commits, and a public release in April 2026. The benchmarks are still up, every trace and every reason.

<p class="sign">Abhishek Vyas · 24 November 2026</p>
