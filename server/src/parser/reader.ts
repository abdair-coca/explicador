// Low-level reader for the JSX-like tags of EXL: elements, quoted attributes and text.
// It knows nothing about the catalog; `parse.ts` validates names, attributes and nesting.

export interface Attr {
  value: string;
  offset: number;
}

export interface Element {
  kind: 'element';
  name: string;
  attrs: Map<string, Attr>;
  children: Node[];
  selfClosing: boolean;
  offset: number;
}

export interface Text {
  kind: 'text';
  text: string;
  offset: number;
}

export type Node = Element | Text;

export class ExlSyntaxError extends Error {
  readonly offset: number;

  constructor(message: string, offset: number) {
    super(message);
    this.offset = offset;
  }
}

const NAME = /[A-Za-z][A-Za-z0-9_-]*/y;
const ATTR_NAME = /[A-Za-z_][A-Za-z0-9_-]*/y;
const WHITESPACE = /\s*/y;
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => ENTITIES[name] ?? '');
}

function match(pattern: RegExp, src: string, at: number): string | undefined {
  pattern.lastIndex = at;
  return pattern.exec(src)?.[0];
}

function skipWhitespace(src: string, at: number): number {
  return at + (match(WHITESPACE, src, at)?.length ?? 0);
}

/** Reads the element whose `<` is at `start`; returns it and the offset just after it. */
export function readElement(src: string, start: number): [Element, number] {
  const name = match(NAME, src, start + 1);
  if (!name) throw new ExlSyntaxError('Expected a tag name after "<" (write &lt; for a literal "<")', start);
  const element: Element = {
    kind: 'element',
    name,
    attrs: new Map(),
    children: [],
    selfClosing: false,
    offset: start,
  };
  let i = start + 1 + name.length;

  for (;;) {
    i = skipWhitespace(src, i);
    if (i >= src.length) throw new ExlSyntaxError(`Unexpected end of input inside the <${name}> tag`, start);
    if (src.startsWith('/>', i)) {
      element.selfClosing = true;
      return [element, i + 2];
    }
    if (src[i] === '>') {
      i += 1;
      break;
    }
    const attrName = match(ATTR_NAME, src, i);
    if (!attrName) throw new ExlSyntaxError(`Unexpected character "${src[i]}" in the <${name}> tag`, i);
    const attrOffset = i;
    i = skipWhitespace(src, i + attrName.length);
    if (i >= src.length) throw new ExlSyntaxError(`Unexpected end of input inside the <${name}> tag`, start);
    if (src[i] !== '=') {
      throw new ExlSyntaxError(`Attribute "${attrName}" in <${name}> needs a quoted value`, attrOffset);
    }
    i = skipWhitespace(src, i + 1);
    if (i >= src.length) throw new ExlSyntaxError(`Unexpected end of input inside the <${name}> tag`, start);
    const quote = src[i];
    if (quote === '{') {
      throw new ExlSyntaxError(
        `Embedded expressions are not allowed in EXL: give "${attrName}" a quoted string`,
        i,
      );
    }
    if (quote !== '"' && quote !== "'") {
      throw new ExlSyntaxError(`The value of "${attrName}" in <${name}> must be quoted`, i);
    }
    const close = src.indexOf(quote, i + 1);
    if (close === -1) throw new ExlSyntaxError(`Unexpected end of input inside the <${name}> tag`, start);
    if (element.attrs.has(attrName)) {
      throw new ExlSyntaxError(`Duplicate attribute "${attrName}" in <${name}>`, attrOffset);
    }
    element.attrs.set(attrName, { value: decodeEntities(src.slice(i + 1, close)), offset: attrOffset });
    i = close + 1;
  }

  for (;;) {
    const lt = src.indexOf('<', i);
    if (lt === -1) throw new ExlSyntaxError(`Unclosed <${name}>: expected </${name}>`, start);
    if (lt > i) element.children.push({ kind: 'text', text: decodeEntities(src.slice(i, lt)), offset: i });
    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4);
      if (end === -1) throw new ExlSyntaxError('Unclosed comment: expected -->', lt);
      i = end + 3;
    } else if (src.startsWith('</', lt)) {
      const closeName = match(NAME, src, lt + 2);
      const gt = skipWhitespace(src, lt + 2 + (closeName?.length ?? 0));
      if (!closeName || src[gt] !== '>') throw new ExlSyntaxError('Malformed closing tag', lt);
      if (closeName !== name) {
        throw new ExlSyntaxError(`Expected </${name}> but found </${closeName}>`, lt);
      }
      return [element, gt + 1];
    } else {
      const [child, end] = readElement(src, lt);
      element.children.push(child);
      i = end;
    }
  }
}
