/**
 * Everything the site says about Abhishek, in one place.
 *
 * Rule: his words only. Every line here comes from his answers (about-me.md),
 * his charter, or his own posts. Trim and reorder, never paraphrase. If a
 * line needs writing, leave a TODO for him instead.
 */

export const me = {
  name: 'Abhishek',
  email: 'abhishekvyasiitdelhi@gmail.com',
  /** The first thing anyone reads. Q9. */
  hello: ['I love to think', 'and overthink about things.'],
  hello2: 'And by things I mean everything. Art, music, AI, tech, brain rot, anything.',
  feral: 'It is a curious curiosity filled feral existence which I have been living.',
  where: 'Bangalore, for now.',
  whereNext: 'The idea and the vision is to never be in one place.',
  origin: [
    'Middle class boy from Jaipur.',
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
  obsession: 'Every quarter I pick up a new obsession.',
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

/** What's happening now. His Q11, Q18, Q20, Q28 answers, cut down. */
export const now = [
  { verb: 'Building', what: 'A score for lending in India, apart from the current CIBIL and Experian score.' },
  { verb: 'Writing', what: 'My poetry book. My fiction book. My short stories.' },
  { verb: 'Learning', what: 'To DJ, properly. As Wet Tissues, music for the sad and the horny people.' },
  { verb: 'Joining', what: 'A VC firm, in January.' },
  { verb: 'Planning', what: 'Stories of India. Local stories, voice notes from strangers.' },
  { verb: 'Obsessed with', what: 'Space. Project Hail Mary reignited my spark.' },
];

export const links = {
  substack: 'https://abhishekvyas02032001.substack.com',
  wasp: 'https://waspsignal.substack.com',
  letterboxd: 'https://letterboxd.com/abhishek5878/',
  github: 'https://github.com/abhishek5878',
  linkedin: 'https://www.linkedin.com/in/abhishek5878/',
  /** TODO(abhishek): paste the care-slot booking link. */
  care: '',
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
 * need his OK before launch.
 */
export const projects: Project[] = [
  { slug: 'signal-spark', name: 'Signal Spark', line: 'A quiet place to keep reminders of your own worth.', status: 'live', when: 'Oct 2026', tags: ['mental health', 'product'] },
  { slug: 'priya', name: 'Priya', line: 'A Hinglish voice agent that calls before your parcel goes back.', status: 'live', when: 'Aug 2026', tags: ['voice', 'agents'] },
  { slug: 'credit', name: 'A credit score for India', line: 'Apart from the current CIBIL and Experian score.', status: 'building', when: '2026', tags: ['lending', 'research'] },
  { slug: 'kairos', name: 'Kairos', line: 'Finding founders before they are obvious to the market.', why: 'Started as Mandrake at 3am after I resigned.', status: 'in use', when: 'Oct 2025', tags: ['vc', 'agents'] },
  { slug: 'life-os', name: 'Life OS', line: 'Pocket notebooks, a second brain, and this website.', why: 'I have to get my life back on.', status: 'building', when: 'Aug 2026', tags: ['personal'] },
  { slug: 'apriori', name: 'Apriori', line: 'AI personas walk through a product and predict who drops off, and why.', status: 'paused', when: 'Jun 2026', tags: ['agents', 'product', 'research'] },
  { slug: 'rocky', name: 'Rocky', line: 'A check-in for founders that compares you only to yourself.', status: 'paused', when: 'Aug 2026', tags: ['mental health', 'founders'], href: 'https://abhishek5878.github.io/rocky' },
  { slug: 'voice-instrument', name: 'Voice instrument', line: 'No independent Indian instrument exists.', status: 'paused', when: 'Aug 2026', tags: ['voice', 'tooling'] },
  { slug: 'sizing', name: 'Audience sizing', line: 'Sizing lender and insurer audiences, live.', status: 'shipped', when: 'Jun 2026', tags: ['lending', 'tooling'] },
  { slug: 'fewwords', name: 'fewwords', line: 'Checks an agent’s plan against rules before it runs.', status: 'stopped', when: 'Apr 2026', tags: ['agents', 'tooling'], href: 'https://github.com/abhishek5878/fewwords' },
  { slug: 'pitchrobin', name: 'PitchRobin', line: 'A digital twin for an investor or a high agency person.', status: 'stopped', when: 'Feb 2026', tags: ['vc', 'agents'] },
  { slug: 'sentinel', name: 'Sentinel', line: 'Talent misallocation is the biggest capital inefficiency.', status: 'stopped', when: 'Mar 2026', tags: ['vc', 'founders'] },
  { slug: 'life-agent', name: 'life_agent', line: 'A WhatsApp +1 that finishes household tasks.', status: 'stopped', when: 'May 2026', tags: ['agents', 'personal'] },
  { slug: 'life-track', name: 'life-track', line: 'An evening log of money, food, exercise and time.', status: 'stopped', when: 'Aug 2026', tags: ['personal'] },
  { slug: 'apexy', name: 'Apexy', line: 'Built in a day for a friend.', status: 'stopped', when: 'Aug 2026', tags: ['agents'] },
  { slug: 'glp1', name: 'GLP-1 India', line: 'Care for GLP-1 patients after the patent expires.', status: 'stopped', when: 'Apr 2026', tags: ['health'] },
  { slug: 'micro-pe', name: 'micro-PE hunt', line: 'Small software companies for sale, and how motivated the seller is.', status: 'stopped', when: 'Feb 2026', tags: ['finance', 'agents'] },
  { slug: 'indiastox', name: 'IndiaStox', line: 'A market data layer built for agents.', status: 'stopped', when: 'May 2026', tags: ['finance', 'agents'] },
  { slug: 'devflow', name: 'devflow', line: 'One memory across every AI coding tool.', status: 'stopped', when: 'Mar 2026', tags: ['tooling'] },
  { slug: 'warehouses', name: 'Warehouse finder', line: 'Warehouses in India, from satellite images.', status: 'stopped', when: 'May 2026', tags: ['agents'] },
  { slug: 'vc-scrapers', name: 'The first scrapers', line: 'The first step before WASP.', status: 'stopped', when: 'Sep 2025', tags: ['vc', 'research'] },
  { slug: 'project-kit', name: 'project-kit', line: 'How every new thing starts.', status: 'in use', when: 'Sep 2026', tags: ['tooling'] },
  { slug: 'this-site', name: 'This site', line: 'You are here.', status: 'building', when: 'Oct 2026', tags: ['personal'] },
];

/** Q20. His proudest, in his words. */
export const proud = [
  {
    name: 'Torch',
    line: 'We were able to predict top 30 companies in US market for 1 year forward returns, and we were able to beat the market as well.',
    note: 'The first project of my career and it felt really good.',
  },
  {
    name: 'WASP Signal',
    line: 'I was able to find people to invest upon, even before they were very obvious to the market.',
    note: 'Which in itself is a very big feat, I would say.',
  },
];

/** Q23: "somewhere in some drop-down menu… in my own language." TODO(abhishek): one line each, your words. */
export const jobs = [
  { when: 'Jan 2027', what: 'A VC firm' },
  { when: '2026', what: 'finbud, credit' },
  { when: '2026', what: 'Boardy' },
  { when: '2025', what: 'A healthcare startup, paused the second the regulatory reality showed up' },
  { when: 'Before', what: 'FREED, EXL, WorldQuant, Siemens, ShareChat, research at IIT Delhi, Torch' },
];

/** Q38. */
export const places = [
  { name: 'Palolem, South Goa', line: '' },
  { name: 'Mussoorie', line: 'My second home. I just go there whenever I’m feeling down.' },
  { name: 'Pushkar', line: 'Especially Pushkar.' },
  { name: 'Mumbai', line: 'I really love Mumbai.' },
];
