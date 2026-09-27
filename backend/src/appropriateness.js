import { cleanText } from './cleaning.js';

export class ValidationError extends Error {}
export const LIMITS = {
  first_name: 100,
  last_name: 100,
  preferred_name: 100,
  pronouns: 80,
  major: 160,
  grad_year: 32,
  demographics: 160,
  campus: 20,
  uw_email: 254,
  cs_email: 254,
  why: 1000,
  heard_other: 200,
  more: 3000,
};
const REFERRALS = [
  'Instagram',
  'A friend',
  'Class announcement',
  'RSO fair',
  'Discord',
  'Newsletter',
  'Poster on campus',
  'other...',
];
const CSE_MAJORS = [
  'Computer Science',
  'Computer Engineering',
  'Electrical Engineering',
  'Intended CSE',
];
const fail = (message) => {
  throw new ValidationError(message);
};

export function validateMembership(raw, now = new Date()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('Invalid submission structure.');
  const allowed = new Set([
    ...Object.keys(LIMITS),
    'submission_id',
    'heard_about',
    'code_of_conduct',
    'photo_consent',
    'turnstile_token',
    'website',
  ]);
  if (Object.keys(raw).some((key) => !allowed.has(key))) fail('Unexpected submission field.');
  if (
    typeof raw.submission_id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      raw.submission_id,
    )
  )
    fail('Invalid submission ID.');
  if (raw.website !== undefined && raw.website !== '') fail('Unable to accept this submission.');
  const result = { submission_id: raw.submission_id.toLowerCase() };
  for (const [key, limit] of Object.entries(LIMITS)) {
    const value = raw[key];
    if (value == null) {
      result[key] = null;
      continue;
    }
    if (typeof value !== 'string' || value.length > limit)
      fail(`${key}: maximum ${limit} characters.`);
    // Reject markup and invisible control characters rather than silently changing meaning.
    if (
      /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b\u202a-\u202e\u2066-\u2069\ufeff]/u.test(
        value,
      )
    )
      fail(`${key}: use plain text without markup or control characters.`);
    result[key] = cleanText(value, key === 'more') || null;
  }
  for (const key of ['first_name', 'last_name', 'major', 'grad_year', 'why']) {
    if (!result[key]) fail(`${key}: please enter an answer.`);
  }
  if (result.campus && !['Seattle', 'Bothell', 'Tacoma'].includes(result.campus))
    fail('Choose a listed campus.');
  const graduation = /^(Winter|Spring|Summer|Autumn) (\d{4})$/.exec(result.grad_year);
  if (
    !graduation ||
    +graduation[2] < now.getUTCFullYear() ||
    +graduation[2] > now.getUTCFullYear() + 5
  )
    fail('Choose a graduation term within the next six years.');
  for (const [key, domain] of [
    ['uw_email', 'uw.edu'],
    ['cs_email', 'cs.washington.edu'],
  ]) {
    if (!result[key]) continue;
    result[key] = result[key].toLowerCase();
    const [local, host, extra] = result[key].split('@');
    if (
      extra !== undefined ||
      host !== domain ||
      !/^[a-z0-9!#$%&'*+\-/=?^_`{|}~]+(?:\.[a-z0-9!#$%&'*+\-/=?^_`{|}~]+)*$/.test(local) ||
      local.length > 64
    )
      fail('Use a valid UW or CSE email address.');
  }
  const needsCse = CSE_MAJORS.some((major) => major.toLowerCase() === result.major.toLowerCase());
  if (needsCse ? !result.cs_email || result.uw_email : !result.uw_email || result.cs_email)
    fail('Provide the school email requested for your major.');
  if (raw.code_of_conduct !== true) fail('Please agree to the membership agreement.');
  if (raw.photo_consent !== undefined && typeof raw.photo_consent !== 'boolean')
    fail('Invalid photo consent.');
  result.code_of_conduct = true;
  result.photo_consent = raw.photo_consent ?? false;
  const heard = raw.heard_about ?? [];
  if (
    !Array.isArray(heard) ||
    heard.length > REFERRALS.length ||
    heard.some((item) => !REFERRALS.includes(item))
  )
    fail('Choose listed referral options.');
  result.heard_about = [...new Set(heard)];
  if (result.heard_about.includes('other...') && !result.heard_other)
    fail('Tell us how you heard about us.');
  if (!result.heard_about.includes('other...') && result.heard_other)
    fail('Select other to enter a referral answer.');
  return result;
}
