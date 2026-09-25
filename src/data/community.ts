// Placeholder people data, transcribed from the design's ui_kits/about-us/AboutParts.jsx.

export const ABOUT_TEAM: { key: string; tag: string; members: [string, string][] }[] = [
  {
    key: 'general',
    tag: 'the general team',
    members: [
      ['Maya Chen', 'president'],
      ['Jordan Reyes', 'vice president'],
      ['Priya Patel', 'operations'],
      ['Sam Okafor', 'events'],
      ['Lena Park', 'finance'],
      ['Theo Russo', 'outreach'],
    ],
  },
  {
    key: 'design',
    tag: 'design + media',
    members: [
      ['Ava Lindqvist', 'design lead'],
      ['Noah Kim', 'designer'],
      ['Isla Moreno', 'media lead'],
      ['Kai Tanaka', 'photographer'],
    ],
  },
  {
    key: 'buildspace',
    tag: 'buildspace',
    members: [
      ['Ethan Wright', 'lead'],
      ['Zara Ahmed', 'lead'],
      ['Leo Novak', 'mentor'],
      ['Mia Santos', 'mentor'],
      ['Omar Haddad', 'mentor'],
      ['Ruby Clarke', 'coordinator'],
    ],
  },
  {
    key: 'buildher',
    tag: 'buildher',
    members: [
      ['Nina Osei', 'lead'],
      ['Chloe Martin', 'lead'],
      ['Hana Suzuki', 'workshops'],
      ['Grace Liu', 'community'],
    ],
  },
];

// Same seeded generator as the source, so the wall lists the same 1,040 names.
export const ABOUT_MEMBERS: string[] = (() => {
  const f =
    'Aaron Abby Adam Aiden Aisha Alex Ali Amara Amir Ana Ben Bella Cam Carlos Cleo Dana Dev Diego Eli Ella Emma Eric Eva Finn Gabe Gia Hugo Ian Ivy Jack Jade Jay Jin June Kara Leah Liam Lila Luca Luna Max Mei Milo Nadia Nate Nora Olive Owen Pia Quinn Raj Rosa Ryan Sara Sofia Tara Tom Uma Vera Will Yara Zoe'.split(
      ' ',
    );
  const l =
    'Adams Ali Baker Bose Brooks Cruz Diaz Evans Fox Garcia Gray Hall Hayes Ito James Jung Khan Kim Lam Lee Lopez Ma Mehta Nguyen Ng Ortiz Park Patel Price Quinn Rao Reed Rossi Ruiz Shah Singh Stone Tan Torres Vu Wang Ward Wong Wu Yang Young Zhou'.split(
      ' ',
    );
  const out = new Set<string>();
  let s = 7;
  const r = (n: number) => {
    s = (s * 9301 + 49297) % 233280;
    return Math.floor((s / 233280) * n);
  };
  while (out.size < 1040) out.add(f[r(f.length)] + ' ' + l[r(l.length)]);
  return [...out];
})();

export const ABOUT_STATS = [
  { value: ABOUT_MEMBERS.length.toLocaleString('en-US'), label: 'members' },
  { value: '300+', label: 'projects' },
  { value: 'unlimited', label: 'potential' },
];
