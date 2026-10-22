---
updated: 2026-10-23
---

This quarter I'm working on a new credit score for lending in India. It's a project inside a public fintech company I've worked with part-time since April 2026, along with Shalaj. The working name is Katha, Hindi for story.

The idea is to read a person's credit history in order, the way it happened, instead of as a pile of totals. Two people can have the same number of missed payments. For one, the misses are behind them and they're recovering. For the other, they're spreading and getting worse. Count them and both look the same. Read them in order and they're two different stories.

So it pays attention to direction and timing: whether things are getting better or worse, how someone has been borrowing lately, how their past loans ended. Later, with the person's consent, bank statements too.

A score is only useful if you can trust the number it gives you. So this one gets judged on money, on months it has never seen, not on a number that flatters it.

Honestly, the model is the smallest part. Most of the work is the data: rebuilding exactly what a lender could have known on the day it decided, so the model never sees the future. Anyone can train a model. Almost nobody does the schleps.

Where it is: early. My part so far is the build spec, written for the people who will build it, not the people who will buy it. There's no model yet. The first goal is one honest number against today's scores. It will probably lose at first. That's fine. If reading in order turns out not to matter, the idea is wrong, and we'll say so.
