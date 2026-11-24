---
summary: "A Hinglish voice agent that called the buyer before a cash-on-delivery parcel went back, and the instrument that measured her."
links:
  - { label: "apriori.work", url: "https://apriori.work", kind: page }
  - { label: "How it works, stage by stage", url: "https://apriori.work/technology", kind: page }
  - { label: "How we prove it", url: "https://apriori.work/proof", kind: page }
  - { label: "The instrument's method, as published in August", url: "https://apriori.work/methodology", kind: page }
examples:
  - { src: ./shot-1.png, caption: "apriori.work as it was in October 2026, when it was Priya's site.", url: "https://apriori.work" }
  - { src: ./shot-2.png, caption: "The six courier reason codes Priya handled, as the site showed them in October 2026.", url: "https://apriori.work" }
  - { src: ./shot-3.png, caption: "From the instrument's published method, October 2026: each threshold, its value, and why.", url: "https://apriori.work/methodology" }
  - { src: ./shot-4.png, caption: "The proof page in October 2026: we publish the exam, not the grade.", url: "https://apriori.work/proof" }
stopped: "Stopped in November 2026."
updated: 2026-11-24
---

<p class="thesis">The gap between claim and caller is the product.</p>

I wrote that line in August 2026, in the spec for an instrument that measures voice AI, and it became the rule for the three months that followed. Vendors measure their agents from their own servers. A buyer on an 8 kHz phone line hears something else, and the difference is where calls go wrong. This page is that gap, measured: the instrument that measured it, and Priya, the voice agent I held to it.

When a cash-on-delivery parcel can't be delivered, the courier hands the brand a reason code and 24 to 48 hours to answer it. A reason code is a question nobody answers, so the parcel goes back. Priya called the buyer in Hinglish, found out what actually went wrong, fixed it on the line, and wrote the instruction back to the courier before the window closed. She had a second job too: a call twenty minutes after a cash order came in, to check the address and that the buyer meant it.

It was one project in two halves, August to November 2026, for Apriori, a company of my senior [Rahul Bissa](https://www.linkedin.com/in/rahul-bissa-741006186/). The instrument and the agent were mine; the platform around her and the console were my teammates' work. Most of the code was written by Claude Code sessions I directed, under rules they were not allowed to edit.

<dl class="glance">
<div><dt>120+</dt><dd>experiments on record; about twenty are told on this page</dd></div>
<div><dt>39</dt><dd>ears, voices and brains wired to one phone call</dd></div>
<div><dt>64.4%</dt><dd>of a caller's wait that a real bot's own log admitted to</dd></div>
<div><dt>48%</dt><dd>not the 89% I believed, once every branch was scored</dd></div>
<div><dt>1 of 10</dt><dd>unseen faults caught by a build passing 106 of 124 known ones</dd></div>
</dl>

<nav class="contents" aria-label="On this page">
<ol>
<li><a href="#one-call">One call</a></li>
<li><a href="#the-rules-i-built-her-on">The rules I built her on</a></li>
<li><a href="#what-i-got-wrong">What I got wrong</a></li>
<li><a href="#three-months">Three months</a></li>
<li><a href="#first-the-instrument">First, the instrument</a></li>
<li><a href="#system-design">System design</a></li>
<li><a href="#the-wait">The wait</a></li>
<li><a href="#how-i-knew">How I knew</a></li>
<li><a href="#the-experiments">The experiments</a></li>
<li><a href="#small-wins">Small wins</a></li>
<li><a href="#built-with-agents-under-laws">Built with agents, under laws</a></li>
<li><a href="#what-set-the-ceiling">What set the ceiling</a></li>
<li><a href="#where-i-left-her">Where I left her</a></li>
<li><a href="#sources">Sources</a></li>
</ol>
</nav>

## One call

The not-at-home code, in her words from the live build. The buyer's name is made up and the brand is left out.

<ol class="call">
<li><p class="said" lang="hi">नमस्ते, मैं … से प्रिया बोल रही हूँ। क्या मेरी बात सौरभ जी से हो रही है?</p><p class="what">Recorded for him before the phone rang. Nothing about the order is said until he says it's him.</p></li>
<li><p class="said" lang="hi">कूरियर वाले ने बताया कि आप घर पे मौजूद नहीं थे। क्या आप घर पर नहीं थे सौरभ जी?</p><p class="what">The courier's claim is always reported, never stated as fact. If he says nobody came, she says sorry once and flags the rider.</p></li>
<li><p class="said" lang="hi">कोई बात नहीं जी। आपकी डिलीवरी दोबारा रखवा देती हूँ — किस दिन भिजवा दूँ?</p><p class="what">He says <span lang="hi">परसों</span>, the day after tomorrow. Code turns that into a date and books it. She says the day and the date only once the booking comes back accepted. Today is never booked.</p></li>
<li><p class="said" lang="hi">ऑर्डर सुबह से शाम में कभी भी आ सकता है — क्या आप पूरे दिन ऑर्डर लेने के लिए मौजूद रहेंगे?</p><p class="what">If not, someone else at home, or a neighbour.</p></li>
<li><p class="said" lang="hi">कोई भी कॉल आए तो प्लीज़ उठा लीजिएगा। थैंक यू जी, नमस्ते।</p><p class="what">A recap of the day, the place and the person, then goodbye. The hang-up goes on the next turn, because the engine never speaks text sent along with an end-call.</p></li>
</ol>

That was one code of six, and six cover almost every failure: not home, premises closed, incomplete address, cash not ready, a fake delivery attempt, a refusal. Each had its own branch, and each ended in a tool call. A call cost Rs 3–8 all-in on the demo build, against a cash order worth Rs 1,000–3,000.

## The rules I built her on

- Latency is the product. Gate on the slow calls (P95), never the average.
- Every reason code terminates: a write-back or a logged escalation, nothing else.
- A tool failure is never narrated as success.
- No payment detail or OTP by voice. A new address is taken one field at a time, each read back.
- Never guess a number you can't measure. Say it can't be measured, and why.
- A demo made green by lowering the bar is a demo that fails live.

## What I got wrong

The list I'd show anyone, each as the same two lines. Every one was caught by a measurement, not by luck.

<dl class="ledger bm">
<dt>A benchmark that timed an empty string</dt>
<dd><p><span class="k">Believed</span><span>a model that answered in about a quarter of a second.</span></p><p><span class="k">Measured</span><span>the benchmark waited for the first chunk containing "content", and every first chunk is <code>"content":""</code>. The model was reasoning, silently, for 10 seconds a turn. Withdrawn on the record.</span></p></dd>
<dt>Every branch</dt>
<dd><p><span class="k">Believed</span><span>the test calls passed about 89%.</span></p><p><span class="k">Measured</span><span>the harness had one reason code hard-coded, so seven of eight branches were never scored. Across all of them: 48%. On refusals she cancelled a buyer who said "send it", three times out of three.</span></p></dd>
<dt>The test that couldn't fail</dt>
<dd><p><span class="k">Believed</span><span>an evaluator no agent could loosen.</span></p><p><span class="k">Measured</span><span>for its first three days the instrument's golden suite could not fail at all: a blanket expected-failure marker, and a guard that missed shell edits. Both closed on 19 August.</span></p></dd>
<dt>The lag</dt>
<dd><p><span class="k">Believed</span><span>"the lag is the voice", from 18 calls.</span></p><p><span class="k">Measured</span><span>five days later, two real calls put it on the turn-end setting.</span></p></dd>
<dt>The pause</dt>
<dd><p><span class="k">Believed</span><span>a prompt problem. We spent a week on the prompt.</span></p><p><span class="k">Measured</span><span>humans reply in about 200 ms and read a gap past a second as trouble. Our 2.8 second pause was telling every caller "she didn't understand".</span></p></dd>
<dt>Bench and phone</dt>
<dd><p><span class="k">Believed</span><span>a build at 8.23 on 74 buyers, ahead of live.</span></p><p><span class="k">Measured</span><span>24 seconds on its first real call, one question asked five times under barge-in. Replaying real call logs became a standing pre-deploy step.</span></p></dd>
<dt>The buyers I'd fixed</dt>
<dd><p><span class="k">Believed</span><span>they were fixed.</span></p><p><span class="k">Measured</span><span>re-running a group picked for passing dropped it from 9.00 to 7.50. Regression to the mean, bought and paid for.</span></p></dd>
<dt>Twenty calls</dt>
<dd><p><span class="k">Believed</span><span>a route that matched live, 15 against 15.</span></p><p><span class="k">Measured</span><span>on 60 calls it didn't. Twice in one day a 20-call result was reversed by the 60-call run.</span></p></dd>
</dl>

## Three months

<figure class="diagram">
<svg viewBox="0 0 480 210" role="img" aria-labelledby="cw-title cw-desc" xmlns="http://www.w3.org/2000/svg">
<title id="cw-title">Commits per week, 17 August to 23 November 2026</title>
<desc id="cw-desc">2,911 commits across all branches. week of 17 Aug: 238; week of 24 Aug: 126; week of 31 Aug: 48; week of 7 Sep: 128; week of 14 Sep: 473; week of 21 Sep: 65; week of 28 Sep: 310; week of 5 Oct: 142; week of 12 Oct: 164; week of 19 Oct: 262; week of 26 Oct: 137; week of 2 Nov: 156; week of 9 Nov: 166; week of 16 Nov: 489; week of 23 Nov: 7.</desc>
<style>.cx-t{font-family:var(--sans);font-size:12.5px;fill:var(--ink)}
.cx-m{font-family:var(--mono);font-size:13px;fill:var(--ink-muted)}
.cx-rule{stroke:var(--hairline-strong);stroke-width:1}.cw-b{fill:var(--ink-muted)}.cw-k{fill:var(--ink)}</style>
<path class="cw-b" d="M3.0,176 V118.1 Q3.0,115.1 6.0,115.1 H26.0 Q29.0,115.1 29.0,118.1 V176 Z"><title>Week of 17 Aug: 238 commits</title></path>
<path class="cw-k" d="M35.0,176 V146.7 Q35.0,143.7 38.0,143.7 H58.0 Q61.0,143.7 61.0,146.7 V176 Z"><title>Week of 24 Aug: 126 commits</title></path>
<text class="cx-m" x="35.0" y="135.7" text-anchor="start">demo</text>
<path class="cw-b" d="M67.0,176 V166.7 Q67.0,163.7 70.0,163.7 H90.0 Q93.0,163.7 93.0,166.7 V176 Z"><title>Week of 31 Aug: 48 commits</title></path>
<path class="cw-b" d="M99.0,176 V146.2 Q99.0,143.2 102.0,143.2 H122.0 Q125.0,143.2 125.0,146.2 V176 Z"><title>Week of 7 Sep: 128 commits</title></path>
<path class="cw-k" d="M131.0,176 V57.9 Q131.0,54.9 134.0,54.9 H154.0 Q157.0,54.9 157.0,57.9 V176 Z"><title>Week of 14 Sep: 473 commits</title></path>
<text class="cx-m" x="144.0" y="46.9" text-anchor="middle">two builds at once · 473</text>
<path class="cw-b" d="M163.0,176 V162.4 Q163.0,159.4 166.0,159.4 H186.0 Q189.0,159.4 189.0,162.4 V176 Z"><title>Week of 21 Sep: 65 commits</title></path>
<path class="cw-b" d="M195.0,176 V99.6 Q195.0,96.6 198.0,96.6 H218.0 Q221.0,96.6 221.0,99.6 V176 Z"><title>Week of 28 Sep: 310 commits</title></path>
<path class="cw-b" d="M227.0,176 V142.6 Q227.0,139.6 230.0,139.6 H250.0 Q253.0,139.6 253.0,142.6 V176 Z"><title>Week of 5 Oct: 142 commits</title></path>
<path class="cw-b" d="M259.0,176 V137.0 Q259.0,134.0 262.0,134.0 H282.0 Q285.0,134.0 285.0,137.0 V176 Z"><title>Week of 12 Oct: 164 commits</title></path>
<path class="cw-b" d="M291.0,176 V111.9 Q291.0,108.9 294.0,108.9 H314.0 Q317.0,108.9 317.0,111.9 V176 Z"><title>Week of 19 Oct: 262 commits</title></path>
<path class="cw-b" d="M323.0,176 V143.9 Q323.0,140.9 326.0,140.9 H346.0 Q349.0,140.9 349.0,143.9 V176 Z"><title>Week of 26 Oct: 137 commits</title></path>
<path class="cw-b" d="M355.0,176 V139.1 Q355.0,136.1 358.0,136.1 H378.0 Q381.0,136.1 381.0,139.1 V176 Z"><title>Week of 2 Nov: 156 commits</title></path>
<path class="cw-b" d="M387.0,176 V136.5 Q387.0,133.5 390.0,133.5 H410.0 Q413.0,133.5 413.0,136.5 V176 Z"><title>Week of 9 Nov: 166 commits</title></path>
<path class="cw-k" d="M419.0,176 V53.8 Q419.0,50.8 422.0,50.8 H442.0 Q445.0,50.8 445.0,53.8 V176 Z"><title>Week of 16 Nov: 489 commits</title></path>
<text class="cx-m" x="445.0" y="42.8" text-anchor="end">experiments · 489</text>
<path class="cw-b" d="M451.0,176 V176.0 Q451.0,174.2 452.8,174.2 H475.2 Q477.0,174.2 477.0,176.0 V176 Z"><title>Week of 23 Nov: 7 commits</title></path>
<line class="cx-rule" x1="0" y1="176.5" x2="480" y2="176.5"/>
<text class="cx-m" x="3.0" y="196">Aug</text>
<text class="cx-m" x="99.0" y="196">Sep</text>
<text class="cx-m" x="227.0" y="196">Oct</text>
<text class="cx-m" x="355.0" y="196">Nov</text>
</svg>
<figcaption>Commits a week, across every branch: 2,911 between 21 August and 23 November, fewer than a hundred of them by teammates.</figcaption>
</figure>

- **16–20 August.** The instrument, in five days.
- **20–25 August.** The agent's first build, on my own Pipecat pipeline in a browser. A demo on 25 August with synthetic buyers. The demo was the deadline, not a milestone.
- **September.** A second build on a hosted voice engine, phone only, at 8 kHz, and the first real phone calls, mine and testers'.
- **October.** The first real customers on 11 October, go-live on 15 October, and fifty customers the next day in batches of five, read between batches. The engine self-hosted in India and patched from the inside. A daily loop: read the day's calls, fix, check on a test engine, ship, keep the rollback ready.
- **November.** More brands were coming, so each brand moved out of the code into its own file. Then the stack itself: the ear, the brain and the voice tested layer by layer, with whole calls deciding.

## First, the instrument

Before we built a voice agent, I built the thing that measures one. Give it a folder of real call recordings and it hands back one signed report of what callers actually experienced: how long they waited, dead air, interruptions, audio quality, how much Hindi and English got mixed. Vendors measure latency from their own server. This measured what the caller heard, from the recording, with the timing method of Openbenchmarks<sup class="fn"><a href="#source-4" id="ref-4">4</a></sup> adopted openly. The line I wrote it to: the gap between claim and caller is the product.

<figure class="diagram">
<svg viewBox="0 0 480 196" role="img" aria-labelledby="ip-title ip-desc" xmlns="http://www.w3.org/2000/svg">
<title id="ip-title">The instrument, recording to report</title>
<desc id="ip-desc">Six stages: recordings and a manifest; ingest with an exclusion ledger; layout, deciding which channel is the caller; segmentation, where two detectors must agree; turns and waits, measured from the audio only; a signed report that leads with coverage. Every stage can refuse, and a refusal is printed with its reason.</desc>
<style>.ip-b{fill:none;stroke:var(--hairline-strong);stroke-width:1}.ip-k{fill:none;stroke:var(--ink);stroke-width:1.25}.ip-t{font-family:var(--sans);font-size:13.5px;font-weight:600;fill:var(--ink)}.ip-s{font-family:var(--sans);font-size:12.5px;fill:var(--ink-muted)}.ip-l{font-family:var(--mono);font-size:13px;fill:var(--ink-muted)}.ip-a{stroke:var(--ink-muted);stroke-width:1;fill:none}.ip-r{stroke:var(--ink-muted);stroke-width:1;fill:none;stroke-dasharray:3 3}.ip-h{fill:var(--ink-muted)}</style>
<defs><marker id="ip-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" class="ip-h"/></marker></defs>
<rect class="ip-b" x="0.5" y="0.5" width="139" height="58" rx="3"/>
<text class="ip-t" x="12.0" y="24.5">Recordings</text>
<text class="ip-s" x="12.0" y="43.5">plus a manifest</text>
<rect class="ip-b" x="170.5" y="0.5" width="139" height="58" rx="3"/>
<text class="ip-t" x="182.0" y="24.5">Ingest</text>
<text class="ip-s" x="182.0" y="43.5">exclusion ledger</text>
<rect class="ip-b" x="340.5" y="0.5" width="139" height="58" rx="3"/>
<text class="ip-t" x="352.0" y="24.5">Layout</text>
<text class="ip-s" x="352.0" y="43.5">who is the caller?</text>
<rect class="ip-b" x="0.5" y="106.5" width="139" height="58" rx="3"/>
<text class="ip-t" x="12.0" y="130.5">Segments</text>
<text class="ip-s" x="12.0" y="149.5">two detectors agree</text>
<rect class="ip-b" x="170.5" y="106.5" width="139" height="58" rx="3"/>
<text class="ip-t" x="182.0" y="130.5">Turns and waits</text>
<text class="ip-s" x="182.0" y="149.5">from the audio only</text>
<rect class="ip-k" x="340.5" y="106.5" width="139" height="58" rx="3"/>
<text class="ip-t" x="352.0" y="130.5">Signed report</text>
<text class="ip-s" x="352.0" y="149.5">coverage first</text>
<line class="ip-a" x1="140" y1="29.5" x2="169" y2="29.5" marker-end="url(#ip-arrow)"/>
<line class="ip-a" x1="310" y1="29.5" x2="339" y2="29.5" marker-end="url(#ip-arrow)"/>
<line class="ip-a" x1="140" y1="135.5" x2="169" y2="135.5" marker-end="url(#ip-arrow)"/>
<line class="ip-a" x1="310" y1="135.5" x2="339" y2="135.5" marker-end="url(#ip-arrow)"/>
<path class="ip-a" d="M410,59 V82 H70 V105" marker-end="url(#ip-arrow)"/>
<text class="ip-l" x="0" y="190">↳ every stage can refuse, and says why</text>
</svg>
<figcaption>A file it can’t read goes to the exclusion ledger. A number it can’t stand behind is printed as unverifiable, never guessed.</figcaption>
</figure>

What made it different was what it refused to say. Percentiles only, never averages, and a percentile printed only when the sample can carry it: no 99th percentile from three calls. Everything else was a gate that withholds a number rather than print a wrong one:

- **Who is the caller?** On 59 recorded call-centre conversations from HarperValleyBank,<sup class="fn"><a href="#source-2" id="ref-2">2</a></sup> 8.5% had the channels silently swapped, which moved the median wait by 454 ms. After the gate: 51 attributed right, 0 wrong, 8 declared unknown.
- **Leaky lines.** On a recording with 5 real overlaps, channel bleed at −30 dB, which sounds clean, produced 150. When bleed is louder than −35 dB, overlap and interruption are withheld; a clean phone line measures −48.
- **Hold music.** Two independent speech detectors<sup class="fn"><a href="#source-3" id="ref-3">3</a></sup> agreed on a 340 ms "turn" inside hold music, which would have reported a 15.9 second wait as 0 ms. Vendor-flattering, at full confidence. Now vetoed when two signatures agree.
- **The flattering winner.** The best-scoring segmentation setting was rejected because it shifted turn ends by 19.8 ms, in the direction that shortens the wait. Buying accuracy with an understatement of the wait is the one trade the instrument can't make.
- **Script is not language.** The recogniser writes English words in Devanagari, so counting scripts undercounts Hinglish. The rule that held: one English word inside Hindi is a borrowing; a run of two or more is a switch.

It was held to its own standard. A golden corpus of real speech placed at exact offsets (gaps of 200, 800 and 2,500 ms, one 300 ms overlap, dead air), at 8 and 16 kHz, clean and noisy, guarded so no agent could loosen it. Its own error against a scripted caller: 13.9 ms at the median. The full method is public.<sup class="fn"><a href="#source-9" id="ref-9">9</a></sup> Every report signed with Ed25519, and a single flipped byte that "improves" the median by 10 ms is rejected by three independent checks. Any comparison prints the smallest difference it could have detected, so "no difference" is never read as a finding.

Then I ran it on a system I didn't build: 383 real human-to-bot calls from a public dataset, DSTC2.<sup class="fn"><a href="#source-1" id="ref-1">1</a></sup> The bot's own log explained 64.4% of what callers waited (586 ms logged against 910 ms experienced, at the median). My own caller gate, tuned on human calls, refused 209 of the 383, and was never recalibrated. Getting there cost me my own first headline. From one call I had reported a 1,004 ms "endpointing wait"; the full run kept the direction and killed the mechanism, and I withdrew it. The same week the instrument flagged two humans talking to each other as a critical failure against a 300 ms bot target. Its own appendix forbade that comparison. Withdrawn, and the report now asks who is on the far end before it judges.

The business question came at the same time. A memo in my name on 17 August said: take the client, don't take the build; sell the measurement, not the agent. Three days later we started building the agent anyway, and the instrument stopped being a product and became the proof. The agent inherited its laws: stereo recordings with the caller on the left, percentiles only, an evaluator nobody may loosen, and every call stamped real or synthetic with no default.

## System design

Five parts, talking only over HTTP. Two of the joins are deliberate disguises. The brain answers like a language model, so the engine never learns there is a brain. The bridge answers like the voice service the backend was designed to call, so the backend never learns there is an engine. So the model behind the brain could change without the engine noticing, and the backend never cared which engine ran. The engine itself was the hard part to change: the brain leans on its quirks, and the bridge parses its logs.

<figure class="diagram">
<svg viewBox="0 0 480 540" role="img" aria-labelledby="sd-title sd-desc" xmlns="http://www.w3.org/2000/svg">
<title id="sd-title">How one Priya call ran</title>
<desc id="sd-desc">Before the call, the backend asks the bridge to call, and the bridge dials through the engine. On every turn the engine sends the whole conversation to the brain, which runs fixed rules, then a conductor, then the model only as a last resort, then an exit filter, and returns her line or a tool call. The engine makes each tool call to our order system, which accepts or refuses it. After the call the bridge reads it again, compares what was said with what was written, and the backend writes to the courier or holds it for a person.</desc>
<style>
.sd-box{fill:none;stroke:var(--hairline-strong);stroke-width:1}
.sd-key{fill:none;stroke:var(--ink);stroke-width:1.25}
.sd-t{font-family:var(--sans);font-size:14px;font-weight:600;fill:var(--ink)}
.sd-t2{font-family:var(--sans);font-size:13px;font-weight:600;fill:var(--ink)}
.sd-s{font-family:var(--sans);font-size:12.5px;fill:var(--ink-muted)}
.sd-l{font-family:var(--mono);font-size:13px;fill:var(--ink-muted)}
.sd-a{stroke:var(--ink-muted);stroke-width:1;fill:none}
.sd-h{fill:var(--ink-muted)}
</style>
<defs><marker id="sd-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" class="sd-h"/></marker></defs>
<text class="sd-l" x="0" y="12">BEFORE THE CALL</text>
<rect class="sd-box" x="0.5" y="22.5" width="179" height="58" rx="3"/>
<text class="sd-t" x="14" y="46">Backend</text>
<text class="sd-s" x="14" y="66">who to call, and when</text>
<rect class="sd-box" x="300.5" y="22.5" width="179" height="58" rx="3"/>
<text class="sd-t" x="314" y="46">Bridge</text>
<text class="sd-s" x="314" y="66">facts, opening line, dial</text>
<line class="sd-a" x1="181" y1="51" x2="299" y2="51" marker-end="url(#sd-arrow)"/>
<text class="sd-l" x="240" y="43" text-anchor="middle">POST /calls</text>
<text class="sd-l" x="0" y="110">ON THE CALL, EVERY TURN</text>
<line class="sd-a" x1="380" y1="81" x2="380" y2="119" marker-end="url(#sd-arrow)"/>
<text class="sd-l" x="388" y="104">dial</text>
<rect class="sd-box" x="0.5" y="120.5" width="129" height="58" rx="3"/>
<text class="sd-t" x="14" y="144">Buyer</text>
<text class="sd-s" x="14" y="164">Hinglish, 8 kHz</text>
<rect class="sd-box" x="200.5" y="120.5" width="279" height="58" rx="3"/>
<text class="sd-t" x="214" y="144">Engine</text>
<text class="sd-s" x="214" y="164">Dograh + Pipecat; Sarvam ear, voice</text>
<line class="sd-a" x1="132" y1="149" x2="198" y2="149" marker-start="url(#sd-arrow)" marker-end="url(#sd-arrow)"/>
<line class="sd-a" x1="215" y1="179" x2="215" y2="221" marker-end="url(#sd-arrow)"/>
<text class="sd-l" x="207" y="204" text-anchor="end">whole call, each turn</text>
<line class="sd-a" x1="425" y1="222" x2="425" y2="180" marker-end="url(#sd-arrow)"/>
<text class="sd-l" x="417" y="204" text-anchor="end">her line or a tool call</text>
<rect class="sd-key" x="0.5" y="222.5" width="439" height="112" rx="3"/>
<text class="sd-t" x="14" y="246">Brain</text>
<text class="sd-s" x="64" y="246">an OpenAI-compatible endpoint; keeps no state</text>
<rect class="sd-box" x="14.5" y="262.5" width="90" height="56" rx="2"/>
<text class="sd-t2" x="22" y="285">Fixed rules</text>
<text class="sd-s" x="22" y="303">31 layers</text>
<rect class="sd-box" x="121.5" y="262.5" width="90" height="56" rx="2"/>
<text class="sd-t2" x="129" y="285">Conductor</text>
<text class="sd-s" x="129" y="303">fixed words</text>
<rect class="sd-box" x="228.5" y="262.5" width="90" height="56" rx="2"/>
<text class="sd-t2" x="236" y="285">Model</text>
<text class="sd-s" x="236" y="303">last resort</text>
<rect class="sd-box" x="335.5" y="262.5" width="90" height="56" rx="2"/>
<text class="sd-t2" x="343" y="285">Exit filter</text>
<text class="sd-s" x="343" y="303">plain speech</text>
<line class="sd-a" x1="105" y1="290" x2="120" y2="290" marker-end="url(#sd-arrow)"/>
<line class="sd-a" x1="212" y1="290" x2="227" y2="290" marker-end="url(#sd-arrow)"/>
<line class="sd-a" x1="319" y1="290" x2="334" y2="290" marker-end="url(#sd-arrow)"/>
<line class="sd-a" x1="462" y1="180" x2="462" y2="373" marker-start="url(#sd-arrow)" marker-end="url(#sd-arrow)"/>
<text class="sd-l" x="454" y="358" text-anchor="end">tool call, and its answer</text>
<rect class="sd-box" x="200.5" y="374.5" width="279" height="58" rx="3"/>
<text class="sd-t" x="214" y="398">Order system</text>
<text class="sd-s" x="214" y="418">ours; checks every write</text>
<text class="sd-l" x="0" y="468">AFTER THE CALL</text>
<rect class="sd-box" x="0.5" y="478.5" width="179" height="58" rx="3"/>
<text class="sd-t" x="14" y="502">Bridge</text>
<text class="sd-s" x="14" y="522">said, against written</text>
<rect class="sd-box" x="300.5" y="478.5" width="179" height="58" rx="3"/>
<text class="sd-t" x="314" y="502">Backend</text>
<text class="sd-s" x="314" y="522">to the courier, or a person</text>
<line class="sd-a" x1="181" y1="507" x2="299" y2="507" marker-end="url(#sd-arrow)"/>
<text class="sd-l" x="240" y="499" text-anchor="middle">result</text>
</svg>
<figcaption>One call. The middle band runs once per thing the buyer says. Inside the brain, each arrow means “if that had no answer”.</figcaption>
</figure>

### The parts

- **Backend**, my teammates' work. Who to call and when. A scheduler ticks every minute, and a gate checks again at dial time: no call to a number on the do-not-call list, none past the courier's deadline, none outside 9 am to 9 pm. At most three calls a parcel a day, an hour apart.
- **Bridge**, about 5,000 lines of Node, no packages. It turns an order into what she needs to know: his name, the address in parts, what this courier will and won't allow as plain sentences, and what happened on earlier calls. It records her opening for this buyer before it dials. If the clip isn't ready in 3.9 seconds, she says it live.
- **Engine.** Dograh,<sup class="fn"><a href="#source-5" id="ref-5">5</a></sup> self-hosted on a server in India, with Pipecat<sup class="fn"><a href="#source-6" id="ref-6">6</a></sup> inside. It carries the 8 kHz phone audio, decides when he has finished, hears him and speaks through Sarvam, and makes her tool calls.
- **Brain**, about 19,000 lines of JavaScript on Vercel. Everything she decides.
- **Order system.** Ours, not the courier's. It holds the call's state while the call is on: every tool call lands here, and it accepts or refuses, then says what is allowed next. Nothing reaches the courier until the call is over.

### One turn inside the brain

The brain remembers nothing. Every turn the engine sends the whole conversation again, and the brain works out where it is by reading her earlier lines and the tool results. It hands back her next line, or a tool call for the engine to make.

A turn runs in a fixed order. First, tidy what he said, and drop the part he said to someone else in the room (<span lang="hi">बच्चों को बोल रहा हूँ</span>, "I'm talking to the kids"). Then about 31 rule layers that call no model: her own echo, a hold, the address, the day, read-backs, his question, silence, goodbye. If none answers, a conductor has a small model read the turn, then picks fixed words for what it read. Only if that fails too does the model write the reply. Everything leaves through an exit filter: plain speech, numbers as words, at most one <span lang="hi">जी</span>, and nothing about the order to anyone who isn't him.

The model doesn't wait its turn. It starts with the rules, and its answer is thrown away if a rule gets there first, so when it is needed it already has a head start.

<figure class="diagram">
<svg viewBox="0 0 480 140" role="img" aria-labelledby="rc-title rc-desc" xmlns="http://www.w3.org/2000/svg">
<title id="rc-title">The rules and the model start together</title>
<desc id="rc-desc">Two cases. When a rule answers, she speaks as soon as the rules finish and the model's answer is thrown away. When no rule fits, the model's answer, already on its way, becomes her line.</desc>
<style>
.rc-t{font-family:var(--sans);font-size:12.5px;font-weight:600;fill:var(--ink)}
.rc-m{font-family:var(--mono);font-size:13px;fill:var(--ink-muted)}
.rc-r{fill:var(--ink)}
.rc-o{fill:none;stroke:var(--ink-muted);stroke-width:1.25}
.rc-d{fill:none;stroke:var(--ink-muted);stroke-width:1.25;stroke-dasharray:3 3;opacity:.7}
</style>
<text class="rc-m" x="479" y="12" text-anchor="end">time →</text>
<text class="rc-t" x="0" y="12">When a rule answers</text>
<text class="rc-m" x="62" y="37" text-anchor="end">rules</text>
<rect class="rc-r" x="70" y="26" width="160" height="14" rx="3"/>
<text class="rc-m" x="238" y="37">she speaks</text>
<text class="rc-m" x="62" y="59" text-anchor="end">model</text>
<rect class="rc-o" x="70.6" y="48.6" width="158.8" height="12.8" rx="3"/>
<rect class="rc-d" x="232.6" y="48.6" width="146.8" height="12.8" rx="3"/>
<text class="rc-m" x="388" y="59">thrown away</text>
<text class="rc-t" x="0" y="88">When nothing else answers</text>
<text class="rc-m" x="62" y="113" text-anchor="end">rules</text>
<rect class="rc-r" x="70" y="102" width="160" height="14" rx="3"/>
<text class="rc-m" x="238" y="113">no answer</text>
<text class="rc-m" x="62" y="135" text-anchor="end">model</text>
<rect class="rc-o" x="70.6" y="124.6" width="268.8" height="12.8" rx="3"/>
<text class="rc-m" x="348" y="135">her line</text>
</svg>
<figcaption>Not to scale. The model's head start is the point.</figcaption>
</figure>

### Why rules first

Not taste. Three things happened.

- **The prompt looked full, and wasn't.** In August a prompt-only build climbed from 82% to 91% on the test scenarios, then four attempts to beat it failed, each fixing its target and breaking something it never touched. I called it a capacity ceiling. Then I measured the ruler: one unchanged build, run three times, scored 83, 81 and 88, and 19 of 102 scenarios flipped verdict on their own. The ceiling was noise, and I withdrew it. Two findings survived. Giving the model one more fact beat any rule: showing when the order was placed took two failing cases from 0 of 3 to 3 of 3. And a quoted example line in a prompt leaks past every rule around it.
- **The dialogue graph never moved.** On every real call made with the platform's graph, it sat on its first node. All the state lived in one long prompt, read from scratch each turn. Repeating herself, introducing herself again mid-call, never hanging up: one cause.
- **The phone disagreed with the bench.** In late September typed drills scored her 9.2 while three of my own test calls on a real line scored 6, 4 and 3. A bigger model behind a thinner brain, tried live that night, took 8.16 seconds on its worst reply and was reverted. So the conductor: the model returns one intent as JSON at temperature zero, and code does the rest. Her words are a fixed line built from the order's facts, tool arguments come from his words, and every call has to end: a day asked twice becomes an offer, an offer refused twice becomes a hand-off. Simulated buyers built from twelve real ones went from 5.0 to 8.04.

By November the brain had 1,154 tests, around 30 of the files named after real calls. The price: her lines carry state. The brain finds its place by reading what she said, so rewording one line can change what happens three turns later. And in November a test turned the argument on itself. Replaying the moments where a person had heard a mistake, the live brain avoided 26% of them, and the same model with the rules taken out avoided 44%. Rules kept the writes safe; some of them made the conversation worse. So I ran the rules-off brain on whole calls. Of 60, live passed 50; rules-off passed 44, 41 and 41 on three models. Rules lost moments and won calls. 18 of the 57 mistakes were made by every design I tried, and those became eight policy questions for people, not code.

### State lives in the tool replies

Prose proposes; the tool reply disposes. With no graph holding state, the reply to a tool call was the one place state could land at the moment of decision. A booking is a request to the order system, and she says the day out loud only after it comes back accepted. When the courier can't do something, the refusal comes back with the line she should say. Each write's reference carries the call's write history as flags, so the order system knows what already happened without a database, and a cancel is refused unless the save-the-order question was asked first. Across 45 driven conversations, the outcome left unsaid fell from 12 of 15 to 1 of 15, and the turns needed to end a call from 31 to between 1 and 5. On a tester's phone call the next day, that gate refused two cancels and the call ended booked.

Code also owns anything the model must not invent. Every write-back once asked the model for the order id, which the prompt left out on purpose, because she must never read it out. The model filled it in anyway, on every call: the buyer's name, the address, once "order_id_not_provided_in_context". The mock order system said ok, and the test harness scored 11 of 12 calls as recovered. It took three changes, because any one alone left the hole open: code fills in the real id and overwrites whatever the model sends, the order system refuses an order it doesn't hold, and the judge checks which order was written to. The honest number was 9 of 12.

### After the call: said, against written

When the line has been quiet for 12 seconds, the bridge reads the whole call again. A second reader pulls the day and the address he actually asked for out of the full transcript, using the brain's own parsers, and lays them beside what the tools wrote. A salvage step files a day he clearly said but nobody wrote. A verifier, Claude reading only what was said, never the tools, can stop a resolution but never make one. Both were built and switched off by default. On 21 labelled calls, writes landed right in 11 alone and in 21 with salvage, with none wrong; the verifier sent 18 of 25 right, held 7, and got none wrong. Only writes the order system accepted are reported, and a brand-new address waits for a person by default. A refused booking once read as landed, because the engine logs tool results as Python reprs; they are now parsed as Python and fail closed.

### One brain, many brands

In November I began moving each brand out of code and into a file: one pack per brand, checked against a schema, and a draft can't dial. A pack holds the spoken brand name, who may hear what (the brand, the item, the amount, the address, even that a parcel exists), delivery slots, fees, exchanges, what the courier allows, and words never to be read as a day or a place. Policies are fixed choices, not free text, so code can branch on them. The bridge writes the pack into the prompt as one line in a fixed order, so the model vendor's cache still holds. With no pack, the brain behaves byte for byte as it did for the first brand. 144 hostile buyer lines, run through the real brain with the model stubbed out, went from 61 failures of 102 to 6 in a day, and produced a discreet mode: if his wife picks up, Priya asks when she can reach him and says nothing about a brand, a parcel or a day. As of early November the packs had been tested only in typed calls.

## The wait

On the browser demo in August (my own Pipecat pipeline, on a laptop, six automated calls), I traced where 2.7 seconds went, at the median of 22 turns.

<figure class="diagram">
<svg viewBox="0 0 480 122" role="img" aria-labelledby="wt-title wt-desc" xmlns="http://www.w3.org/2000/svg">
<title id="wt-title">Where 2,685 milliseconds went, at the median of 22 turns</title>
<desc id="wt-desc">In order: knowing he had finished 759 ms (ours), the ear's final words 414 ms (vendor), the model's first word 405 ms (vendor), collecting a sentence 494 ms (ours), the voice's first sound 248 ms (vendor), an unexplained remainder 366 ms (ours). Ours 1,619 ms, vendors 1,067 ms. The first budget, 1,200 ms, ends 27 ms into the model.</desc>
<style>.cx-t{font-family:var(--sans);font-size:12.5px;fill:var(--ink)}
.cx-m{font-family:var(--mono);font-size:13px;fill:var(--ink-muted)}
.cx-rule{stroke:var(--hairline-strong);stroke-width:1}.wt-o{fill:var(--ink)}.wt-v{fill:none;stroke:var(--ink-muted);stroke-width:1.25}.wt-k{stroke:var(--ink);stroke-width:1;stroke-dasharray:3 3}</style>
<rect class="wt-o" x="1" y="6" width="11" height="11" rx="2"/><text class="cx-t" x="18" y="16">ours, 1,619 ms</text>
<rect class="wt-v" x="131" y="6.5" width="10" height="10" rx="2"/><text class="cx-t" x="148" y="16">vendors, 1,067 ms</text>
<text class="cx-m" x="479" y="16" text-anchor="end">2,685 ms</text>
<rect class="wt-o" x="1.0" y="48" width="133.1" height="34" rx="3"><title>turn end: 759 ms, ours</title></rect>
<text class="cx-t" x="3.0" y="100">turn end</text>
<text class="cx-m" x="3.0" y="115">759</text>
<rect class="wt-v" x="136.7" y="48.6" width="70.5" height="32.8" rx="3"><title>ear: 414 ms, vendor</title></rect>
<text class="cx-t" x="138.1" y="100">ear</text>
<text class="cx-m" x="138.1" y="115">414</text>
<rect class="wt-v" x="210.3" y="48.6" width="68.9" height="32.8" rx="3"><title>model: 405 ms, vendor</title></rect>
<text class="cx-t" x="211.7" y="100">model</text>
<text class="cx-m" x="211.7" y="115">405</text>
<rect class="wt-o" x="281.8" y="48" width="85.9" height="34" rx="3"><title>sentence: 494 ms, ours</title></rect>
<text class="cx-t" x="283.8" y="100">sentence</text>
<text class="cx-m" x="283.8" y="115">494</text>
<rect class="wt-v" x="370.3" y="48.6" width="40.9" height="32.8" rx="3"><title>voice: 248 ms, vendor</title></rect>
<text class="cx-t" x="371.7" y="100">voice</text>
<text class="cx-m" x="371.7" y="115">248</text>
<rect class="wt-o" x="413.9" y="48" width="63.1" height="34" rx="3"><title>remainder: 366 ms, ours</title></rect>
<text class="cx-t" x="415.9" y="100">remainder</text>
<text class="cx-m" x="415.9" y="115">366</text>
<line class="wt-k" x1="214.6" y1="36" x2="214.6" y2="86"/>
<text class="cx-m" x="219.6" y="44">first budget, 1,200</text>
</svg>
<figcaption>Filled is ours, outlined is a vendor’s. The dashed line is the budget I started with.</figcaption>
</figure>

<details class="numbers"><summary>The numbers</summary>

| Stage | Time | Whose |
|---|--:|---|
| Knowing he has finished | 759 ms | ours |
| The ear's final words | 414 ms | vendor |
| The model's first word | 405 ms | vendor |
| Collecting a sentence to speak | 494 ms | ours |
| The voice's first sound | 248 ms | vendor |
| Unexplained remainder (network, playout) | 366 ms | ours |
| **Total** | **2,685 ms** | |

</details>

My budget was 1.2 seconds. The vendors alone took 1.07, which left 133 ms for everything of ours, so it could never be met on that stack. That day I moved it to 3.5 seconds at the 95th percentile and wrote down why. On live calls our share later measured 44%, not 60%.

On the phone, the hosted engine recorded only a mono mix, so the instrument learned a new trick. His voice had crossed the phone network and hers hadn't, so energy between 3.5 and 3.95 kHz tells them apart. Checked against 353 of our own stereo recordings, it found 98% of 2,314 hand-overs, with a median timing error of 20 ms. On 64 recorded calls in early October the wait was 2.76 seconds at the median and 4.65 at the 95th, against the platform's own 2.74 and 4.46.

Then I read the engine's source. Of a 2.23 second median reply, 1.45 seconds was waiting for him to finish, and its 90th percentile sat at 1.52: a timer, not the network. Inside it was a hard-coded 1.17 second recogniser wait after a 0.2 second silence. The brain was 0.37 seconds. We patched the engine from the inside: the recogniser wait came down to 0.7 seconds per workflow, and a turn could end as soon as the turn model was sure he was done.

By mid-November a stage trace split every reply from his last word to her first sound. On a day of 607 replies, the median was 1.69 seconds and the 95th percentile 3.70. Of the 431 replies slower than 3 seconds that week, the model's first token caused 48%, the second request on a write turn 39%, and waiting for the end of his turn 14%. The recogniser and the voice: never. And a bench of 15 models found that only one change moved what a caller feels: a model hosted in India, at 0.37 seconds against 1.03. Geography beat model choice.

## How I knew

Every stage of the project had a measuring instrument, and most of them got corrected by the next one. The ladder ran from free to expensive:

- **Lawful paths.** One typed graph of reason code, entity, tool and outcome, and a state machine of the product laws that enumerates every lawful call. Checking a call is membership, not a judge's opinion.
- **Buyers who hear.** Simulated buyers drawn from NVIDIA's Nemotron Personas India,<sup class="fn"><a href="#source-7" id="ref-7">7</a></sup> speaking over real WebRTC, with the buyer's brain on a different vendor from hers. Then an audio model playing the buyer from sound. The one that could hear got her to read out the full address and amount, something no text buyer ever managed.
- **The judge, and its noise.** 45 typed calls a run, about $0.85, one fix per commit: 8.49 to 9.22. A control rerun of the same build: 8.96. Pooled with a bootstrap: 9.09, 95% interval 8.78 to 9.38. The same 45 transcripts judged twice gave 8.69 and 9.04, so the judge runs three times and the median counts. The same judge on 27 recorded phone calls: 5.48.
- **Twins.** One twin per answered real call: his real turns play while she runs, then a model continues as him. Two builds run on one shared reply cache, so a build against itself comes out 20 of 20 identical. A bandit mutates passing twins with operators taken from real faults, hunting for breaks. 351 twins by November.
- **The 8 kHz ear.** 74 buyers, one per scenario, whose synthetic voices go through street noise, frame loss, a 300–3,400 Hz phone band, mu-law and the live recogniser before she hears them.
- **Every real turn, twice.** All 3,990 real buyer turns from 629 calls replayed through the old and new build; every changed turn read.
- **Graders that disagree.** Graded on outcome, in code, over 120 paired calls: live scored 0.67 with the judge at 8.3, and a teammate's scripted agent 0.83 with the judge at 5.9. Two honest graders, opposite verdicts.
- **People.** A teammate listened to about 20 calls a day and marked every mistake. Those sheets became the ground truth: two model judges tracked the human ear at a Spearman of 0.23 to 0.25, so feel was scored by people only.
- **A holdout that could say no.** The next day's human sheet, which no builder could read, scored once. A build passing 106 of 124 known faults caught 1 of 10 unseen ones. Its successor, against a bar of 8 out of 10 written down first: 2 of 9. Bar not met, and gates that failed review twice shipped switched off.

From 16 November each bench run had its pass bars committed before it ran, its folder keyed by the hash of that file, so changing the question after seeing the answer started a new, empty run.

## The experiments

The ones not told above, grouped by layer. Each is told as question, build, result.

<h3 class="group">The ear</h3>
<dl class="ledger">
<dt>Where his words go <span class="v">kept</span></dt>
<dd>Open recognisers (IndicConformer<sup class="fn"><a href="#source-8" id="ref-8">8</a></sup>, NVIDIA Nemotron) against the live one on 213 real turns at 8 kHz. On turns the call logged, none beat live: 0.218 character error against 0.198, and Nemotron returned nothing on 62 to 126 of them. The real loss was around the recogniser, not in it: speech after she stopped that never became a turn. An early claim that IndicConformer halved the error on short answers used an unfair baseline, and I withdrew it the same day.</dd>
<dt>The offline winner, live <span class="v">reverted</span></dt>
<dd>A recogniser that matched live on 213 real turns went live twice and was pulled both times that evening: a quiet buyer in a noisy shop wasn't heard at all, and replies flipped to English because it writes English in Latin script. The test set only held turns the live recogniser had already heard.</dd>
<dt>Side talk <span class="v on">live</span></dt>
<dd>A judge on Jev, TypeSafe's decision model, cuts his line into clauses and drops only those said to someone else, when two readings agree, never a bare yes or a named day. It caught 9 of 12 side-talk lines where the model's own flag caught 2, and wrongly dropped 1 of 98 real lines, then none after a fix. About $0.0004 a call.</dd>
</dl>

<h3 class="group">The voice</h3>
<dl class="ledger">
<dt>252 calls, one stall <span class="v">kept</span></dt>
<dd>A concurrent gauntlet plus signal processing for what a number can settle, and an audio judge only for prosody. A mid-sentence stall on every call, 12.4% of her speaking time, on three different stacks. The obvious buffer fix measured useless. The judge returned exactly 7 on 63 of 79 calls, so only its tags counted.</dd>
<dt>Voices by measurement <span class="v on">shipped</span></dt>
<dd>Model temperature turned out to do nothing to pitch. A level-matched five-line matrix chose the first voice. In September the voice moved vendors the same day an 8 kHz bake-off showed the gaps between chunks were the defect; the problem was distance, not the voice, and once the engine ran in India it came back. In November all 23 male voices, 432 clips, were heard back by two recognisers at 8 kHz; the pick said the brand right 59 times in 64, against 49 for the voice before it. Naturalness wasn't measured, and the write-up says so.</dd>
<dt>Recorded lines at the wire <span class="v on">live</span></dt>
<dd>A reply whose text matches a recording is played instead of synthesised, every file transcribed blind first (133 of 133). Recordings answered in 1.0–2.1 seconds against 2.5–3.9. The first phone call found the clips 5.4 dB louder than her live voice; after levelling, within 1 dB.</dd>
<dt>Room tone <span class="v">never run live</span></dt>
<dd>Would a quiet bed of room tone under her voice hurt recognition? At −62 dBFS 197 of 213 turns transcribed the same (control 203); at −55 dBFS, 182. Harm measured, benefit not, so it stayed off.</dd>
</dl>

<h3 class="group">The brain</h3>
<dl class="ledger">
<dt>The Jev router <span class="v">kept off live</span></dt>
<dd>A pre-agent in front of the model: the client's call-script chart as 96 branches, and Jev deciding which branch a buyer is on. Above 0.95 confidence a pre-written or recorded line is spoken; below, the model answers. Its line arrives in the model's wire format, so every guard still runs. Jev read 109 Devanagari chart lines at 81.7%, and at 0.9 or more it was right 94–96% of the time; the language model claimed confidence on 98% of lines, so its confidence could gate nothing. Scripted buyers: 82% of replies from the chart, wait 411 ms against 1,020. On real calls it would have answered 11% of reply points, 74 of 83 right. Against control, 8.93 to 8.20: not worse, probably better. Probably isn't enough to touch live.</dd>
<dt>The lazy dialogue graph <span class="v">dropped</span></dt>
<dd>Make the laws unrepresentable instead of instructed: don't store the graph, compute the frontier. 111 legal paths, one to four legal moves at any moment, against a 35,439-character prompt. Compiled at deploy into 176 states and seven nodes, none written by hand. It scored 76 against 85, and then the log showed the platform's graph never moved on a real call anyway.</dd>
<dt>A fast classifier for small decisions <span class="v">bench only</span></dt>
<dd>One module per decision, tuned on even run ids and held out on odd. Acknowledging anger: 26 of 29 right at 0.8. Intent: it could take 43% of turns at 0.9 and save about 540 ms each. Two other gates had too few held-out cases to wire, and the write-up says so.</dd>
<dt>Fifteen models <span class="v">kept live</span></dt>
<dd>Fifteen models behind the frozen live brain on identical turns, from two places, with repeats and a noise floor. Accuracy on 120 twin runs ranged to 90% against live's 88%.</dd>
<dt>Call state, off the critical path <span class="v on">shipped</span></dt>
<dd>A model reading the call's state was right 34 times in 36 against 11, and useless at a 9.8 second tail. A 279 ms median turned out to be a log cap and was withdrawn. The design that shipped computes the state while she is speaking, stores it, and reads it next turn: 22 of 36 against 12, no added wait, and 0 of 234 deliberately poisoned states leaked into speech.</dd>
<dt>One <span lang="hi">जी</span> a reply <span class="v on">live</span></dt>
<dd>A cosmetic rule: 195 <span lang="hi">जी</span> across 45 calls. Rebuilding 90 calls both ways found 21 of 17,304 readings differed, because the conductor recognised its own day offer by the <span lang="hi">जी</span> at its end, so a yes would not have booked. Fixed to zero before it shipped. 4.3 to 2.5 a call.</dd>
</dl>

<h3 class="group">The data she writes</h3>
<dl class="ledger">
<dt>Addresses, by sound <span class="v on">live</span></dt>
<dd>Of 383 real calls, 7 took a new address and 1 was written right. Now a reader model fills fields from his turn, code checks each against his words, and one writer writes. 19,300 India Post pincodes, with a heard place matched to post-office names by its consonants: <span lang="hi">ढीला</span> and Dhela are both d-l. The reader went 183 of 183 on its battery, and 0 of 715 real turns changed decision.</dd>
<dt>Fake delivery attempts <span class="v">off by default</span></dt>
<dd>Rules plus a separate Claude read; code decides, and the courier never sees the accusation. In a census of 124 real calls it caught all six labelled fake and none of the seven labelled genuine. Small print, on the record: the rules were fitted on those calls and a model wrote the labels. An adversarial pass on 107 unseen calls found the rules backed only 2 of 11 flags.</dd>
<dt>Calls that remember <span class="v">behind a flag</span></dt>
<dd>A second call opens from what happened on the first: the courier missed, he missed, he asked for a return, he refused a day. Guessing it from our own records would have opened 18 of 28 such real calls untruthfully, so the story comes from the backend. 30 of 30 scenarios on the test engine.</dd>
</dl>

<h3 class="group">The engine and the phone</h3>
<dl class="ledger">
<dt>Patching the engine <span class="v on">live</span></dt>
<dd>Read from both audio tracks: a sentence entered her memory when its audio started, so a nine-second line counted as said after one; lines were lost when he talked over their end, on 9 of 32 answered calls in one day; the recogniser socket never reconnected. Patches inside the engine, versions v1 to v15, went after these and more. The lost-line fix was partial: at the end of October, 78 of 464 spoken replies still never reached her memory. In November a routine image pull silently wiped every one of them, and live ran stock for days. Since then, "live unchanged" means checking the engine too.</dd>
<dt>Six at once <span class="v">blocked</span></dt>
<dd>A fake-telephony load rig on the real 8 kHz pipeline: six concurrent calls, 24 of 24 healthy, no cross-call bleed; ten in a burst was the first to slip. A 20-minute live trial, rollback armed first, was rolled back, and the engine logs put it on the phone account's single channel.</dd>
<dt>The call lab <span class="v">kept</span></dt>
<dd>A page that places a call identical to live except one swapped piece: an ear, a voice or a brain. Brain arms proven to give 0 differences in 832 turns with the switch unset; open recognisers served from a laptop behind an OpenAI-shaped endpoint; 39 arms checked one by one. The earlier "slow lab" turned out to be a missing entry in the engine's speed lists, not slow vendors.</dd>
</dl>

## Small wins

- **Names.** She says his name in Devanagari: a dictionary first, then a model, then the speech vendor. On a test set of 186 names, 184 came out right, against 162 for the vendor on its own.
- **Refusals got their own flow.** The refusal branch went from 24 of 75 test calls to 40, and its safety checks from 1 of 9 to 7 of 9.
- **Agents that argued.** Out of sixty adversarial agents, twelve proposed designs and thirty-six tried to refute them. Every design lost. But while arguing, the refuters read the live code and found six real bugs shipped the day before.
- **A prediction written down first.** The model's first token took 2.76 seconds cold and 0.43 warm. I predicted, in writing, that a cache across calls would hold, and it did: 2.31 down to 0.78. Then the same data cancelled a planned rebuild.
- **The guard on the guard.** An adversarial audit of the hook that stopped agents editing their own evaluator found three bypasses on day one. Fixed and pinned with 34 blocked routes and 18 that must stay allowed.

## Built with agents, under laws

Most of the code was written by Claude Code sessions I directed, so the repos were built to hold them to account. Hooks stopped the agents from editing the contracts, the reason codes, the rehearsal suite and the hooks themselves. Tests could be added, never loosened. The builder is not the judge: the rule was a fresh, read-only reviewer on every diff before a deploy. In four adversarial reviews of the platform seam, three of them with 111 to 166 agents and three skeptics per finding, the critical bug in one round was my own fix.

After any correction, one line went into a lessons file naming the rule and the code that now enforces it. By November there were 560 lessons, and 374 had nothing behind them, so a test now lets that count only fall. Then I tested my own process: the same task with and without the agent file. In the larger of two small runs it added about 13% to the cost, made no difference to the code a strong model wrote, and made the difference on lessons with an explicit check, 2 of 2 against 0 of 2. Proven on lessons, not on code. Nothing reached a live call without my yes.

## What set the ceiling

- The phone account allowed one live conversation at a time.
- The voice vendor started refusing after roughly 70 to 300 calls on one key.
- The live model was due to retire on 14 January 2027.
- More brands meant isolated cells, each with its own engine, numbers, keys and brain. That plan was written and never stood up.

## Where I left her

When I left, she was live on real calls. On 60 whole calls none of the new brains had beaten the live one, so live stayed. The call-state work shipped on 21 November, with its reader switched off on live. In the last week my teammates began moving calls onto the speech vendor's own hosted agents, one per kind of call; my part there was the test-call page and the order checker's new mode, deployed after 0 of 963 real replies differed.

If I had to keep one thing, it would be the order: build the instrument first, and let it be the one that says no.

The gap between claim and caller is the product. It still is.
## Sources

<ol class="sources">
<li id="source-1"><a href="https://github.com/matthen/dstc" rel="external">DSTC2</a>, the second Dialog State Tracking Challenge: real calls to a restaurant-information bot, with the bot's own logs. <a href="#ref-1" aria-label="Back to text">↩</a></li>
<li id="source-2"><a href="https://github.com/cricketclub/gridspace-stanford-harper-valley" rel="external">HarperValleyBank</a>, an open corpus of call-centre conversations, people on both ends. <a href="#ref-2" aria-label="Back to text">↩</a></li>
<li id="source-3"><a href="https://github.com/snakers4/silero-vad" rel="external">Silero VAD</a>, the first of the two speech detectors; WebRTC's was the second. <a href="#ref-3" aria-label="Back to text">↩</a></li>
<li id="source-4"><a href="https://openbenchmarks.com/voice-agent-latency" rel="external">Openbenchmarks, voice agent latency</a>: the method for timing a wait from a recording. <a href="#ref-4" aria-label="Back to text">↩</a></li>
<li id="source-5"><a href="https://github.com/dograh-hq/dograh" rel="external">Dograh</a>, the open-source voice platform the live agent ran on. <a href="#ref-5" aria-label="Back to text">↩</a></li>
<li id="source-6"><a href="https://github.com/pipecat-ai/pipecat" rel="external">Pipecat</a>, the voice pipeline inside it, and under the first build. <a href="#ref-6" aria-label="Back to text">↩</a></li>
<li id="source-7"><a href="https://huggingface.co/datasets/nvidia/Nemotron-Personas-India" rel="external">Nemotron Personas India</a>, NVIDIA's synthetic Indian personas. <a href="#ref-7" aria-label="Back to text">↩</a></li>
<li id="source-8"><a href="https://github.com/AI4Bharat/IndicConformerASR" rel="external">IndicConformer</a>, AI4Bharat's open recogniser for Indian languages. <a href="#ref-8" aria-label="Back to text">↩</a></li>
<li id="source-9"><a href="https://apriori.work/methodology" rel="external">The instrument's method</a>, as published in August. <a href="#ref-9" aria-label="Back to text">↩</a></li>
</ol>
