---
links:
  - { label: "apriori.work", url: "https://apriori.work", kind: live }
  - { label: "The PiSAR paper on arXiv", url: "https://arxiv.org/abs/2605.29400", kind: paper }
examples:
  - { src: ./shot-1.png, caption: "The paper on arXiv: fine-tuned models against frontier models, on the same 661 held-out rows.", url: "https://arxiv.org/abs/2605.29400" }
stopped: "Paused after July 2026. In August the company turned to voice, and apriori.work became Priya's site."
updated: 2026-11-24
---

<p class="thesis">You should be able to watch your users get confused before you have any users.</p>

Product testing before the product has anyone to test it on. You describe the audience instead of recruiting it, put a design in front of them, and watch where they get lost. Much cheaper than shipping and finding out.

I built it at [Apriori](https://apriori.work) with Rahul Bissa and Yash Jain, in the first half of 2026.

## What we believed

**People differ, so averages lie.** No single tested variant is right for the whole audience. Other tools show one blob of clicks; the point was to know *who* each person was, and where each of them fell off.

**A test that only says which variant won has stopped one step short.** The April version was built on one line: we don't report which variant won, we build the variant that should exist.

**A small model trained on the right data beats a large general one at a narrow job.** That one we showed, once, on one task.

**Less data you can trace beats more data you can't.** Less data with verified provenance is strictly better than more data with synthetic content.

## What it taught us

- **The paper.** On the same 661 held-out rows of screen-level behaviour, a fine-tuned Qwen3-VL-8B scored 0.783 out of 1. Claude Opus 4.7 and GPT-5.5, used as they come, scored 0.459 and 0.482.
- **Bigger did not help.** The same recipe on a larger model scored 0.441.
- **I kept our best model away from the product's features.** One feature, the attention heatmap, was dropped as the price.
- **The provenance rule was earned.** An agent once changed six evaluation cases on the strength of search snippets, two with the wrong author. After that, nothing entered the data without a source.

<p class="sign">Abhishek Vyas · 24 November 2026</p>
