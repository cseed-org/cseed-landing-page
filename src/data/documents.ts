import { Marked } from 'marked';

/* Repository documents the site renders as pages. Each page reads its source file at
   build time, so editing the file in the repo is all it takes to update the page. */

// Links between the documents point at files in the repo; on the site they go to the pages.
// (The license page isn't /license/: Astro's dev server refuses page paths that match a file
// in the project root, and on Windows /license/ matches LICENSE.)
const PAGE_FOR_FILE: Record<string, string> = {
  LICENSE: '/mit-license/',
  'CONTENT-NOTICE.md': '/content-notice/',
};

const markdown = new Marked({
  walkTokens(token) {
    // The page supplies the one <h1>, so any heading the document opens with at that
    // level (LICENSE's underlined "License scope", for one) becomes a section heading.
    if (token.type === 'heading' && token.depth === 1) token.depth = 2;
    if (token.type === 'link' && token.href in PAGE_FOR_FILE)
      token.href = PAGE_FOR_FILE[token.href];
  },
});

/** Renders a markdown document to HTML, minus its own "# ..." title line. */
export function renderDocument(raw: string): string {
  return markdown.parse(raw.replace(/\r\n/g, '\n').replace(/^#[^\n]*\n/, '')) as string;
}
