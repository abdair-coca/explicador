// Where a short piece of code may wrap: after `_`, `.`, `(`, `,` and `=`, and inside camelCase, the way an editor would, so a narrow tile
// shows "train_test_ / split()" instead of breaking in the middle of a word.

/** The text cut after each break point; joining the parts gives the text back. */
export function codeBreaks(text: string): string[] {
  return text.split(/(?<=[_.(,=])(?=.)|(?<=\p{Ll})(?=\p{Lu})/u);
}
