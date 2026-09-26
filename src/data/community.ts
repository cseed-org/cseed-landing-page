// The cseed team shown on /about-us/. Headshots live in public/images/team/<slug>.webp.
export const TEAM: { name: string; photo: string }[] = [
  ['Adam Esayas', 'adam-esayas'],
  ['Angela Wu', 'angela-wu'],
  ['Avi Agola', 'avi-agola'],
  ['Ishaan Awasthi', 'ishaan-awasthi'],
  ['Maia Womack', 'maia-womack'],
  ['Maya Ma', 'maya-ma'],
  ['Nel Alaimaleata', 'nel-alaimaleata'],
  ['Shiloh Dhasan', 'shiloh-dhasan'],
  ['Shuhui Yang', 'shuhui-yang'],
  ['Surya Duraivenkatesh', 'surya-duraivenkatesh'],
  ['Talal Kheiry', 'talal-kheiry'],
  ['Victoria Tchervenski', 'victoria-tchervenski'],
].map(([name, slug]) => ({ name, photo: `/images/team/${slug}.webp` }));

// Real members, pasted in one-per-line by hand: see src/data/members.txt for the format.
// `?raw` gives us the file's text content directly, no backend needed.
import rawMembers from './members.txt?raw';

function parsePastedMembers(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

// Placeholder members wall, same seeded generator as the source, so the wall still has
// something to show (the same 1,040 names) until real names are pasted into members.txt.
function placeholderMembers(): string[] {
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
}

const pastedMembers = parsePastedMembers(rawMembers);

// The wall/count pages alphabetize and letter-group whatever's in this array, so once real
// names are pasted into members.txt they show up organized the same way automatically.
export const ABOUT_MEMBERS: string[] =
  pastedMembers.length > 0 ? pastedMembers : placeholderMembers();

export const ABOUT_STATS = [
  { value: ABOUT_MEMBERS.length.toLocaleString('en-US'), label: 'members' },
  { value: '300+', label: 'projects' },
  { value: 'unlimited', label: 'potential' },
];
