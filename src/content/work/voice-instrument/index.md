---
summary: "One signed report of what callers actually heard on a voice AI line."
links:
  - { label: "The method, published in full", url: "https://apriori.work/methodology", kind: page }
  - { label: "apriori.work/proof", url: "https://apriori.work/proof", kind: page }
examples:
  - { src: ./shot-1.png, caption: "From the published method: each threshold, its value, and why.", url: "https://apriori.work/methodology" }
  - { src: ./shot-2.png, caption: "The proof page today: we publish the exam, not the grade.", url: "https://apriori.work/proof" }
stopped: "It stopped being a product and became the proof layer for Priya."
updated: 2026-10-22
---

Before we built a voice agent, we built the thing that measures one. Give it a folder of real call recordings and it hands back one signed report of what callers actually experienced: how long they waited for the agent to speak, dead air, interruptions, audio quality, how much Hindi and English got mixed.

Vendors measure latency from their own server. This measures what the caller heard, from the recording. Percentiles only, never averages. Anything it can't measure reliably, it says so, with a reason, instead of guessing. Most measurement tools answer every question they are asked. This one does not, and that is the product.

The first version took five days in August 2026. Then I ran it on 383 real human-to-bot calls from a public dataset (DSTC2): the system's own log explained 64.4% of what the caller actually waited.

Then we started running a voice agent ourselves, and the instrument became the proof behind it.
