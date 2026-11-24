---
kind: essay
date: 2026-11-24
title: The gap between claim and caller
subtitle: What three months of measuring a voice agent taught me about measuring anything.
lane: build
pull:
  - "The gap between claim and caller is the product."
  - "Rules lost moments and won calls."
---

Voice AI vendors will tell you how fast their agents answer. They are measuring from their own server. Your caller is on a phone line, and hears something else.

The gap between the two is not a rounding error. It is the product.

I wrote that down in August 2026, at the start of the build. For the next three months I built two things for Apriori: an instrument that measures what a caller actually hears, and [Priya](/work/priya/), a Hinglish voice agent that called Indian buyers before their cash-on-delivery parcels went back. I held the second to the first. This is what that taught me.

## The log and the line

The first real test of the instrument was on a system I didn't build. DSTC2 is a public set of real calls to a restaurant-information bot, with the bot's own logs beside the recordings. Over 383 calls, the bot's log explained 64.4% of what its callers waited. It logged 586 milliseconds at the median. The callers waited 910.

Nobody lied. A system's log is honest about the part it can see. It just can't see the caller.

Then I pointed the same habit at my own agent. On the first build, I traced where 2.7 seconds went. The vendors' share was 40%. The rest was ours: waiting to be sure he had finished, collecting a sentence before speaking, the network. On phone calls in October, the median wait was 2.76 seconds. When I finally read the voice engine's source, 1.17 seconds of every reply turned out to be a hard-coded wait, a timer, sitting in a file nobody had opened.

## Silence is speech

People reply to each other in about 200 milliseconds. A gap past a second means something: trouble, a refusal, *she didn't understand*.

Our pause was 2.8 seconds. Every caller heard it as confusion, and behaved accordingly. We spent a week fixing the prompt for behaviour the silence caused.

So latency isn't a performance metric. It's part of what she says. And it rarely sits where you expect. A bench of fifteen models found exactly one change that moved what a caller feels: a model hosted in India, answering in 0.37 seconds against 1.03. Geography beat model choice.

## The bench is polite

The most dangerous number in the project was 9.2.

That was the score typed conversations gave her in late September, on a judge I trusted, with a confidence interval I'd computed. The same week, three of my own test calls on a real phone line scored 6, 4 and 3.

It kept happening, in new shapes. A build that beat live on 74 simulated buyers lasted 24 seconds on its first real call, asking one question five times while the caller talked over her. A group of buyers picked because they passed dropped from 9.00 to 7.50 when I simply ran them again: regression to the mean, bought and paid for. Twice in one day a 20-call result looked like a finding, and twice the 60-call run reversed it. And in the last week, a build that passed 106 of 124 known faults caught 1 of 10 it hadn't seen.

A bench is a conversation with yourself. It is polite. Write the pass bar down before the run, run it on calls the builder hasn't read, and treat twenty calls as a smoke.

## Refuse what you can't measure

The instrument's best feature was what it wouldn't say.

On a recording with five real overlaps, a little channel bleed, the kind most engineers would call clean, made a detector report 150. Two independent speech detectors once agreed on a "turn" inside hold music, which would have reported a 15.9-second wait as zero. The best-scoring setting I tested shifted every turn boundary in the direction that made waits look shorter, and I threw it out.

A number printed beside a caveat still gets read, quoted and compared. So the instrument withholds it, and prints why. Most measurement tools answer every question they're asked. This one didn't, and that was the point.

## Let the model read, and code speak

On the phone, the model kept inventing. It filled in an order id it was never given, on every single call, and the test harness, checking only that a write had happened, scored 11 of 12 calls as recovered. The honest number was 9.

So the design turned around. The model reads the turn and returns one intent. Code picks her words from the order's facts, takes the tool arguments from what the buyer actually said, and refuses to let a call drift: a day asked twice becomes an offer, an offer refused twice becomes a hand-off. State lives in the replies of the tools, because that is where it lands at the moment of decision.

It wasn't free. In November I replayed every moment where a person had heard her make a mistake. The live brain avoided 26% of them. The same model with the rules removed avoided 44%. Then I ran both on whole calls: live passed 50 of 60, and rules-off 44, 41 and 41 on three models.

Rules lost moments and won calls. I'd keep the rules, and keep measuring what they cost.

## The ear decides

Two AI judges tracked a human listener at a rank correlation of 0.23 to 0.25. That is almost nothing. A model can tell you whether the right thing got written. Whether a call *felt* right is for a person, and a teammate listening to about twenty calls a day, marking every mistake, became the ground truth everything else was checked against.

## What I'd tell the next person

1. Measure what the caller heard, not what your server logged.
2. Percentiles, never averages. The slow calls are the product.
3. Write the bar down before the run.
4. Twenty calls is a smoke.
5. Refuse a number you can't stand behind, and say why.
6. Let the model understand. Let code write.
7. A person's ear decides "better".
8. Build the instrument before the thing it measures.

I stopped working on Priya in November 2026. The full record, from the system design and the 120-odd experiments to everything I got wrong, is on [her page](/work/priya/).

The gap between claim and caller is the product. It still is.

*Abhishek Vyas, 24 November 2026*
