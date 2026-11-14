# Can a model tell a good review from a bad one?

<brief form="process">
<audience>Beginners who have never trained a model; they know what a table and a percentage are</audience>
<question>How does a model learn to tell a positive review from a negative one, and where does it fail?</question>
<example>The test review "worst film year really bad", which the model wrongly calls positive</example>
<misconception>Believing the model understands what the words of a review mean</misconception>
<check>Predict which way the model leans for a new review from the weights of its words</check>
<terms>labelled dataset, stop word, train/test split, bag of words, logistic regression, confusion matrix, precision and recall, sigmoid</terms>
</brief>

<theme name="ml" />

This notebook teaches a computer to read a short movie review and say whether it is **positive** or **negative**. It never understands the words: it counts them, and learns how much each one pushes towards "positive". How far does that get with 24 reviews?

<stats id="headline" arc="question">
<stat value="24" label="hand-written reviews, 12 positive and 12 negative" ref="reviews.ipynb:4" />
<stat value="70" label="word features the model learns from" ref="reviews.ipynb:10" />
<stat value="6" label="reviews hidden away to grade it" ref="reviews.ipynb:8" />
</stats>

Here is one of the 6 hidden reviews, and what the model makes of it. By the end of the lesson you will see exactly why.

<trace id="the-case" title="A clearly bad review, and the model calls it positive" arc="example" ref="reviews.ipynb:15">
<value label="A review the model never saw">The worst film this year, really bad</value>
<value label="What its author meant" note="Its label is 0: the review is negative.">negative</value>
<value label="What the model answers" note="Cell 15 lists it as the one mistake: the model said 1, positive.">positive</value>
</trace>

<journey id="path" title="24 reviews become one verdict in five steps" arc="question">
<stage id="reviews" label="Reviews" value="24 reviews" kind="table" ref="reviews.ipynb:3">Every review is a sentence plus its label: 1 for positive, 0 for negative.</stage>
<stage id="clean" label="Clean text" value="24 texts" kind="text" op="clean()" ref="reviews.ipynb:6">Lowercase, no punctuation, no filler words, but negations stay.</stage>
<stage id="split" label="Train and test" value="18 + 6" kind="split" op="train_test_split()" ref="reviews.ipynb:8">The model learns from 18 reviews; 6 are hidden away to grade it fairly.</stage>
<stage id="matrix" label="Word counts" value="18 × 70" kind="matrix" op="CountVectorizer()" ref="reviews.ipynb:10">Each review becomes a row of 70 numbers: how many times each word or word pair appears.</stage>
<stage id="model" label="Model" value="70 weights" kind="model" op="fit()" ref="reviews.ipynb:15">The model learns one weight per word: positive words push up, negative words push down.</stage>
<stage id="score" label="Grade" value="6 reviews" kind="metric" ref="reviews.ipynb:15">The 6 hidden reviews grade it: how many will it get right?</stage>
</journey>

<chapter id="load" title="The model learns from 24 labelled sentences" goal="Know what the model learns from: 24 sentences, each with a 0 or a 1." ref="reviews.ipynb:2-4" />

Before any model, there is a table of examples with their answers.

<concept id="c-dataset" term="Labelled dataset" ref="reviews.ipynb:3">
<define>A table with one column for the text and one for the answer the model must learn, called the **label**.</define>
<analogy>A stack of exam papers that already have the correct grade written on the back.</analogy>
<example>
| text | label |
|---|---|
| A great movie, I loved it | 1 (positive) |
| A boring movie, I hated it | 0 (negative) |
</example>
</concept>

The notebook writes 24 reviews by hand: 12 with label 1 and 12 with label 0. Having the same number of each matters: a model that always said "positive" would only be right half of the time, so any score above 0.5 is real learning.

<chart id="chart-labels" title="Half the reviews are positive, half negative" arc="example" type="bars" ref="reviews.ipynb:4">
<row label="positive (1)" values="12" />
<row label="negative (0)" values="12" />
</chart>

> [!NOTE]
> Real datasets have thousands of reviews. This one is tiny on purpose, so every number in the lesson can be checked by eye.

<quiz id="q-label" question="What does the label 0 mean in this notebook?">
<option why="The label is the answer, not a count of anything.">The review has no words</option>
<option correct="true" why="1 is positive and 0 is negative; the model learns to predict this column.">The review is negative</option>
<option why="Reviews are not scored by length.">The review is short</option>
</quiz>

<chapter id="clean" theme="text" title="Cleaning drops filler words but keeps &quot;not&quot;" goal="See why the cleaning drops filler words but keeps &quot;not&quot;." ref="reviews.ipynb:5-6" />

The model will count words, so two spellings of the same word should count as one: "Not" and "not" must become the same thing. Cleaning is like sorting coins before counting them: same coin, same pile.

The function `clean()` does three things: it lowercases, it replaces anything that is not a letter by a space, and it drops **stop words**.

<concept id="c-stop" term="Stop word" ref="reviews.ipynb:5">
<define>A word so common that it says nothing about the opinion, removed before counting.</define>
<analogy>The packing foam in a parcel: it fills space, and you throw it away to see what is inside.</analogy>
<example>"I", "at", "all" and "it" are stop words; "hated" is not.</example>
</concept>

<trace id="trace-clean" title="Six words shrink to three, and &quot;not&quot; survives" arc="example" ref="reviews.ipynb:6">
<value label="Original">Not good at all, I hated it</value>
<value label="Lowercase" code="text.lower()" note="&quot;Not&quot; and &quot;not&quot; are now the same word.">not good at all, i hated it</value>
<value label="Letters only" code="re.sub(r&quot;[^a-z\s]&quot;, &quot; &quot;, text)" note="The comma becomes a space, so it can never stick to a word.">not good at all  i hated it</value>
<value label="No stop words" code="w not in STOP_WORDS" note="&quot;at&quot;, &quot;all&quot;, &quot;i&quot; and &quot;it&quot; go, but &quot;not&quot; stays because the notebook took the negations off the stop word list.">not good hated</value>
</trace>

> [!IMPORTANT]
> **The key decision of the notebook.** scikit-learn's list of English stop words contains "not". With it, "not good" would be cleaned into "good" and look positive. The notebook subtracts `{"not", "no", "never", "nor"}` from the list, so negations survive.

<quiz id="q-not" question="What would happen to &quot;Not good, a waste of time&quot; if &quot;not&quot; were a stop word?">
<option correct="true" why="Only &quot;good&quot;, &quot;waste&quot; and &quot;time&quot; would be left, and &quot;good&quot; pushes towards positive.">It would look more positive than it is</option>
<option why="Cleaning only removes words; the review keeps its label 0.">Its label would change to 1</option>
<option why="Other words like &quot;waste&quot; would still be there.">It would become an empty text</option>
</quiz>

<chapter id="split" theme="data" title="Six reviews stay hidden to grade the model fairly" goal="Understand why 6 reviews are hidden from the model." ref="reviews.ipynb:7-8" />

If a student sees the exam questions while studying, a perfect grade proves nothing. So the notebook hides some reviews: the model **trains** on 18 and is **tested** on the other 6, which it never sees while learning.

<concept id="c-split" term="Train/test split" ref="reviews.ipynb:8">
<define>Keeping part of the labelled examples away from the model while it learns, to grade it later on examples it has never seen.</define>
<analogy>A teacher who keeps some exam questions out of the practice sheets, so the exam measures understanding, not memory.</analogy>
<example>24 reviews: 18 to **train**, 6 to **test**.</example>
</concept>

`train_test_split(..., test_size=0.25, stratify=df["label"])` takes a quarter of the reviews for the test set. **Stratify** means the split keeps the class balance: the 6 test reviews are 3 positive and 3 negative, the same half-and-half as the whole dataset.

<chart id="chart-split" title="Both parts keep half positive, half negative" arc="example" type="bars" series="negative|positive" ref="reviews.ipynb:8">
<row label="train" values="9|9" />
<row label="test" values="3|3" />
</chart>

<quiz id="q-split" question="Why stratify the split?">
<option why="The model sees the same 18 reviews either way.">So the model trains faster</option>
<option correct="true" why="With only 6 test reviews, a random split could take 5 negatives and 1 positive, and the score would mostly measure that accident.">So both parts keep the same share of positive and negative reviews</option>
</quiz>

<chapter id="vectorize" title="Each review becomes a row of word counts" goal="Read a document-term matrix and know what CountVectorizer puts in it." ref="reviews.ipynb:9-11" />

A model can only do arithmetic, so each review has to become a row of numbers. `CountVectorizer` builds a **vocabulary** of every word in the training reviews, and each review becomes one row with a column per word.

<concept id="c-bow" term="Bag of words" ref="reviews.ipynb:10">
<define>A review turned into a row of counts: one column per word of the vocabulary, holding how many times that word appears.</define>
<analogy>Emptying the sentence into a bag: the order of the words is lost, but you can still count each one.</analogy>
<example>
| review | good | great | boring |
|---|---|---|---|
| good story great acting | 1 | 1 | 0 |
</example>
</concept>

Here is the idea on 3 training reviews and 5 chosen words (cell 11 prints exactly this):

<matrix id="dtm" title="A review is only its counts" arc="example" cols="good|great|bad|boring|not" ref="reviews.ipynb:11">
<row label="awful film ending bad" values="0|0|1|0|0" />
<row label="good story great acting" values="1|1|0|0|0" />
<row label="great acting fun story" values="0|1|0|0|0" />
<focus label="The word great" cells="*,2">"great" appears in two reviews, both positive.</focus>
<focus label="One review" cells="2,*">"good story great acting" has a 1 under "good" and under "great": this row is all the model sees of it.</focus>
</matrix>

The notebook uses `ngram_range=(1, 2)`: besides single words, it also counts **pairs** of neighbouring words, so "not good" becomes a column of its own. With words and pairs, the 18 training reviews give a vocabulary of **70** columns.

> [!TIP]
> **TF-IDF** (term frequency–inverse document frequency) is the same table with smarter numbers: a word that appears in many reviews (like "film") gets a smaller weight than a rare, telling word. The notebook tries both.

<compare id="counts-vs-tfidf" title="TF-IDF turns down the words that are everywhere" arc="apply" a="Word counts" b="TF-IDF" ref="reviews.ipynb:9-11">
<pair label="What a cell holds" a="How many times the word appears" b="The count, scaled down for words that are everywhere" />
<pair label="A word in every review" a="Weighs as much as any other" b="Weighs **less**" winner="b" />
<pair label="Reading the table" a="Whole numbers, easy to check by hand" b="Decimals" winner="a" />
</compare>

<quiz id="q-shape" question="The training matrix has shape (18, 70). What are the 70?">
<option why="There are 18 training reviews; they are the rows.">The reviews</option>
<option correct="true" why="One column per word or word pair in the training vocabulary.">The words and word pairs the vectorizer found</option>
<option why="Labels are kept apart, in y_train.">The labels</option>
</quiz>

<chapter id="train" title="The model gives every word a weight" goal="Know what logistic regression learns and read train against test accuracy." ref="reviews.ipynb:12-13" />

<concept id="c-logreg" term="Logistic regression" ref="reviews.ipynb:12">
  <define>A model that gives every column a **weight** and judges a review by adding up the weights of the words it contains.</define>
  <analogy>A jury where each word votes, and some words have louder voices than others.</analogy>
  <example>If the total leans positive, the model answers 1; if it leans negative, 0.</example>
</concept>

Training means finding the weights that best match the 18 labelled reviews.

The notebook trains one model on the word counts and one on TF-IDF, and measures **accuracy** (the share of right answers) on both parts:

<chart id="chart-acc" title="Perfect on what it studied, 5 of 6 on new reviews" arc="answer" type="bars" series="train|test" highlight="test" ref="reviews.ipynb:13">
<row label="BoW" values="1.000|0.833" />
<row label="TF-IDF" values="1.000|0.833" />
</chart>

Both models get every training review right (1.000) but 5 of 6 test reviews (0.833). The gap is normal: the model has memorised the 18 reviews it studied. The test score is the honest one. With this little data, both vectorizers tie, so the notebook keeps the simpler word counts.

<quiz id="q-gap" question="Which number tells you how well the model will do on new reviews?">
<option why="It saw these reviews while learning, so a perfect score is easy.">Train accuracy, 1.000</option>
<option correct="true" why="The 6 test reviews were hidden during training.">Test accuracy, 0.833</option>
</quiz>

<chapter id="evaluate" title="A confusion matrix shows which mistakes happened" goal="Read a confusion matrix and compute accuracy, precision, recall and F1 from it." ref="reviews.ipynb:14-15" />

Accuracy says how many answers were right, but not **which** mistakes happened.

<concept id="c-confusion" term="Confusion matrix" ref="reviews.ipynb:15">
<define>A table that counts the answers by real label (rows) and predicted label (columns): the diagonal holds the right answers, every other cell a kind of mistake.</define>
<analogy>A teacher's tally that says not only how many answers were wrong, but which wrong answer each student gave.</analogy>
</concept>

<concept id="c-precision" term="Precision and recall" ref="reviews.ipynb:15">
<define>**Precision**: of the reviews the model called positive, the share that really were. **Recall**: of the reviews that really were positive, the share the model found.</define>
<analogy>A fisher's net: precision is how much of the catch is fish rather than boots; recall is how many of the fish in the lake ended up in the net.</analogy>
<formula>\text{precision} = \frac{TP}{TP + FP} \qquad \text{recall} = \frac{TP}{TP + FN}</formula>
<example>TP (true positives) = 3, FP (false positives) = 1 and FN (false negatives) = 0: precision is 3 of 4, recall 3 of 3.</example>
</concept>

Pick each highlight to see which cells it reads; the numbers come from the counts.

<matrix id="cm" title="One negative review was called positive" arc="answer" kind="confusion" cols="negative|positive" positive="positive" ref="reviews.ipynb:15">
<row label="negative" values="2|1" />
<row label="positive" values="0|3" />
<focus metric="accuracy">All the right answers over all the reviews: 5 of 6.</focus>
<focus metric="precision">3 of the 4 reviews the model called positive really were: one negative review slipped in.</focus>
<focus metric="recall">Of the 3 truly positive reviews, how many the model found: all of them.</focus>
<focus metric="f1">One number that balances precision and recall; it is low if either one is low.</focus>
<focus label="The mistake" cells="1,2">One negative review was called positive: a false positive.</focus>
</matrix>

The notebook prints the review it got wrong: **"worst film year really bad"**, a negative review that the model called positive. The word "worst" never appears in the training reviews, so the model has no weight for it, and "film", "year" and "really" happen to lean positive in such a small dataset (weights 0.011, 0.175 and 0.310, printed by cell 17).

> [!WARNING]
> With 6 test reviews, each mistake moves accuracy by about 0.17. These numbers show the method, not how good the model would be on real reviews.

<quiz id="q-precision" question="Precision for the positive class is 0.75. What does it mean?">
<option correct="true" why="3 of the 4 &quot;positive&quot; answers were truly positive.">When the model says positive, it is right 3 times out of 4</option>
<option why="That is recall, which is 1.0 here: it found all 3 positives.">It finds 75 % of the positive reviews</option>
<option why="Accuracy is 0.833.">75 % of all answers are right</option>
</quiz>

<chapter id="weights" title="Pairs with &quot;not&quot; carry meaning" goal="Read the model's weights and see that negation pairs carry meaning." ref="reviews.ipynb:16-17" />

Because the model is just a weight per word, you can open it and look. The notebook prints the four strongest weights in each direction:

<chart id="chart-coefs" title="&quot;great&quot; pushes up most, &quot;boring&quot; down most" arc="idea" type="hbars" ref="reviews.ipynb:17">
<row label="great" values="0.892" />
<row label="loved" values="0.611" />
<row label="fun" values="0.439" />
<row label="not bad" values="0.345" />
<row label="not good" values="-0.432" />
<row label="bad acting" values="-0.470" />
<row label="hated" values="-0.530" />
<row label="boring" values="-0.607" />
</chart>

Two of the eight are **word pairs with "not"**: "not bad" pushes towards positive and "not good" towards negative. That is the payoff of keeping negations in chapter 2 and counting pairs in chapter 4.

<quiz id="q-coef" question="A new review is &quot;great fun&quot;. Which way does the model lean?">
<option correct="true" why="Both words have positive weights, 0.892 and 0.439.">Positive</option>
<option why="Both words push up; nothing pushes down.">Negative</option>
</quiz>

<chapter id="scoring" theme="math" title="Neutral words outvote &quot;bad&quot;" goal="Follow the arithmetic behind one prediction, from word weights to a probability." ref="reviews.ipynb:18-19" />

Chapter 6 showed one mistake: **"worst film year really bad"** was called positive. Now open the model and watch it decide. Cell 19 prints every word and word pair of that review that the model knows, with its weight; "worst" is not among them, because it never appeared in the training reviews.

The model starts from its **intercept** (its score before reading any word) and adds the weight of each feature the review contains, like a jury where each word votes with its own loudness.

<concept id="c-sigmoid" term="Sigmoid" ref="reviews.ipynb:19">
  <define>The function that squeezes any score $z$ into a probability between 0 and 1.</define>
  <analogy>A dimmer switch: however hard you push, the light stays between off and fully on.</analogy>
  <formula>\sigma(z) = \frac{1}{1 + e^{-z}}</formula>
  <example>A score of exactly 0 gives a probability of one half; any positive score gives more than that.</example>
</concept>

<trace id="one-review" title="Our review becomes 0.608" arc="example" ref="reviews.ipynb:19">
<value label="The review">worst film year really bad</value>
<value kind="list" label="Words the model knows" code="bow.transform([text])" note="&quot;worst&quot; is not in the vocabulary, so it disappears; the word pairs appear as features of their own.">bad|film|film year|really|year|year really</value>
<value kind="table" label="Counts" code="x = bow.transform([text]).toarray()[0]" note="Each known word or pair appears once.">bad=1|film=1|film year=1|really=1|year=1|year really=1</value>
<value kind="bars" label="Weights" code="model.coef_[0][i]" note="Only &quot;bad&quot; pulls towards negative; five features push towards positive.">bad=-0.332|film=+0.011|film year=+0.175|really=+0.310|year=+0.175|year really=+0.175</value>
<value kind="number" label="Score" code="model.decision_function(...)" note="The intercept plus every count times its weight.">0.438</value>
<value kind="number" label="Probability of positive" code="model.predict_proba(...)[0][1]" note="Above 0.5, so the model calls this review positive.">0.608</value>
</trace>

<calc id="score-one" title="Five small pushes beat one negative word" arc="contrast" kind="logistic" total="0.438" classes="negative|positive" ref="reviews.ipynb:19">
<part label="intercept" value="-0.075" note="Where every review starts, before any word is read." />
<part label="bad" value="-0.332" note="The only negative word the model knows here." />
<part label="film" value="+0.011" note="Almost neutral." />
<part label="film year" value="+0.175" note="A word pair from the bigrams; it happened to appear in positive training reviews." />
<part label="really" value="+0.310" note="In this small dataset &quot;really&quot; came mostly with positive reviews." />
<part label="year" value="+0.175" note="Another small push towards positive." />
<part label="year really" value="+0.175" note="A word pair that leans a little positive too." />
</calc>

<plot id="sigmoid-plot" title="A score just above 0 gives just over one half" arc="apply" x="score" y="probability of positive" ref="reviews.ipynb:19">
<curve fn="sigmoid" />
<mark x="0" label="undecided">A score of 0 sits exactly on the threshold.</mark>
<mark x="0.438" label="our review">Its score of 0.438 sits a little right of 0, so its probability, 0.608, is just enough to be called positive.</mark>
</plot>

<derive id="score-to-prob" title="0.438 becomes 0.608" arc="apply" ref="reviews.ipynb:19">
<line>p = \sigma(z)</line>
<line note="The definition of the **sigmoid**.">p = \frac{1}{1 + e^{-z}}</line>
<line note="The score cell 19 printed for this review.">p = \frac{1}{1 + e^{-0.438}}</line>
<line note="The probability cell 19 printed: above 0.5, so the model answers positive.">p = 0.608</line>
</derive>

> [!WARNING]
> **Why it went wrong.** Five neutral words each push a little towards positive and together outvote "bad". The word that carries the meaning, "worst", has no weight at all. With more training data, "worst" would get a strong negative weight.

<quiz id="q-score" question="The score is 0.438. Why is the answer &quot;positive&quot;?">
<option why="The decision uses the probability, not the score directly.">Because 0.438 is less than 1</option>
<option correct="true" why="sigmoid(0.438) is about 0.608, and 0.608 is at least the threshold 0.5. Any positive score gives a probability above 0.5.">Because its probability, 0.608, is at least 0.5</option>
<option why="Each word adds its own weight; the count of words does not decide.">Because most of the words are positive</option>
</quiz>

<chapter id="threshold" title="The threshold trades one mistake for another" goal="See how the 0.5 threshold trades one kind of mistake for the other." ref="reviews.ipynb:20-21" />

The model never says "positive" directly: it gives a **probability**, and a **threshold** turns it into an answer. scikit-learn uses 0.5, but that is a choice, like the mark that decides who passes an exam. Cell 21 prints the probability of every test review.

Drag the threshold and watch the dots: green when the review is called right, red when it is wrong. The matrix and the metrics below are recomputed from the same 6 reviews.

<threshold id="what-if" title="At 0.5, one of six reviews lands on the wrong side" arc="apply" classes="negative|positive" ref="reviews.ipynb:21">
<point score="0.156" actual="negative" label="bad music boring plot hated" />
<point score="0.292" actual="negative" label="boring slow bad watch" />
<point score="0.608" actual="negative" label="worst film year really bad" />
<point score="0.652" actual="positive" label="good fun start finish" />
<point score="0.748" actual="positive" label="good music fun plot loved" />
<point score="0.815" actual="positive" label="loved music great film" />
</threshold>

> [!TIP]
> Any threshold between 0.608 and 0.652 gets all 6 right here. Do not trust that: it was found by looking at the test set, so the test set can no longer grade it fairly. With so few reviews, keep 0.5.

<quiz id="q-threshold" question="You raise the threshold from 0.5 to 0.7. What happens to recall for positive reviews?">
<option why="Raising the threshold can only take &quot;positive&quot; answers away, never add them.">It goes up</option>
<option correct="true" why="&quot;good fun start finish&quot; (0.652) is now called negative, so only 2 of the 3 positive reviews are found: recall drops from 1 to 0.6667.">It goes down</option>
<option why="One positive review falls below 0.7.">It stays the same</option>
</quiz>

<chapter id="review" title="Review" goal="Practise the questions someone could ask about this notebook." />

Try to answer each one out loud before showing the answer.

<quiz id="r-why-not" question="Why does the notebook keep &quot;not&quot; when it removes stop words?">
<answer>Because "not" flips the meaning of the next word. Without it, "not good" would be cleaned into "good" and push the model towards positive. Keeping it, together with word pairs, gives the model features like "not good" (weight −0.432) and "not bad" (+0.345).</answer>
</quiz>

<quiz id="r-split" question="Why is the test set hidden during training, and why stratified?">
<answer>A model graded on reviews it studied would look perfect (train accuracy 1.000) without proving anything. The 6 hidden reviews measure how it does on new text. Stratifying keeps them 3 positive and 3 negative, like the whole dataset.</answer>
</quiz>

<quiz id="r-bow" question="What is a bag of words?">
<answer>A table with one row per review and one column per word in the vocabulary; each cell counts how often the word appears. Word order is lost. Here the vocabulary has 70 words and word pairs.</answer>
</quiz>

<quiz id="r-tfidf" question="How is TF-IDF different from plain counts?">
<answer>It scales each count down when the word appears in many documents, so common words weigh less and rare, telling words weigh more. On this dataset both give the same test accuracy, 0.833.</answer>
</quiz>

<quiz id="r-precision" question="What are precision and recall here?">
<answer>Precision: of the 4 reviews called positive, 3 were (0.75). Recall: of the 3 positive reviews, the model found all 3 (1.0). F1 balances both: 0.857.</answer>
</quiz>

<quiz id="r-error" question="Why did the model get &quot;worst film year really bad&quot; wrong?">
<answer>"worst" never appears in the training reviews, so it has no weight, and "film", "year" and "really" lean slightly positive in such a small dataset (0.011, 0.175, 0.310). More data would fix it.</answer>
</quiz>
