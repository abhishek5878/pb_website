---
links:
  - { label: "apriori.work", url: "https://apriori.work", kind: live }
  - { label: "How it works, stage by stage", url: "https://apriori.work/technology", kind: page }
  - { label: "How we prove it", url: "https://apriori.work/proof", kind: page }
examples:
  - { src: ./shot-1.png, caption: "apriori.work, the site for Priya.", url: "https://apriori.work" }
  - { src: ./shot-2.png, caption: "The six courier reason codes Priya handles, and what each call does about it.", url: "https://apriori.work" }
updated: 2026-10-23
---

When a cash-on-delivery parcel can't be delivered, the courier hands the brand a reason code and 24 to 48 hours to answer it. A reason code is a question nobody answers, so the parcel goes back. Priya calls the buyer in Hinglish, finds out what actually went wrong, fixes it on the line, and writes the instruction back to the courier before the window closes. She has a second job too: a call twenty minutes after a cash order comes in, to check the address and that the buyer means it.

Six codes cover almost every failure: not home, premises closed, incomplete address, cash not ready, a fake delivery attempt, a refusal. Each has its own branch, and each ends in a tool call. A resolution that dies in a dashboard is worth zero. The call hasn't succeeded until a tool fires.

The rules I built her on:

- Latency is the product. Gate on the slow calls (P95), never the average.
- Every reason code terminates: a write-back or a logged escalation, nothing else.
- A tool failure is never narrated as success.
- A demo made green by lowering the bar is a demo that fails live.

The first live demo was on 25 August 2026, and the demo was the deadline, not a milestone. Since then she gets better by a loop, not by vibes. A few things the loop taught me:

- Humans reply in about 200 ms, and a gap past a second means trouble. Our 2.8 second pause was telling every caller "she didn't understand", and we spent a week fixing the prompt for behaviour the silence caused.
- In a 252-call test with synthetic buyers, roughly one in eight seconds of her speaking time was a mid-sentence stall. The voice changed after that.
- Once I found every test had been running one branch. Measured across all the branches, the test calls passed 48%, not the 89% I believed.
- A call costs Rs 3–8 all-in on the demo build, against a cash order worth Rs 1,000–3,000.

She's live now, on real calls. Most days it's the same loop: read the day's calls, fix, check on a test engine, ship, keep the rollback ready. Priya is the product of Apriori, a company of my senior [Rahul Bissa](https://www.linkedin.com/in/rahul-bissa-741006186/). I build the agent itself; the platform around her and the console are my teammates' work.
