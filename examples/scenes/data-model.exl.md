# The shop's data

<brief form="structure">
<audience>Developers new to this shop's code; they know what a table and a key are</audience>
<question>What does the shop keep, and how do users, sessions and carts relate?</question>
<example>The user Ada (id 1) logs in, and her cart holds one copy of "Notes on the Analytical Engine"</example>
<misconception>Believing the shop keeps its data in a database that survives a restart</misconception>
<check>Predict what is left of Ada's session and cart after the server restarts</check>
<terms>primary key, foreign key</terms>
</brief>

<theme name="database" />

Ada has an account, logs in and keeps a book in her cart. Each of those leaves a record, and the three records point at each other through one number: her id.

<trace id="ada-records" title="Ada leaves three records, all tied to the number 1" arc="example">
<value kind="table" label="Ada, in the users list" ref="src/db/users.js:2-10">id=1|name=Ada|email=ada@example.com</value>
<value kind="table" label="Her session, once she logs in" ref="src/auth/sessions.js:7-11" note="Its id is random, so only her browser knows it; it points back to user 1 and expires an hour later.">id=48 random characters|userId=1|expiresAt=in 1 hour</value>
<value kind="table" label="Her cart" ref="src/cart/cart-service.js:2" note="The cart is filed under her id, 1, and holds one book.">userId=1|sku=BOOK-1843|quantity=1</value>
</trace>

<concept term="Primary key">
<define>The field that names one record and no other, so everything else can point at it.</define>
<analogy>A seat number in a theatre: two people may share a name, never a seat.</analogy>
<example>Ada's `id` is 1: no other user can have it.</example>
</concept>

<concept term="Foreign key">
<define>A field that holds another record's primary key, to say which record it belongs to.</define>
<analogy>The seat number printed on a coat-check ticket: it tells you whose coat it is.</analogy>
<example>Her session's `userId` is 1, so the session is Ada's.</example>
</concept>

Everything lives in memory: users in a fixed list, sessions and carts in `Map`s keyed by id.

<data id="shop-data" title="Users own sessions and a cart through their id" arc="answer">
  <entity id="user" label="User" desc="A fixed list; no sign-up" ref="src/db/users.js">
    <field name="id" type="int" key="pk" />
    <field name="name" type="string" />
    <field name="email" type="string" key="unique" />
    <field name="passwordHash" type="scrypt$salt$hash" />
  </entity>
  <entity id="session" label="Session" desc="Lives one hour in memory" ref="src/auth/sessions.js">
    <field name="id" type="hex (48)" key="pk" />
    <field name="userId" type="int" key="fk" />
    <field name="expiresAt" type="ms epoch" />
  </entity>
  <entity id="cart" label="Cart" desc="One list per user, in memory" ref="src/cart/cart-service.js">
    <field name="userId" type="int" key="pk" />
  </entity>
  <entity id="item" label="Cart item" desc="A product and how many of it" ref="src/cart/cart-service.js">
    <field name="sku" type="string" />
    <field name="name" type="string" />
    <field name="quantity" type="int" />
  </entity>
  <relation from="user" to="session" card="1-n" label="logs in" />
  <relation from="user" to="cart" card="1-1" label="owns" />
  <relation from="cart" to="item" card="1-n" label="holds" />
  <drill node="session" topic="session lifecycle" />
  <code node="user" ref="src/db/users.js:2-10">The only user is written in the code, with an scrypt hash: there is no sign-up and no database.</code>
  <code node="session" ref="src/auth/sessions.js:7-11">A session is a random id mapped to its user and to an expiry one hour ahead.</code>
</data>

It looks like a database, but nothing of it is written to disk.

<compare id="memory-vs-database" title="A restart empties everything but the users list" a="A database" b="This shop" arc="contrast">
<pair label="Where the records live" a="on disk" b="in Maps in memory" />
<pair label="After a restart" a="every record is still there" b="only the users list, written in the code, survives" />
</compare>

<quiz id="restart-check" question="The server restarts. What is left of Ada's session and cart?">
<option why="There is no database: sessions and carts live in Maps in memory, which a restart empties.">Both, they are kept in a database</option>
<option correct="true" why="Only the fixed list of users is written in the code; sessions and carts lived in memory and are gone.">Nothing: only the list of users survives</option>
<option why="Both Maps live in the same memory, so neither survives the restart.">The cart, but not the session</option>
</quiz>
