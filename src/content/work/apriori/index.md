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

I built it at [Apriori](https://apriori.work) with Rahul Bissa and Yash Jain, in the first half of 2026. Synthetic Indian personas walked an onboarding flow screen by screen, each one looking at the screen as that person, and the output said who dropped off and why.

## The part I'd show anyone

We wrote a paper. The question was whether a small model, trained on real screen-level behaviour, could beat the biggest models used as they come. On the same 661 held-out rows:

| Model | Score, out of 1 |
|---|--:|
| A fine-tuned Qwen3-VL-8B | 0.783 |
| GPT-5.5, as it comes | 0.482 |
| Claude Opus 4.7, as it comes | 0.459 |
| The same recipe on a larger model | 0.441 |

The small one won, and making it bigger made it worse. I still kept it away from the product's features, and one feature, the attention heatmap, was dropped as the price.

## Two lines I kept

The April version was built on this: we don't report which variant won, we build the variant that should exist. People differ, so no single tested variant is right for the whole audience.

And a rule about data, earned the hard way, after an agent changed six evaluation cases on the strength of search snippets, two of them with the wrong author: less data with verified provenance is strictly better than more data with synthetic content.

<p class="sign">Abhishek Vyas · 24 November 2026</p>
