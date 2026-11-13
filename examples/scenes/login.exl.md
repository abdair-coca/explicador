# What happens when you log in?

<theme name="security" />

The browser form posts the credentials as JSON. The auth routes validate the input, the auth service checks the password with scrypt and opens an in-memory session, and the session id comes back as an `HttpOnly` cookie that later guards the cart.

<arch id="login-architecture" title="The server checks the password and keeps the session in memory">
  <node id="user" label="User" desc="Types an email and a password" kind="actor" />
  <node id="form" label="Login form (browser)" desc="Posts the credentials as JSON" kind="ui" ref="src/ui/login-form.js" />
  <node id="routes" label="Auth routes" desc="Validate input and set the session cookie" kind="service" ref="src/api/auth-routes.js" />
  <group id="auth" label="Auth core" desc="Checks passwords and opens sessions" kind="module">
    <node id="service" label="Auth service" desc="Finds the user and runs the checks" kind="module" ref="src/auth/auth-service.js" />
    <node id="password" label="Password check (scrypt)" desc="Re-hashes and compares in constant time" kind="function" ref="src/auth/password.js">
      Passwords are stored as `scrypt$salt$hash` in hex: a random 16-byte salt and a 64-byte key.

      To check a login it derives the key again with the stored salt and compares both keys with `timingSafeEqual`, so the time it takes does not reveal how much of the password matched.
    </node>
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
  <code node="password" ref="src/auth/password.js:14-19">
    The stored salt re-derives the key, and timingSafeEqual compares it without leaking timing.
  </code>
  <code node="service" ref="src/auth/auth-service.js:6-14">
    Unknown emails still run scrypt against a dummy hash, so a wrong email and a wrong password take the same time.
  </code>
</arch>

Follow one login, Ada's, with the demo password from the users table.

<trace id="login-trace" title="The password is never stored: only its scrypt key is compared" ref="src/auth/password.js:14-19">
<value label="What Ada types">ada@example.com · lovelace</value>
<value kind="table" label="What the form posts" code="JSON.stringify(body)" ref="src/ui/login-form.js:7-11" note="The form sends both fields once, as JSON, to POST /api/login.">email=ada@example.com|password=lovelace</value>
<value kind="table" label="What the users table keeps" code="findUserByEmail(email).passwordHash" ref="src/db/users.js:2-10" note="The table keeps a random salt and a 64-byte scrypt key, never the password itself.">salt=5f1d0c7e…|key=2149472b…</value>
<value kind="table" label="What the check derives" code="scryptAsync(password, salt, 64)" ref="src/auth/password.js:17" note="scrypt runs again on what Ada typed, with the stored salt, and gives the same 64-byte key.">salt=5f1d0c7e…|key=2149472b…</value>
<value label="The answer" code="timingSafeEqual(key, expected)" ref="src/auth/password.js:18" note="The two keys match, compared in constant time, so the service opens a session for Ada.">true</value>
<value label="What the browser gets" code="set-cookie" ref="src/api/auth-routes.js:18" note="A random 48-character session id in an HttpOnly cookie that expires after one hour.">sid=…; HttpOnly; SameSite=Strict; Max-Age=3600</value>
</trace>

<flow id="login-flow" title="A right password earns a cookie for one hour">
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
    It calls login() with the lower-cased email and the password; the service decides, the route only answers.
  </step>
  <step from="service" to="users" label="findUserByEmail" ref="src/auth/auth-service.js:7">
    The service finds the user in a fixed in-memory list and takes the stored scrypt hash.
  </step>
  <step from="service" to="password" label="verifyPassword" ref="src/auth/password.js:15-20">
    It re-hashes the password with the stored salt and compares in constant time, even for unknown emails, so timing reveals no account.
  </step>
  <step from="service" to="sessions" label="createSession" ref="src/auth/sessions.js:7-11">
    On success it creates a random session id that expires after one hour.
  </step>
  <step from="service" to="routes" kind="return" label="session id + user" ref="src/auth/auth-service.js:11-13">
    The service returns the new session id and the user's name; a failure returns only ok: false, which the route answers with 401.
  </step>
  <step from="routes" to="form" kind="return" label="200 + sid cookie" ref="src/api/auth-routes.js:18-19">
    The route sets the session as an HttpOnly, SameSite=Strict cookie and the form moves on to the cart.
  </step>
  <drill node="password" topic="password hashing" />
  <code node="sessions" ref="src/auth/sessions.js:7-11">
    The id is 24 random bytes and lives only in memory, so a restart logs everyone out.
  </code>
</flow>

Wrong email and wrong password get the same `401` message, so the API does not leak which accounts exist.
