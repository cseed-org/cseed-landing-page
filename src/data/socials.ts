/** cseed's social profiles, shared by the footer icons and the join page's welcome step. */

// Discord invite link; links to it hide if this is emptied.
export const DISCORD_URL = 'https://discord.gg/mRZ3v7XE5k';

export type SocialIconName = 'instagram' | 'linkedin' | 'discord';

interface Social {
  label: string;
  href: string;
  icon: SocialIconName;
}

const profiles: Social[] = [
  { label: 'Instagram', href: 'https://www.instagram.com/cseeduw/', icon: 'instagram' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/cseeduw/posts/', icon: 'linkedin' },
  { label: 'Discord', href: DISCORD_URL, icon: 'discord' },
];

export const SOCIALS = profiles.filter((s) => s.href);
