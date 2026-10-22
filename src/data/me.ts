/**
 * Everything the site says about Abhishek, in one place.
 *
 * Rule: his words only. Every line here comes from his answers (about-me.md),
 * his charter, or his own posts. Trim and reorder, never paraphrase. If a
 * line needs writing, leave a TODO for him instead.
 *
 * `now` and `projects` live in now.json and projects.json so /tend can edit them;
 * this module re-exports them with the same names and types.
 */
import nowJson from './now.json';
import projectsJson from './projects.json';

export const me = {
  name: 'Abhishek',
  /** Only in structured data and llms.txt, so agents know which Abhishek. His OK, 22 Oct 2026. */
  fullName: 'Abhishek Vyas',
  alumniOf: 'IIT Delhi',
  email: 'abhishekvyasiitdelhi@gmail.com',
  /**
   * The first thing anyone reads, everywhere: Michael Scott's whiteboard from
   * The Office. His pick (22 Oct 2026): "Michael Scott everywhere." Two beats:
   * the quote and its Gretzky credit land first, then "– Michael Scott" lands late.
   * Don't bring back "I love to think and overthink about things." He cut it.
   */
  epigraph: {
    lines: ['“You miss 100% of the shots you don’t take. – Wayne Gretzky”', '– Michael Scott'],
    by: 'Michael Scott',
    image: {
      webp: '/media/scott.webp',
      jpg: '/media/scott.jpg',
      width: 600,
      height: 315,
      alt: 'Michael Scott in The Office, sitting under a whiteboard that reads: “You miss 100% of the shots you don’t take. – Wayne Gretzky” – Michael Scott',
    },
  },
  /**
   * The hello, on the homepage (under the hero) and /start/. "I’m Abhishek.", then his
   * words from his first brief for this site (his first message, 22 Oct 2026):
   * "This will be my second place to jot down everything." `line` is that sentence
   * trimmed to the phrase; `verbatim` keeps it whole.
   */
  home: {
    hello: 'I’m Abhishek.',
    line: 'My second place to jot down everything.',
    verbatim: 'This will be my second place to jot down everything.',
  },
  /** Q9, the end of his answer. */
  interests: 'Art, music, AI, tech, brain rot, anything.',
  feral: 'It is a curious curiosity filled feral existence which I have been living.',
  where: 'Bangalore, for now.',
  whereNext: 'The idea and the vision is to never be in one place.',
  origin: [
    'Boy from Jaipur.',
    'Then somehow reach IIT Delhi.',
    'Then somehow survived two years in Delhi NCR.',
    'Then had the idea and the courage to just start up and reach Bangalore.',
  ],
  /** Q2, trimmed. */
  closeTheTab: 'This person lives the life his way, and he does a lot many things.',
  pause: 'A pause in their metrics to see how deeply a human being can build things and feel things.',
  /** Q50. */
  simple: 'This is simple. Anyone can do.',
  /** Q11. */
  consume: 'I want to consume things and then build things as well.',
  /**
   * Leads Taste on the homepage and /taste/. His pick (22 Oct 2026), replacing `consume`.
   * Jim Jarmusch, rule #5 of his golden rules, MovieMaker magazine, Jan 2004. Trimmed
   * to its first two sentences.
   */
  tasteLead: {
    text: 'Nothing is original. Steal from anywhere that resonates with inspiration or fuels your imagination.',
    by: 'Jim Jarmusch',
  },
  obsession: 'Every quarter I pick up a new obsession.',
  /**
   * Q33, verbatim from "is more about my life…", split for the Writing page:
   * the long setup, then the turn.
   */
  writesAbout: {
    setup: 'My life, what I want to do, what I’m thinking, what should be there. Human life, politics, God, religion, heartbreak, pain, grief, damage, I don’t know,',
    punch: 'so many things.',
  },
  /** Q17. */
  allTheWork: 'I’m all the work.',
  stopped: 'There is a lot of projects which I stopped say midway or in the middle, and I will complete that too.',
  /** Q12. */
  oneMoreTime: 'All I need to do right now is to try one more time.',
  /** Q13. The whole answer. */
  twoAm: 'everything',
  /** Q14. */
  genuine: 'Genuine, real, is my forte.',
  noSell: 'I never want to be someone who uses this to sell something. No sell.',
  /** Q8. */
  whyPost:
    'When you paint a picture, you don’t paint it for the money it will sell out for. You paint it for the excitement, the high you get in the process of painting that picture, writing that poem.',
  /** Q3. */
  sameDoor: 'It should be same for everyone. No special treatment for anybody.',
  /** Q9, to a founder. */
  founder: 'I’m just curious about your mental model and your insight and your motivation to do this thing.',
  music: 'Music really saved my life.',
  /** Q10, as his friends say it. */
  friends: ['caring', 'passionate', 'stupid', 'smart', 'weirdo'],
};

/** ~/inner_core/map.md. Confirmed: "That's the one." */
export const charter = [
  'Say who you are in your life and in your work.',
  'Let someone who is lost, old, or not yet born find that writing; your work will be a record of your life.',
  'You will help them feel less lonely in their own world. They will recognize themselves, and you will give them the most important thing of all: hope.',
  'Try not to sell; live your life with ultimate playfulness, happiness, and kindness.',
  'Be nobody but yourself in a world that does its best night and day.',
  'This is something I want to pursue wholeheartedly.',
];

export type Now = { verb: string; short: string; what: string };

/**
 * What's happening now. His Q11, Q18, Q20, Q28 answers, cut down.
 * `short` is the same line trimmed further, for the bubbles in the hero:
 * read as one phrase, "Building a score for lending in India".
 * Lives in now.json so /tend can edit it.
 */
export const now: Now[] = nowJson as Now[];

export const links = {
  substack: 'https://abhishekvyas02032001.substack.com',
  wasp: 'https://waspsignal.substack.com',
  letterboxd: 'https://letterboxd.com/abhishek5878/',
  github: 'https://github.com/abhishek5878',
  linkedin: 'https://www.linkedin.com/in/abhishek5878/',
  /** TODO(abhishek): paste the care-slot booking link. */
  care: '',
};

/**
 * The ask-me-anything box posts to Web3Forms, which emails me.email.
 * The access key is public by design (Web3Forms: "safe to use in client-side code").
 * Form "vyas.garden ask", created 22 Oct 2026. Free plan: 250 messages a month.
 */
export const ask = {
  endpoint: 'https://api.web3forms.com/submit',
  accessKey: '6a341c91-2ada-444a-a9a9-f2ed50937847',
  subject: 'Someone asked you something on vyas.garden',
};

export type Status = 'live' | 'in use' | 'building' | 'paused' | 'stopped' | 'shipped';

export type Project = {
  slug: string;
  name: string;
  /** One line. From his docs where one exists; TODO where it doesn't. */
  line: string;
  why?: string;
  status: Status;
  when: string;
  tags: string[];
  href?: string;
};

/**
 * All of it, unfinished included (Q17: "I'm all the work").
 * Source: projects-draft.md. Lines marked draft are mine from his documents and
 * need his OK before launch. Lives in projects.json so /tend can edit it.
 */
export const projects: Project[] = projectsJson as Project[];

/** Q20. His proudest, in his words. */
export const proud = [
  {
    name: 'My first internship, at an asset manager',
    line: 'We were able to predict top 30 companies in US market for 1 year forward returns, and we were able to beat the market as well.',
    note: 'The first project of my career and it felt really good.',
  },
  {
    name: 'WASP Signal',
    line: 'I was able to find people to invest upon, even before they were very obvious to the market.',
    note: 'Which in itself is a very big feat, I would say.',
  },
];

/**
 * Q23: "somewhere in some drop-down menu… in my own language." TODO(abhishek): one line each, your words.
 * His rule (23 Oct 2026): Apriori is the only company named. Every other place is described, never named.
 */
export const jobs = [
  { when: 'Jan 2027', what: 'A VC fund' },
  { when: 'Apr 2026 →', what: 'Part-time with a public fintech company: credit and audience data' },
  { when: 'Jan 2026', what: 'Scouting founders for a venture fund, till May' },
  { when: 'Aug 2025', what: 'A healthcare startup, paused the second the regulatory reality showed up' },
  { when: 'Jun 2025 →', what: 'Advisor and builder at Apriori' },
  { when: 'Jul 2024', what: 'A data scientist job at a startup, for a year' },
  { when: 'Before', what: 'Assistant manager at an analytics firm, research for a quant firm, two data science internships, research at IIT Delhi, and my first internship, at an asset manager' },
];

/** Q38. */
export const places = [
  { name: 'Palolem, South Goa', line: '' },
  { name: 'Mussoorie', line: 'My second home. I just go there whenever I’m feeling down.' },
  { name: 'Pushkar', line: 'Especially Pushkar.' },
  { name: 'Mumbai', line: 'I really love Mumbai.' },
];
