---
links:
  - { label: "fewwords on GitHub", url: "https://github.com/abhishek5878/fewwords", kind: repo }
  - { label: "fewword-ai.fly.dev", url: "https://fewword-ai.fly.dev", kind: demo }
  - { label: "The benchmarks, every trace", url: "https://fewword-ai.fly.dev/benchmarks", kind: page }
examples:
  - { src: ./shot-1.png, caption: "The public site, still up.", url: "https://fewword-ai.fly.dev" }
  - { src: ./shot-2.png, caption: "The benchmarks page: every number, every trace, every reason.", url: "https://fewword-ai.fly.dev/benchmarks" }
updated: 2026-10-23
---

Stop your AI agent from doing something stupid.

I hit this myself. Kairos once produced a confident, well-sourced investment thesis on the wrong company: a LinkedIn handle resolved to a US store with the same name as the Indian brand I was tracking. Every tool fired correctly, on the wrong founders, and the LLM judge called it "coherent". I caught it only because I knew the founders. The fix was one line, an assert that the domain matched. That postcondition didn't belong in my repo. It belonged as a primitive.

So fewwords checks what an agent did, or is about to do, against rules you wrote in YAML: never call drop_database, search before reply, validate before submit. No AI grading the AI. Same input, same verdict, forever, in about 0.14 ms. Why waste time say lot word, when few word do trick.

On my own τ-bench audit it agreed with an independent policy audit 80–82% of the time, against 54–62% for Claude Sonnet 4.6. It covers about a quarter of the violation patterns there. Ten days, 139 commits, then a public release in April 2026.
