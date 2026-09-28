/** Shared by page metadata, sitemap, and the optional AI reading guide. */
export const SITE_URL = 'https://cseed.co';
export const ORGANIZATION_DESCRIPTION =
  'cseed is a community of builders at the University of Washington and across Seattle, helping students explore projects, creativity, and entrepreneurship.';

export const SOCIAL_PROFILES = [
  'https://www.instagram.com/cseeduw/',
  'https://www.linkedin.com/company/cseeduw/',
  'https://github.com/cseed-org',
];

interface PageSEO {
  title: string;
  description: string;
  label: string;
  type?: 'AboutPage' | 'WebPage';
}

export const SEO_PAGES: Record<string, PageSEO> = {
  '/': {
    title: 'cseed | UW Builder Community & Entrepreneurship in Seattle',
    description:
      'Find your community of builders at the University of Washington and across Seattle. Explore cseed programs, build your ideas, and become a member.',
    label: 'Home',
  },
  '/about-us/': {
    title: 'About cseed | A Community of Builders at UW & in Seattle',
    description:
      'Meet the cseed team and discover our mission: helping engineers, designers, and creators at UW and across Seattle turn what they care about into reality.',
    label: 'About us',
    type: 'AboutPage',
  },
  '/buildspace/': {
    title: 'buildspace | Build Your Passion Project with cseed at UW',
    description:
      'Build a passion project with cseed buildspace. Find community, mentorship, and weekly accountability, then showcase what you create after six weeks.',
    label: 'buildspace',
  },
  '/buildher/': {
    title: 'buildher | Women & Non-Binary Builders at cseed',
    description:
      'Explore entrepreneurship with buildher: an inclusive cseed community for women and non-binary students, with workshops, mentorship, and a six-week cohort.',
    label: 'buildher',
  },
  '/saturdays/': {
    title: 'saturdays | Weekly Build Sessions with cseed',
    description:
      'Bring your laptop and ideas to saturdays, cseed’s weekly build session. Members can work on a project or find one with the community. No cohort required.',
    label: 'saturdays',
  },
  '/join/': {
    title: 'Join cseed | UW Student Builder Community',
    description:
      'Apply to join cseed, a community for University of Washington student builders. Open to all majors at UW Seattle, Bothell, and Tacoma. Build with us.',
    label: 'Join cseed',
  },
  '/code-of-conduct/': {
    title: 'Member Code of Conduct | cseed',
    description:
      'Read the cseed member code of conduct and learn the expectations for participating in our community of builders, programs, and events.',
    label: 'Member code of conduct',
  },
};

export function canonicalPath(pathname: string): string {
  return pathname === '/' ? '/' : `${pathname.replace(/\/+$/, '')}/`;
}
