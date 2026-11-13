# Current Task

## F21a. One source of truth for the catalog

**Goal:** what the model reads about EXL (tool descriptions, server instructions, `SKILL.md`, `presenting.md`, `docs/EXL.md`) always matches what the parser accepts, and tests fail when it drifts.

**Files:**
- `server/src/parser/common.ts`, `server/src/parser/parse.ts`: export the top-level tags with the catalog.
- `server/src/tools.ts`: `render_scene`'s `exl` description and `instructions` list the tags from the catalog.
- `server/test/catalog.test.ts` (new): the consistency checks.
- `docs/EXL.md`, `skills/explicador/SKILL.md`, `skills/explicador/presenting.md`: the drift the tests find.

**Plan:**
1. Move `topLevelTags` next to `catalog` and export both from the parser.
2. Build the tag list of `render_scene` and `instructions` from them.
3. Tests:
   - every tag in the catalog has a row in the table of `docs/EXL.md`; its attributes are exactly the catalog's, with the required ones marked "(required)"; its children are named in its content cell; the top-level list in "Document" names every top-level tag;
   - every tag appears in `SKILL.md`, and every attribute other than a block's `id` appears on a line that names its tag;
   - every component (top-level tag except `<chapter>` and `<theme>`) is in the table "Which component for which question" of `presenting.md`;
   - every EXL code block in `SKILL.md`, `presenting.md` and `docs/EXL.md` parses (the templates already must draw no warning);
   - the descriptions of `render_scene` and `instructions` name every top-level tag.
4. Fix the drift until they pass.

**Validation:** `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`.

**Results:** typecheck 0, lint 0, build OK, server 203/203 (9 new in `catalog.test.ts`), viewer 162/162. Drift fixed in `docs/EXL.md` (six missing rows, `theme`/`stage`/`dims`/curve parameters, `<code>` children, the top-level list) and `SKILL.md` (`title` on `<stats>`, the optional `id` sentence, the example tagged ```exl).
