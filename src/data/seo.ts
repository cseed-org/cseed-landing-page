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
  /** Important images actually displayed on this page, for image search discovery. */
  images?: string[];
  type?: 'AboutPage' | 'WebPage';
}

export const SEO_PAGES: Record<string, PageSEO> = {
  '/': {
    title: 'cseed',
    description:
      'Find your community of builders at the University of Washington and across Seattle. Explore cseed programs, build your ideas, and become a member.',
    label: 'Home',
    images: ['/images/hero.webp', '/images/community-wide.webp'],
  },
  '/about-us/': {
    title: 'cseed | about us',
    description:
      'Meet the cseed team and discover our mission: helping engineers, designers, and creators at UW and across Seattle turn what they care about into reality.',
    label: 'About us',
    type: 'AboutPage',
  },
  '/buildspace/': {
    title: 'cseed | buildspace',
    description:
      'Build a passion project with cseed buildspace. Find community, mentorship, and weekly accountability, then showcase what you create after six weeks.',
    label: 'buildspace',
    images: [
      '/images/buildspace/intro-cohort3.webp',
      '/images/buildspace/what-passion.webp',
      '/images/buildspace/what-community.webp',
      '/images/buildspace/what-showcase.webp',
    ],
  },
  '/buildher/': {
    title: 'cseed | buildher',
    description:
      'Explore entrepreneurship with buildher: an inclusive cseed community for women and non-binary students, with workshops, mentorship, and a six-week cohort.',
    label: 'buildher',
    images: [
      '/images/buildher/community.webp',
      '/images/buildher/launchpad.webp',
      '/images/buildher/mentors.webp',
    ],
  },
  '/saturdays/': {
    title: 'cseed | saturdays',
    description:
      'Bring your laptop and ideas to saturdays, cseed’s weekly build session. Members can work on a project or find one with the community. No cohort required.',
    label: 'saturdays',
  },
  '/join/': {
    title: 'cseed | join',
    description:
      'Apply to join cseed, a community for University of Washington student builders. Open to all majors at UW Seattle, Bothell, and Tacoma. Build with us.',
    label: 'Join cseed',
  },
  '/code-of-conduct/': {
    title: 'cseed | code of conduct',
    description:
      'Read the cseed member code of conduct and learn the expectations for participating in our community of builders, programs, and events.',
    label: 'Member code of conduct',
  },
  '/mit-license/': {
    title: 'cseed | mit license',
    description:
      'Read the MIT license for the cseed website template code, including the frontend, backend, styles, and scripts you can reuse for your own community site.',
    label: 'Code license',
  },
  '/content-notice/': {
    title: 'cseed | content notice',
    description:
      'The cseed website copy, photographs, logos, and branding are all rights reserved. See which materials are excluded from the MIT license and how to reuse the template.',
    label: 'Content and brand rights',
  },
};

export function canonicalPath(pathname: string): string {
  return pathname === '/' ? '/' : `${pathname.replace(/\/+$/, '')}/`;
}
