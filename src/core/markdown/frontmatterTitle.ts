const FRONTMATTER_RE = /^---(\r?\n)([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Quote a title only when plain YAML would misread it (":", "#", leading symbols...). */
function yamlTitle(title: string): string {
  const needsQuotes = /[:#]|^[\s\-?!&*@`'"[\]{}|>%,]|\s$/.test(title);
  return needsQuotes ? JSON.stringify(title) : title;
}

/**
 * Set the `title:` of a note's frontmatter, touching only that one line.
 * Every other byte of the document (other keys, body, line endings) is preserved.
 */
export function setFrontmatterTitle(raw: string, title: string): string {
  const line = `title: ${yamlTitle(title)}`;
  const match = raw.match(FRONTMATTER_RE);

  if (!match) {
    return `---\n${line}\n---\n\n${raw}`;
  }

  const eol = match[1];
  const fmStart = 3 + eol.length;
  const fmBody = match[2];
  const titleRe = /^title:.*$/m;

  const newFmBody = titleRe.test(fmBody)
    ? fmBody.replace(titleRe, line)
    : `${line}${eol}${fmBody}`;

  return raw.slice(0, fmStart) + newFmBody + raw.slice(fmStart + fmBody.length);
}
