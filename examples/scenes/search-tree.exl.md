# Where does each value go in a search tree?

<brief form="structure">
<audience>Programmers who know lists and recursion, but have never built a tree</audience>
<question>Where does each value go in a binary search tree, and what shape does the tree end up with?</question>
<example>Insert 50, 30, 70, 20 and 40, in that order, with insert() from bst.py</example>
<misconception>Believing the tree always stays balanced, whatever the order of the values</misconception>
<check>Predict the height of the tree when 70, 50, 40, 30 and 20 arrive in that order</check>
<terms>root, leaf, height</terms>
</brief>

<theme name="code" />

Five values arrive one by one: 50, 30, 70, 20 and 40. At every node it passes, `insert()` asks one question, "smaller or not?", and goes down the left or the right.

<structure id="grow" title="Five values in, a tree three levels deep" arc="example" ref="bst.py:11-19">
<member id="n50" label="50" />
<member id="n30" label="30" parent="n50" side="left" />
<member id="n70" label="70" parent="n50" side="right" />
<member id="n20" label="20" parent="n30" side="left" />
<member id="n40" label="40" parent="n30" side="right" />
<change label="Insert 50" add="n50">The tree is empty, so 50 becomes its first node.</change>
<change label="Insert 30" add="n30" mark="n50">30 is smaller than 50, so it goes down the left.</change>
<change label="Insert 70" add="n70" mark="n50">70 is not smaller than 50, so it goes down the right.</change>
<change label="Insert 20" add="n20" mark="n50 n30">20 is smaller than 50, then smaller than 30: left, and left again.</change>
<change label="Insert 40" add="n40" mark="n50 n30" ask="Where does 40 go: which node, and which side?">40 is smaller than 50 but not than 30: left, then right.</change>
</structure>

Three words name what the picture shows.

<concept term="Root" ref="bst.py:11-14">
<define>The node every search and every insert starts from: the first value inserted.</define>
<analogy>The front door of a building: every visit starts there.</analogy>
<example>Here the root is 50: every new value is compared with it first.</example>
</concept>

<concept term="Leaf">
<define>A node with no children, where a branch ends.</define>
<analogy>The last stop of a bus line.</analogy>
<example>20, 40 and 70 are leaves; 50 and 30 are not.</example>
</concept>

<concept term="Height" ref="bst.py:22-26">
<define>The number of levels from the root down to the deepest leaf.</define>
<analogy>The floors of a building: a search climbs down at most one floor per comparison.</analogy>
<example>50, 30 and 20 are three levels, so the height is 3, as `python3 bst.py` prints.</example>
</concept>

The rule is the same at every level, which is why `insert()` calls itself: one comparison, one step down.

<trace id="insert-40" title="40 asks two questions and lands right of 30" arc="idea" ref="bst.py:11-19">
<value label="The value">40</value>
<value label="At 50" code="value &lt; root.value" note="40 is smaller than 50, so insert() goes down the left.">smaller, go left</value>
<value label="At 30" code="value &lt; root.value" note="40 is not smaller than 30, so it goes down the right.">not smaller, go right</value>
<value label="An empty place" code="return Node(value)" note="Nothing is right of 30 yet, so 40 becomes a new leaf there.">a new leaf: 40</value>
</trace>

Now the same five values arrive sorted. Nothing in `insert()` rebalances the tree.

<structure id="line" title="The same values, sorted, grow a line five levels deep" arc="contrast" ref="bst.py:11-19">
<member id="m20" label="20" />
<member id="m30" label="30" parent="m20" side="right" />
<member id="m40" label="40" parent="m30" side="right" />
<member id="m50" label="50" parent="m40" side="right" />
<member id="m70" label="70" parent="m50" side="right" />
<change label="Insert 20" add="m20">20 arrives first, so it is the root this time.</change>
<change label="Insert 30" add="m30" mark="m20">30 is larger than 20: right.</change>
<change label="Insert 40" add="m40" mark="m20 m30">40 is larger than both: right, right.</change>
<change label="Insert 50" add="m50" mark="m20 m30 m40">Every value is larger than all before it, so it always goes right.</change>
<change label="Insert 70" add="m70" mark="m20 m30 m40 m50">The tree is not balanced at all: it stays a line, five levels deep.</change>
</structure>

<compare id="orders" title="The order of the values decides the shape" a="50, 30, 70, 20, 40" b="20, 30, 40, 50, 70" ref="bst.py:29-38" arc="answer">
<pair label="Height" a="3" b="5" winner="a" />
<pair label="Shape" a="balanced: two levels under the root" b="a line that always leans right" winner="a" />
<pair label="Comparisons to find 70" a="2" b="5" winner="a" />
</compare>

> [!IMPORTANT]
> A search tree is only as short as the order of its values lets it be. Trees that rebalance themselves (AVL, red-black) exist for exactly this reason.

<quiz id="height-check" question="70, 50, 40, 30 and 20 arrive in that order. What is the height of the tree?">
<option correct="true" why="Each value is smaller than all before it, so each one goes left: a line of 5 levels leaning left.">5</option>
<option why="3 needs a value that splits the others, like 50 first in the middle of the order.">3</option>
<option why="Five values never fit in 2 levels: two levels hold at most 3 nodes.">2</option>
</quiz>
