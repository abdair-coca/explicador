# rag example

A tiny retrieval pipeline over a help center, small enough to check every number by hand: the deep-dive example of Explicador (`examples/scenes/rag.exl.md`).

- `data/help-center.md`: 12 paragraphs, the chunks.
- `src/embed.js`: the embedding model, a dictionary of 8 meanings; each text becomes 8 numbers of total length 1.
- `src/store.js`: the vector store, one row per chunk in `data/store.json`.
- `src/index.js`: the index, spherical k-means with 4 clusters.
- `src/search.js`: embeds the question, sends it to its cluster, scores the rows there by cosine and keeps the best 3.
- `src/similarity.js`: the cosine similarity.
- `src/project.js`: a 2-D view of the vectors for the picture.

`npm run demo` runs it all and prints every number the scene shows.
