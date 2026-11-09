# How login works

The browser form posts the credentials as JSON. The auth routes validate the input, the auth service checks the password with scrypt and opens an in-memory session, and the session id comes back as an `HttpOnly` cookie that later guards the cart.

<arch id="login-architecture" title="Login: the parts involved">
  <node id="user" label="User" desc="Types an email and a password" kind="actor" />
  <node id="form" label="Login form (browser)" desc="Posts the credentials as JSON" kind="ui" ref="src/ui/login-form.js" />
  <node id="routes" label="Auth routes" desc="Validate input and set the session cookie" kind="service" ref="src/api/auth-routes.js" />
  <group id="auth" label="Auth core" desc="Checks passwords and opens sessions" kind="module">
    <node id="service" label="Auth service" desc="Finds the user and runs the checks" kind="module" ref="src/auth/auth-service.js" />
    <node id="password" label="Password check (scrypt)" desc="Re-hashes and compares in constant time" kind="function" ref="src/auth/password.js" />
    <node id="sessions" label="Session store" desc="In-memory map of ids that expire in 1 h" kind="store" ref="src/auth/sessions.js" />
  </group>
  <node id="users" label="Users table" desc="Fixed list of users and hashes" kind="store" ref="src/db/users.js" />
  <edge from="user" to="form" label="types" />
  <edge from="form" to="routes" label="POST /api/login" />
  <edge from="routes" to="service" label="login()" />
  <edge from="service" to="users" label="find by email" />
  <edge from="service" to="password" label="verify" />
  <edge from="service" to="sessions" label="create" />
  <drill node="routes" topic="auth routes" />
  <drill node="password" topic="password hashing" />
</arch>

<flow id="login-flow" title="Logging in, step by step">
  <node id="form" label="Login form" desc="Sends the credentials" kind="ui" ref="src/ui/login-form.js" />
  <node id="routes" label="Auth routes" desc="Validate and reply" kind="service" ref="src/api/auth-routes.js" />
  <node id="service" label="Auth service" desc="Runs the login checks" kind="module" ref="src/auth/auth-service.js" />
  <node id="users" label="Users table" desc="Looks up by email" kind="store" ref="src/db/users.js" />
  <node id="password" label="Password check" desc="scrypt, constant time" kind="function" ref="src/auth/password.js" />
  <node id="sessions" label="Session store" desc="Random ids, 1 h TTL" kind="store" ref="src/auth/sessions.js" />
  <step from="form" to="routes" label="POST /api/login" ref="src/ui/login-form.js:7-11">
    On submit, the form sends the email and password as JSON.
  </step>
  <step from="routes" label="validate" ref="src/api/auth-routes.js:6-11">
    The route rejects missing fields with 400 and lower-cases the email.
  </step>
  <step from="routes" to="service" label="login(email, password)" ref="src/api/auth-routes.js:12">
    It hands the credentials to the auth service.
  </step>
  <step from="service" to="users" label="findUserByEmail" ref="src/auth/auth-service.js:7">
    The service looks the user up by email.
  </step>
  <step from="service" to="password" label="verifyPassword" ref="src/auth/password.js:15-20">
    It re-hashes the password with the stored salt and compares in constant time. Unknown emails are checked against a dummy hash, so timing does not reveal which accounts exist.
  </step>
  <step from="service" to="sessions" label="createSession" ref="src/auth/sessions.js:7-11">
    On success it creates a random session id that expires after one hour.
  </step>
  <step from="routes" to="form" label="200 + sid cookie" ref="src/api/auth-routes.js:18-19">
    The route sets the session as an HttpOnly, SameSite=Strict cookie and the form moves on to the cart.
  </step>
  <drill node="password" topic="password hashing" />
</flow>

Wrong email and wrong password get the same `401` message, so the API does not leak which accounts exist.
