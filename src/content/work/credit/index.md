---
links:
  - { label: "A piece of plastic, March 2024", url: "https://vyas.garden/writing/2024-03-14-a-piece-of-plastic/", kind: post }
  - { label: "The curious case of CRED, March 2024", url: "https://vyas.garden/writing/2024-03-18-curious-case-of-cred/", kind: post }
updated: 2026-11-24
---

<p class="thesis">A credit score counts what happened. Katha reads when it happened, and what came after.</p>

Two people can have the same number of missed payments. For one, the misses are behind them and they're recovering. For the other, they're spreading and getting worse. Count them, and both get the same score. Read them in order, and they're two different stories, and two different answers to the only question a lender has: will this person pay?

Today's scores count. Katha reads.

## Built for the few

In March 2024 I wrote that in India, "just 3% of people" possess a formal credit card, and that to use one of the best-known credit apps you need a CIBIL score above 750: the top 1%. Credit in India was built for the few who already have it. Most files are thin, and a thin file is a story nobody has read. People with no file at all, Katha can't read yet.

Katha is my project, Hindi for story. finbud backs it with data and a team, and Shalaj builds it with me. The line this page opens with is his, and so are the two borrowers under it, from the brief that started it.

## What we believe

**Thin files are the population, not the tail.** Most people in India have short credit histories. A model that only works on long histories misses the people it is for. So Katha only passes if its gain on thin files is bigger than its gain on thick ones.

**Order carries what totals erase.** When a missed payment happened, what came before it and what came after: that is where the story is, and where a count goes blind.

**India should have a score of its own.** The rest of the world already runs models like this. What's undone is the Indian version, and the hard part is the unglamorous work nobody wants to do. Katha should be able to calibrate the CIBIL or Experian score, or stand in its place. Today it gives answers with a number. The future is very, very clear.

**Fair to both sides of the loan.** The borrower should be read fairly, and the lender should be able to say yes to more people at the same risk. Neither is worth much without the other. Katha never reads a name, a pincode, an employer, a lender's name, or anything protected.

**A probability has to mean what it says.** If Katha says 8%, it has to mean 8%, because the lender multiplies that number by rupees. Every result shows how well-calibrated it is beside how well it ranks, and where the old way was better calibrated, we say so.

**A score meant to stand beside the bureau's can't lean on it.** If the bureau score is one of its inputs, it can quietly borrow the bureau's judgement. So Katha is measured with it and without it.

**A lender loses money, not accuracy.** It loses principal on loans that go bad, and margin on good loans it turned away. So Katha should finally be judged in rupees, not in ranking scores.

## How we hold ourselves to it

Most reported gains in credit modelling are leaks: a model that beats the incumbent has, more often than not, seen the answer somewhere. So every experiment is written down before it runs. Results count only on later months, and on people the model has never seen. Every look at a test window goes in a ledger. And the test for the whole idea, which Shalaj wrote into that first brief, is fixed in advance: if reading in order doesn't hold up on later, unseen data, we publish that, and stop.

## What it does

For a lender: one person's history, and several questions answered at once. Will this loan go 90 days late? Will this person take a loan? Each answer reads like "of 100 people like this, about this many do", next to the bureau score and today's best conventional model, on months and people neither has seen. It shows which events moved the answer, what it would have said on any past date, and what would change if one fact changed.

For the person being scored: a history read as a story, not a tally, and nothing about who they are beyond what they did with credit.

## What it has taught us so far

- **We think order beats totals. We haven't proved it.** On synthetic borrowers, Katha trailed at 3,000 and 10,000 people, drew level at 30,000, and led at one lakh. Then we found the lead came mostly from the bureau score. With equal inputs it was +0.005 without the score and −0.005 with it: close to nothing, either way.
- **On a first small panel of real histories, neither gain is proven yet.** The real-data work stays inside finbud.
- **Our own founding documents had numbers that didn't hold.** Three facts from published work failed when we checked them, so they're gone.
- **As far as we could find, nobody has published this on Indian bureau data.** That is either the opportunity or the warning, and the paper will say which.

## Where it is going

**The paper, by the end of the year.** One question: does reading a credit history in order add anything to today's best models? If the answer is no, the paper gets shorter, and still gets written.

**A Katha score.** One number per person, checked against the CIBIL and Experian scores, built to calibrate them or to stand in their place.

**Every lending decision.** Not just whether to lend: decisions about the person, the lender, the issuer and the type of product. Predict everything about a loan, its future and its decisions. Katha will do it all.

**Judged in rupees.** In the end, by the money a lender keeps and the good borrowers it no longer turns away.

We aim for the moon, and to change how lending works in India. I really feel there is something novel here, in the thinking of it and in the making of it.

<p class="sign">Abhishek Vyas · 24 November 2026</p>
