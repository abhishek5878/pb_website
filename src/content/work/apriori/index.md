---
links:
  - { label: "apriori.work", url: "https://apriori.work", kind: page }
  - { label: "The PiSAR paper on arXiv", url: "https://arxiv.org/abs/2605.29400", kind: paper }
examples:
  - { src: ./shot-1.png, caption: "The paper on arXiv: fine-tuned models against frontier models, on the same 661 held-out rows.", url: "https://arxiv.org/abs/2605.29400" }
stopped: "Paused after July 2026. In August the company turned to voice, and apriori.work became Priya's site."
updated: 2026-11-24
---

<p class="thesis">Building products has become dramatically faster. Figuring out what to build is still painfully slow.</p>

Still true.

So we built a product that sends thousands of synthetic users through your product flow. Each one thinks, reacts, hesitates and decides, and the point is to get the WHY behind every drop-off. Product testing before the product has anyone to test it on.

I built it at [Apriori](https://apriori.work) with Rahul and Yash, my +1 seniors, in the first half of 2026. So much fun, solving a very difficult problem statement. It's just a research paper at the end, but FUN.

## The part I'd show anyone

We wrote a paper. The question was whether a small model, trained on a corpus of screen-by-screen behaviour built from public app reviews and shopper traces, could beat the biggest models used as they come. On the same 661 held-out rows:

| Model | Semantic similarity, out of 1 |
|---|--:|
| A fine-tuned Qwen3-VL-8B | 0.783 |
| GPT-5.5, as it comes | 0.482 |
| Claude Opus 4.7, as it comes | 0.459 |
| The same recipe on a different, larger model | 0.441 |

The small one won, and the same recipe on a different, larger model didn't transfer. I still kept it away from the product's features, and one feature, the attention heatmap, was dropped as the price.

## Two lines I kept

The April version was built on this: we don't report which variant won, we build the variant that should exist. People differ, so no single tested variant is right for the whole audience.

And a rule about data, earned the hard way, after an agent changed six evaluation cases on the strength of search snippets, two of them with the wrong author: less data with verified provenance is strictly better than more data with synthetic content.
