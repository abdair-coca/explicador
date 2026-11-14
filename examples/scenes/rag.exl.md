# How does a question find its answer in the help center?

<brief form="process">
<audience>Developers who have used a search box but never built one; they know arrays and JSON</audience>
<question>How does the help center find the paragraph that answers a customer's question?</question>
<example>The question "When do I get my money back?" finds the refunds chunk with a cosine of 0.988</example>
<misconception>Believing the question is compared with all 12 chunks, word by word</misconception>
<check>Predict which of two chunks scores higher and which meaning makes the difference</check>
<terms>embedding, vector store, index, cluster, cosine similarity</terms>
</brief>

<theme name="database" />

The help center answers questions by **retrieval**: it turns every paragraph into numbers once, keeps them in a table, groups them, and when a question arrives it turns the question into numbers too and looks for the paragraphs that point the same way. The real run of `npm run demo` in this project prints every number below.

<stats title="One question, twelve paragraphs that could answer it" arc="question">
<stat value="12" label="chunks in the help center" ref="data/help-center.md" />
<stat value="8" label="numbers per chunk" ref="src/embed.js:3" />
<stat value="7" label="words in the customer's question" ref="src/search.js:6-13" />
</stats>

A customer asks one question. The help center finds the paragraph that answers it, although the two share only one word, "back".

<trace id="the-case" title="A customer asks, and the refunds paragraph comes back" arc="example" ref="src/search.js:6-13">
<value label="The customer types">When do I get my money back?</value>
<value label="The help center answers with" note="The first paragraph of the help center: the one that answers the question.">Refunds are sent back to your card within 5 business days.</value>
</trace>

The whole process has five stops. Each chapter below opens one of them, with the same question and the same chunk all the way through.

<journey id="map" title="Five stops take a question to its paragraph" arc="question">
<stage id="embed" label="Embed" value="12 × 8" kind="text" op="embed(text)" ref="src/embed.js:73-77">Each of the 12 chunks becomes a vector of 8 numbers, one per meaning.</stage>
<stage id="store" label="Store" value="12 rows" kind="table" op="saveStore(rows)" ref="src/store.js:5-11">The 12 vectors are saved as the rows of a table, each next to its text.</stage>
<stage id="index" label="Group" value="4 zones" kind="split" op="buildIndex(rows)" ref="src/index.js:9-24">Rows that point the same way are grouped into 4 zones of 3.</stage>
<stage id="search" label="Search" value="3 of 12" kind="model" op="search(question)" ref="src/search.js:6-13">The question becomes a vector too and is compared with the 3 rows of its zone only.</stage>
<stage id="score" label="Score" value="3 scores" kind="metric" op="cosine(a, b)" ref="src/similarity.js:6-8">Each compared row gets a score, and the best one is the answer.</stage>
</journey>

<chapter title="A paragraph becomes 8 numbers" goal="Read an embedding: what each number means and why its length is 1." stage="embed" />

An **embedding** is how a computer reads meaning: one number per idea. Real models learn hundreds of ideas from billions of sentences; this project's model is a small dictionary of 8, so every number can be checked by hand.

<concept term="Embedding">
<define>A list of numbers that says how much of each meaning a text carries.</define>
<analogy>A nutrition label for a sentence: how much money, how much time, how much delivery is inside.</analogy>
<formula>\hat{\mathbf{v}} = \frac{\mathbf{v}}{\lVert \mathbf{v} \rVert}</formula>
<example>"Refunds are sent back to your card within 5 business days" is mostly **money** (0.83) and some **time** (0.56).</example>
</concept>

<trace title="One chunk becomes 8 numbers" arc="example" ref="src/embed.js:57-77">
<value label="The chunk" note="The first paragraph of the help center, exactly as stored.">Refunds are sent back to your card within 5 business days.</value>
<value kind="list" label="Its words" code="tokens(text)" note="Lowercase words without punctuation: the units the dictionary knows." ref="src/embed.js:57-59">refunds|are|sent|back|to|your|card|within|business|days</value>
<value kind="bars" label="The meanings they add up to" code="rawVector(text)" note="Refunds, back and card add 2.2 to money; back, within and days add 1.5 to time; the other words carry nothing." ref="src/embed.js:62-68">money=2.20|time=1.50|delivery=0|account=0|security=0|product=0|support=0|problem=0</value>
<value kind="vector" label="The embedding" code="embed(text)" note="Divided by its length, 2.66, so the vector has length 1 and only its direction counts." ref="src/embed.js:73-77">0.83|0.56|0.00|0.00|0.00|0.00|0.00|0.00</value>
</trace>

> [!IMPORTANT]
> Dividing by the length is what lets a short question and a long paragraph be compared fairly: only the direction is left.

<quiz question="Why is every embedding divided by its own length?">
<option correct="true" why="Length grows with the number of words, so long chunks would win just for being long.">So that only its direction counts</option>
<option why="The 8 numbers are already few; dividing changes none of them to zero.">To make the vector shorter to store</option>
<option why="The order of the meanings never changes; only their size does.">To sort the meanings</option>
</quiz>

<chapter title="The store is a table of vectors" goal="See what is saved for each chunk and read the table by rows and columns." stage="store" />

The **vector store** keeps one row per chunk: its id, its text and its 8 numbers. In this project it is a JSON file, `data/store.json`; in production it is a database with a vector column. Below are its first 6 rows of 12.

<concept term="Vector store">
<define>A table where each row is a piece of text with its embedding, ready to be searched by meaning.</define>
<analogy>A library catalogue where each card also says what the book is about, in numbers.</analogy>
</concept>

<matrix title="Each row is a chunk, each column a meaning" arc="example" cols="money|time|delivery|account|security|product|support|problem" corner="chunk \ meaning" ref="src/store.js:5-11">
<row label="c1 refunds" values="0.83|0.56|0.00|0.00|0.00|0.00|0.00|0.00" />
<row label="c2 charged twice" values="0.91|0.00|0.00|0.00|0.00|0.10|0.00|0.39" />
<row label="c3 invoices" values="0.89|0.00|0.00|0.41|0.00|0.21|0.00|0.00" />
<row label="c4 ships in 24 h" values="0.00|0.52|0.85|0.00|0.00|0.11|0.00|0.00" />
<row label="c5 track parcel" values="0.00|0.00|1.00|0.10|0.00|0.00|0.00|0.00" />
<row label="c6 free delivery" values="0.62|0.00|0.77|0.00|0.00|0.14|0.00|0.00" />
<focus label="Our chunk" cells="1,*">Row c1 is the embedding from chapter 1, saved as it is.</focus>
<focus label="Money" cells="*,1">Four rows carry money: the three about payments, from 0.83 to 0.91, and free delivery with 0.62.</focus>
</matrix>

<quiz question="What does one row of the vector store hold?">
<option correct="true" why="The store keeps each chunk's text with its 8 numbers, so a search can hand back the text it found by meaning.">A chunk's text and its embedding</option>
<option why="The question is embedded when it arrives; it is never stored as a row.">The customer's question</option>
<option why="Grouping comes later, in the next stop; the store only keeps the rows.">The group the chunk belongs to</option>
</quiz>

<chapter title="The index sends a question to one zone" goal="Understand why an index compares a question with a few rows instead of all." stage="index" />

Comparing a question with every row works for 12 rows, not for 12 million. An **index** groups rows that point the same way, so a question only visits its own group.

<concept term="Index (clusters)">
<define>Groups of rows that point the same way, each with a centroid: the average direction of its rows.</define>
<analogy>The sections of a library: a question about refunds goes straight to the payments shelf.</analogy>
<example>k-means with 4 clusters puts c1, c2 and c3 together: the money rows.</example>
</concept>

<space title="Four zones, three rows each" arc="example" x="direction 1" y="direction 2" dims="8" ref="src/index.js:9-24">
<cluster id="money" label="Money" x="0.76" y="0.27" />
<cluster id="delivery" label="Delivery" x="0.63" y="0.05" />
<cluster id="account" label="Account" x="0.20" y="0.78" />
<cluster id="product" label="Product" x="0.63" y="-0.56" />
<item id="c1" label="Refunds in 5 days" x="0.69" y="0.14" cluster="money" />
<item id="c2" label="Charged twice" x="0.66" y="0.20" cluster="money" />
<item id="c3" label="Invoices by email" x="0.74" y="0.40" cluster="money" />
<item id="c4" label="Ships in 24 hours" x="0.56" y="-0.11" cluster="delivery" />
<item id="c5" label="Track your parcel" x="0.41" y="0.11" cluster="delivery" />
<item id="c6" label="Free delivery" x="0.76" y="0.14" cluster="delivery" />
<item id="c7" label="Reset password" x="0.18" y="0.76" cluster="account" />
<item id="c8" label="Two-step verification" x="0.16" y="0.70" cluster="account" />
<item id="c9" label="Delete account" x="0.20" y="0.63" cluster="account" />
<item id="c10" label="2-year warranty" x="0.64" y="-0.55" cluster="product" />
<item id="c11" label="Swap a damaged product" x="0.65" y="-0.53" cluster="product" />
<item id="c12" label="Sizes and colors" x="0.55" y="-0.53" cluster="product" />
</space>

The picture flattens 8 numbers into 2, so *free delivery* looks close to the money rows; in 8 dimensions it leans on delivery, and that is the zone it belongs to.

<compare title="An index trades a little recall for a lot of speed" arc="contrast" a="Compare every row" b="Compare one cluster" ref="src/search.js:6-13">
<pair label="Rows compared for our question" a="12" b="3" winner="b" />
<pair label="Work as the store grows" a="grows with every row" b="grows with one cluster" winner="b" />
<pair label="Can miss a good row" a="never" b="when it sits in another cluster" winner="a" />
</compare>

<quiz question="Why is our question compared with 3 rows instead of 12?">
<option correct="true" why="The question goes to the cluster whose centroid points its way, and only that cluster's 3 rows are compared.">It only visits the cluster that points its way</option>
<option why="All 12 rows stay in the store; the index only groups them.">The index deletes the rows that look unrelated</option>
<option why="Scores are computed only for the rows the index visits; nothing is kept from an earlier search.">It reuses the 3 best scores of an earlier search</option>
</quiz>

<chapter title="The question travels the same road" goal="Follow a question from words to the rows it is compared with." stage="search" />

A question goes through the **same** embedding as the chunks, so both live in the same space and can be compared.

<trace title="The question becomes a vector too" arc="example" ref="src/search.js:6-13">
<value label="The question" note="Seven words typed by a customer: the example this chapter follows to its answer.">When do I get my money back?</value>
<value kind="list" label="Its words" code="tokens(question)" note="Four of the seven words are in the dictionary, when, get, money and back; do, I and my mean nothing.">when|do|i|get|my|money|back</value>
<value kind="vector" label="Its embedding" code="embed(question)" note="Mostly money, some time, a hint of delivery from get: close to the refunds chunk.">0.88|0.47|0.10|0.00|0.00|0.00|0.00|0.00</value>
</trace>

<space title="The question lands next to the refunds" arc="answer" x="direction 1" y="direction 2" k="3" dims="8" ref="src/search.js:6-13">
<cluster id="money" label="Money" x="0.76" y="0.27">The index sends the question to the money cluster: only its 3 rows are compared.</cluster>
<cluster id="delivery" label="Delivery" x="0.63" y="0.05" />
<cluster id="account" label="Account" x="0.20" y="0.78" />
<cluster id="product" label="Product" x="0.63" y="-0.56" />
<item id="c1" label="Refunds in 5 days" x="0.69" y="0.14" cluster="money" score="0.988">Almost the same direction: 0.988, the best answer.</item>
<item id="c2" label="Charged twice" x="0.66" y="0.20" cluster="money" score="0.804">Also about money, but without the time the question asks about: 0.804.</item>
<item id="c3" label="Invoices by email" x="0.74" y="0.40" cluster="money" score="0.781">Money again, plus account: 0.781.</item>
<item id="c4" label="Ships in 24 hours" x="0.56" y="-0.11" cluster="delivery" />
<item id="c5" label="Track your parcel" x="0.41" y="0.11" cluster="delivery" />
<item id="c6" label="Free delivery" x="0.76" y="0.14" cluster="delivery" />
<item id="c7" label="Reset password" x="0.18" y="0.76" cluster="account" />
<item id="c8" label="Two-step verification" x="0.16" y="0.70" cluster="account" />
<item id="c9" label="Delete account" x="0.20" y="0.63" cluster="account" />
<item id="c10" label="2-year warranty" x="0.64" y="-0.55" cluster="product" />
<item id="c11" label="Swap a damaged product" x="0.65" y="-0.53" cluster="product" />
<item id="c12" label="Sizes and colors" x="0.55" y="-0.53" cluster="product" />
<query label="When do I get my money back?" x="0.74" y="0.17" cluster="money">The question becomes a point in the same space as the chunks.</query>
</space>

> [!NOTE]
> A full RAG would now hand these three chunks to a language model to write the answer. This project stops at retrieval, the part that decides what the model gets to read.

<quiz question="Why must the question go through the same embedding as the chunks?">
<option correct="true" why="Only vectors made by the same dictionary share their meanings position by position, so the angle between them means something.">So both live in the same space and can be compared</option>
<option why="Every vector is divided by its length, the question included, but that is not why the embedding must be the same.">To make the question shorter</option>
<option why="The embedding turns words into numbers; it does not correct them.">To fix spelling mistakes in the question</option>
</quiz>

<chapter title="The cosine measures the angle" goal="Compute a cosine similarity by hand and read what 0.988 means." stage="score" />

The score of each row is its **cosine similarity** with the question: how much the two vectors point the same way, whatever their length.

<concept term="Cosine similarity">
<define>A number from −1 to 1 that says how much two vectors point the same way: 1 same direction, 0 unrelated, −1 opposite.</define>
<analogy>Two people pointing at the horizon: what matters is whether they point at the same place, not how long their arms are.</analogy>
<formula>\cos(\mathbf{a}, \mathbf{b}) = \frac{\mathbf{a} \cdot \mathbf{b}}{\lVert \mathbf{a} \rVert \, \lVert \mathbf{b} \rVert}</formula>
</concept>

<cosine title="The question and the refunds chunk score 0.988" arc="apply" a="When do I get my money back?" b="Refunds in 5 days" score="0.988" ref="src/similarity.js:6-8">
<dim a="0.879" b="0.826" label="money" />
<dim a="0.465" b="0.563" label="time" />
<dim a="0.103" b="0.000" label="delivery" />
<dim a="0.000" b="0.000" label="account" />
<dim a="0.000" b="0.000" label="security" />
<dim a="0.000" b="0.000" label="product" />
<dim a="0.000" b="0.000" label="support" />
<dim a="0.000" b="0.000" label="problem" />
</cosine>

Money and time do all the work: the meanings that are 0 in either vector add nothing. Both lengths are about 1, because every embedding was divided by its length, so the cosine is almost the dot product itself.

<quiz question="Charged twice scores 0.804 and the refunds chunk 0.988. What does the question share with the refunds chunk that it does not share with charged twice?">
<option correct="true" why="The question asks when (time 0.465) and the refunds chunk says within 5 days (time 0.563); charged twice has no time at all.">Time</option>
<option why="Both chunks are mostly money, so money cannot tell them apart.">Money</option>
<option why="Neither chunk carries delivery; only the question has a little.">Delivery</option>
</quiz>

<chapter title="Review" goal="Check the whole road from paragraph to answer." />

<quiz question="What is an embedding, in this project?">
<answer>A vector of 8 numbers, one per meaning (money, time, delivery…), made by adding up what each word carries and dividing by the length. "Refunds are sent back to your card within 5 business days" becomes 0.83 money and 0.56 time.</answer>
</quiz>

<quiz question="Why does the question go through the same embedding as the chunks?">
<answer>Only vectors made the same way can be compared: the same 8 meanings in the same order. The question becomes 0.88 money, 0.47 time and 0.10 delivery, in the same space as the chunks.</answer>
</quiz>

<quiz question="What does the index save, and what can it cost?">
<answer>It sends the question to one of 4 clusters, so it compares 3 rows instead of 12. The cost: a good row in another cluster is never compared. Here free delivery (c6) sits in the delivery cluster and is skipped.</answer>
</quiz>

<quiz question="What does a cosine of 0.988 say?">
<answer>That the two vectors point almost the same way: about 9 degrees apart. 1 would be the same direction, 0 unrelated, −1 opposite. It ignores length, so a short question and a long paragraph compare fairly.</answer>
</quiz>
