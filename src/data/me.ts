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
 * Work history, as he wrote it on LinkedIn (refreshed 24 Nov 2026): "make it as it is written on
 * linkedin, i wrote that". His words, verbatim; `more` holds the paragraphs under a role.
 * This list is the one place employers are named: everywhere else on the site, Apriori is the only
 * company named (his rule, 23 Oct 2026).
 */
export const jobs: { when: string; what: string; more?: string[] }[] = [
  {
    when: 'Apr 2026 – Nov 2026',
    what: 'EiR, public fintech co',
    more: [
      'EiR at a major public Indian fintech that holds credit-bureau data on 160M+ people, I majorly took up AI initiatives, the layer on top of their data: system one models that read a person\'s entire credit history(reimagining the credit score for India), agents that let non-technical teams do data science(infra for anybody to do anything agent, tried to prove the "AI-native" tag) and the cohort engine behind 30+ client audiences for India\'s leading banks, insurers and consumer brands. A LOT of FUN and tokens!!',
    ],
  },
  { when: 'Mar 2026 – Nov 2026', what: 'Builder, Apriori' },
  {
    when: 'Jul 2025 – Nov 2026',
    what: 'Founder, Stealth Startup',
    more: [
      'attempt-1: started out in many directions, finally saw a gap in venture ecosystem so spent the months building and breaking things around how decisions actually get made in venture. Started with a preventive healthcare idea, paused it once the regulatory reality hit. Then went deep into something that kept bothering me: how hard it is to spot real signal early, before consensus, before noise takes over. Built an early-stage sourcing system from scratch, messy, opinionated, and very hands-on. Pulled in 200+ pre-seed and seed opportunities, sat with them, filtered them, broke my own assumptions, rebuilt the system again. A few made it through IC-level conversations. Most didn’t and that was the point. Went very deep into founder archetypes and whatnot, stopped at last as business outcomes wasn\'t that clear for this, either I had to start angel investing for the deals I\'m sourcing or sell to some particular firms, one option has little less money and for other option I needed to have money(lol)',
      'attempt-2: started with a simple thesis, building products has become dramatically faster and figuring out what to build is still painfully slow(still true) so we built a product that allows thousands of synthetic user through your product flow, each one thinks, reacts, hesitates, and decides, trying to get the WHY behind every drop-off. So much fun doing and solving a very difficult problem statement, it\'s just a research paper at the end but FUN(https://arxiv.org/abs/2605.29400), build this with Rahul and Yash, my +1 seniors',
      'attempt-3: Voice AI built for one job: getting the order delivered, got to know about so many pieces in voice infrastructure, how random Indian callers are, why these benchmarks and open weights work and break in the production, best of the times building this again with two of my iit delhi mates, Rahul and Yash, at the time of writing they are still going force down in solving for voice AI layer for D2C brands',
    ],
  },
  {
    when: 'Jul 2024 – Jul 2025',
    what: 'Data Scientist, FREED',
    more: [
      'Joined in as a “Data Scientist”, learnt almost everything on how a startup works.',
      'New flagship product ideation, Funnel optimisation, Customer behaviour modelling, AI agents for customer insights, API development, list can go on and limit would be reached.',
      'Onto building my own startup with learnings of this awesome experience, upwards and onwards',
    ],
  },
  { when: 'Aug 2023 – Jul 2024', what: 'Assistant Manager, EXL' },
  { when: 'Apr 2023 – Jun 2023', what: 'Research Consultant, WorldQuant' },
  { when: 'Feb 2023 – Mar 2023', what: 'Data Science Intern, Siemens' },
  { when: 'Mar 2022 – Jun 2022', what: 'Data Science, ShareChat' },
  {
    when: 'Jan 2022 – Mar 2022',
    what: 'Undergraduate Research Assistant, Indian Institute of Technology, Delhi',
    more: [
      'Won SURA(Summer Undergraduate Research Award), worked with Prof. N.M. Anoop Krishnan and Sayam Singla. We worked on using ML to explain the genome of chalcogenide glasses.',
      'This was the perfect ML 101 for me where I could see applications of machine learning in field of material science. Another major intellectually stimulating experience!!',
      'Our work eventually ended up in a research paper, big up to Md. Zaki!!',
    ],
  },
  {
    when: 'Oct 2021 – Mar 2022',
    what: 'Quantitative Strategist, Torch Investment Management',
    more: [
      'Best first internship experience possible, beat their flagship model’s CAGR by 7%, major high for a 19 year old',
      'Started coding and going more into ML research, PyTorch, codeforces just for the fun of it.',
      'This was the first inflection point!!',
    ],
  },
  { when: 'Education', what: 'Indian Institute of Technology, Delhi, Bachelor of Technology' },
];

/** Q38. */
export const places = [
  { name: 'Palolem, South Goa', line: '' },
  { name: 'Mussoorie', line: 'My second home. I just go there whenever I’m feeling down.' },
  { name: 'Pushkar', line: 'Especially Pushkar.' },
  { name: 'Mumbai', line: 'I really love Mumbai.' },
];
