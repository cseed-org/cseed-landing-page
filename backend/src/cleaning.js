// Normalize plain text without stripping punctuation, accents, or non-Latin names.
export function cleanText(value, multiline = false) {
  const text = value.normalize('NFC').replace(/\r\n?/g, '\n').trim();
  return multiline
    ? text
        .split('\n')
        .map((line) => line.replace(/[\t\p{Zs}]+/gu, ' ').trim())
        .join('\n')
    : text.replace(/\s+/gu, ' ');
}
