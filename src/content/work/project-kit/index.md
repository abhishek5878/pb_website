---
updated: 2026-11-24
---

<p class="thesis">A compounding engineering partner, not a glorified autocomplete.</p>

That line is from the setup doc I wrote in April 2026, for building with Claude Code. In September I turned it into a kit, and told the session building it: understand, this will be the recipe for all the future starts of projects. project-kit is how every new thing I make begins.

## What we believe

**Context is state.** An agent starts every session remembering nothing. So the project has to remember: files are the hand-off, not memory, and every hard-earned lesson that isn't written back is a tax paid again in the next session.

**A rule an agent can skip is a hope.** Anything I mean becomes a hook, a ratchet or a test. In one repo, 560 lessons had been written down and 374 had nothing enforcing them. Now tests can be added but never weakened, and a lesson that doesn't name its check is refused.

**The model agrees with you, so build the disagreement in.** Before anything is built, independent reviewers argue from different sides, then a blind reviewer reads what they missed. On Signal Spark they were unanimous against shipping it as shaped, and the shape changed. On Katha they advised narrowing it, and I chose to go as shaped, with the risks written down. Either way, I decide, on the record.

**Delegate the work, keep the yes.** Every stage has one file to read and one gate only I can approve. "Looks fine" is not a yes. The agent that builds is never the one that judges. Facts go to a researcher; I only get decisions.

**Measure the method, not just the work.** The kit gets tested like anything else built with it, and kept only for what it can show.

**Taste is refusing to settle, and it is usually subtraction.** Never claim a check you didn't run. Deleting is often the most tasteful move.

## What it does for a builder

You drop the documents in one folder. A one-pager comes back, with every line cited to your own pages, plus the questions that block a build and the bets that could kill it. You are grilled until nothing blocking is left and the not-doing list is written. The riskiest bets are tested against the world, and the go, pivot or park recommendation reports its own disagreement. You approve the smallest version worth shipping. Then tickets are built one at a time, test first, each by a fresh agent and checked by a different one. Any session can stop anywhere, because the next one starts from the files.

## What it taught me

- **Gaps live in the hand-offs.** The first end-to-end run, on a throwaway project with every stage in its own fresh session, found seven defects. All seven were between stages, not inside them.
- **I tested my own method, and it came back half-proven.** Same failing test suite, the kit against no kit, two runs each. The code came out fixed and the tests intact either way: against a strong model, the guard rails changed nothing, so they are insurance. But lessons that named a real check: 2 of 2 with the kit, 0 of 2 without, for about 13% more cost per run. It didn't change the code. It changed what got learned.
- **"Strongest model, always" had an exception.** Checking whether the work passes moved to a smaller model in November, after measuring it on a live project. It read one count wrong, and a rule fixed that: quote the tool's own summary line.
- **The last stages are still unproven.** No real project has gone past building yet. Shipping and learning have only run on the throwaway.

## Where it has run

Signal Spark was the first real thing built with it, the same day as the kit. Then Katha, from its first day. Priya's repo took its guard rails in November, and Kairos borrows its shapes for specs, tickets and checks. This site only uses the taste pass.

## Borrowed, and credited

A lot of it isn't mine, and I'd rather say so. Andrej Karpathy's [coding guidelines](https://github.com/forrestchang/andrej-karpathy-skills), Matt Pocock's [skills](https://github.com/mattpocock/skills), obra's [superpowers](https://github.com/obra/superpowers) and Addy Osmani's [agent skills](https://github.com/addyosmani/agent-skills) are all in it. "Delegate, don't dictate" is the title of a deck I was given, written after Thorsten Ball's "How I work with agents". The definition of taste I use is Ojasvika's essay "Taste in 20 minutes"; "tasteslop" is from Nemesis Memos. The setup doc, and the way it all fits together, are mine.

The line I keep coming back to, from that April setup doc: you are not building a tool, you are building a compounding operating system for how you ship software.

<p class="sign">Abhishek Vyas · 24 November 2026</p>
