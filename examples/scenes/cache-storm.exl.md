# Why can a sale take the database down?

<brief form="system">
<audience>Developers who have used a cache and a retry loop, but never drawn what they do to each other</audience>
<question>Why can a traffic spike on a cold cache take the database down, and what stops it?</question>
<example>At 9:00 a sale sends 500 reads a second instead of 100, with an empty cache</example>
<misconception>Believing that retrying a slow request always helps it succeed</misconception>
<check>Predict which way the database load moves when the client backs off instead of retrying at once</check>
<terms>reinforcing loop, balancing loop</terms>
</brief>

<theme name="database" />

At 9:00 a sale starts. The shop usually reads 100 keys a second, mostly from its cache; now 500 arrive, and the cache was just restarted.

<timeline id="incident" title="Five minutes from a sale to a saturated database" arc="example" ref="reads.py:9-25">
<event label="The sale starts" when="9:00">500 reads a second reach an empty cache, so every one of them goes on to the database.</event>
<event label="The database slows" when="9:01">500 queries at once: each one now takes longer than the 0.5 s the client waits.</event>
<event label="Clients send again" when="9:01">Each slow read is sent again at once, up to 3 more times: up to 2,000 reads a second.</event>
<event label="The cache fills" when="9:03">Every answer that does arrive is kept, so a key asked twice stops reaching the database.</event>
<event label="Retries win the race" when="9:05">Retries arrive faster than the cache fills, and the database stays saturated.</event>
</timeline>

Two kinds of loop are at work, pulling in opposite directions.

<concept term="Reinforcing loop">
<define>A chain of causes that comes back to where it started and pushes it further the same way.</define>
<analogy>A microphone too close to its speaker: the sound comes back louder each time round, until it screeches.</analogy>
<example>More slow reads bring more retries, which bring more reads, which bring more slow reads.</example>
</concept>

<concept term="Balancing loop">
<define>A chain of causes that comes back to where it started and pushes it the other way, toward a steady level.</define>
<analogy>A thermostat: the warmer the room, the less the heater runs.</analogy>
<example>More cache misses store more keys, and more stored keys bring fewer misses.</example>
</concept>

Here is the whole system, with the sale played through it one link at a time.

<system id="storm" title="Retries feed the load that causes them" arc="answer" ref="reads.py:9-25">
<factor id="traffic" label="Reads per second" />
<factor id="misses" label="Cache misses" ref="reads.py:9-15" />
<factor id="load" label="Database load" />
<factor id="slow" label="Slow reads" />
<factor id="retries" label="Retries" ref="reads.py:18-25" />
<factor id="cached" label="Keys in the cache" ref="reads.py:9-15" />
<link from="traffic" to="misses" sign="same" />
<link from="misses" to="load" sign="same" />
<link from="load" to="slow" sign="same" />
<link from="slow" to="retries" sign="same" />
<link from="retries" to="traffic" sign="same" label="sent again" />
<link from="misses" to="cached" sign="same" />
<link from="cached" to="misses" sign="opposite" />
<loop through="traffic misses load slow retries" label="Retry storm" />
<loop through="misses cached" label="The cache fills" />
<push factor="traffic" change="up">The sale: 500 reads a second instead of 100.</push>
<effect from="traffic" to="misses">An empty cache misses every one of them.</effect>
<effect from="misses" to="load">Every miss becomes a database query.</effect>
<effect from="load" to="slow">With 500 queries at once, each one takes longer than 0.5 s.</effect>
<effect from="slow" to="retries">A read slower than 0.5 s is sent again at once, up to 3 times.</effect>
<effect from="retries" to="traffic">Every retry is a new read: the loop feeds itself.</effect>
<effect from="misses" to="cached">Meanwhile every answer that arrives is kept in the cache.</effect>
<effect from="cached" to="misses" ask="The cache is filling up. Which way do the misses go now?">A fuller cache misses less: this loop pushes back.</effect>
</system>

The cache's loop pushes back, but slowly: it needs answers to arrive, and the retry storm keeps them from arriving. The fix is in the client.

<compare id="fix" title="Retrying at once feeds the storm; backing off lets the cache fill" a="Retry at once: fetch()" b="Back off: fetch_with_backoff()" ref="reads.py:18-38" arc="contrast">
<pair label="Does retrying help?" a="No: each slow request adds 3 more at once, so every read slows down" b="Yes: each retry waits twice as long, so the cache has time to fill" winner="b" />
<pair label="Reads a second during the spike" a="up to 2,000" b="500, spread out as the waits grow" winner="b" />
<pair label="Time to the first answer, when the database is fine" a="the same" b="the same" winner="tie" />
</compare>

<quiz id="backoff-check" question="The client backs off instead of retrying at once. Which way does the database load move during the spike?">
<option correct="true" why="The same tries arrive spread over time, so fewer queries run at once, and the cache fills before the next wave.">Down</option>
<option why="Waiting spreads the same reads over time; it adds no reads.">Up, because reads pile up while they wait</option>
<option why="The tries are as many, but not at the same moment, and load is what runs at once.">It stays the same, since the number of tries is the same</option>
</quiz>
