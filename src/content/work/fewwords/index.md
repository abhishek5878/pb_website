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

I hit this myself. Kairos once produced a confident, well-sourced investment thesis on the wrong company. A handle had resolved to a store abroad with the same name as the Indian brand I was tracking. Every tool fired correctly, on the wrong founders, and the AI judge reading the result called it "coherent".

The judge wasn't wrong. It evaluated what it saw. It saw the wrong thing. I caught it only because I happened to know the founders.

The fix was one line: check that the company you resolved is the company you were asked about. That check didn't belong in my repo. It belonged to everyone.

So fewwords checks what an agent did, or is about to do, against rules you write yourself:

- never call drop_database
- search before reply
- validate before submit

No AI grading the AI, because that's two interns grading each other's homework. Same input, same verdict, every time, in a fraction of a millisecond. And it runs before the action, because detection without prevention is a smoke detector that gets muted in a week.

Why waste time say lot word, when few word do trick. (Kevin, The Office.)

## What the numbers said

On my own audit of 300 agent runs, fewwords agreed with an independent policy audit 80–82% of the time. A leading model acting as judge managed 54–62%.

It also only covers about a quarter of the ways an agent can break a policy, and it misses more on the conditional, fuzzy ones. I published both numbers, and I dated my own moat: my honest horizon for this being useful is 18 to 24 months.

Ten days, 139 commits, a public release in April 2026. What I took from it: AI makes you faster only if you've already decided what "good" looks like.

<p class="sign">Abhishek Vyas · 24 November 2026</p>
