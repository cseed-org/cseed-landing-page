// The cseed team shown on /about-us/. Headshots live in public/images/team/<filename>.
export const TEAM: { name: string; photo: string }[] = [
  ['Leonard Paya', 'leonard.jpg'],
  ['Angela Wu', 'angela-wu'],
  ['Ishaan Awasthi', 'ishaan-awasthi'],
  ['Shiloh Dhasan', 'shiloh-dhasan'],
  ['Talal Kheiry', 'talal-kheiry'],
  ['Adam Esayas', 'adam-esayas'],
  ['Avi Agola', 'avi-agola'],
  ['Maia Womack', 'maia-womack'],
  ['Maya Ma', 'maya-ma'],
  ['Nel Alaimaleata', 'nel-alaimaleata'],
  // ['Shuhui Yang', 'shuhui-yang'], // hidden for now
  ['Surya Duraivenkatesh', 'surya-duraivenkatesh'],
  ['Victoria Tchervenski', 'victoria-tchervenski'],
].map(([name, slug]) => ({
  name,
  photo: `/images/team/${slug.includes('.') ? slug : `${slug}.webp`}`,
}));
