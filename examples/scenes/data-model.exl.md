# The shop's data

<theme name="database" />

Everything lives in memory: users in a fixed list, sessions and carts in `Map`s keyed by id.

<data id="shop-data" title="Shop data model">
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
  <entity id="cart" label="Cart" ref="src/cart/cart-service.js">
    <field name="userId" type="int" key="pk" />
  </entity>
  <entity id="item" label="Cart item" ref="src/cart/cart-service.js">
    <field name="sku" type="string" />
    <field name="name" type="string" />
    <field name="quantity" type="int" />
  </entity>
  <relation from="user" to="session" card="1-n" label="logs in" />
  <relation from="user" to="cart" card="1-1" label="owns" />
  <relation from="cart" to="item" card="1-n" label="holds" />
  <drill node="session" topic="session lifecycle" />
</data>
