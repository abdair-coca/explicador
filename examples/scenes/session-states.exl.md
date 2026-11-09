# Session lifecycle

A visitor is anonymous until a login succeeds. The session then lives for one hour, ends on logout, or disappears when the server restarts.

<state id="session-lifecycle" title="A visitor's session">
  <status id="anon" label="Anonymous" role="initial" ref="src/api/require-session.js" />
  <status id="active" label="Logged in" ref="src/auth/sessions.js:7-11" />
  <status id="expired" label="Expired" ref="src/auth/sessions.js:13-21" />
  <status id="lost" label="Lost (restart)" role="final" />
  <transition from="anon" to="anon" event="wrong password" ref="src/auth/auth-service.js:6-11" />
  <transition from="anon" to="active" event="login ok" ref="src/auth/auth-service.js:12-13" />
  <transition from="active" to="anon" event="logout" ref="src/api/auth-routes.js:22-27" />
  <transition from="active" to="expired" event="1 hour passes" />
  <transition from="expired" to="anon" event="next request" ref="src/auth/sessions.js:16-19" />
  <transition from="active" to="lost" event="server restarts" />
  <walk>
    <go event="wrong password">A failed login keeps the visitor anonymous and says only "Wrong email or password".</go>
    <go event="login ok">The password matches: a random session id is stored and sent as an HttpOnly cookie.</go>
    <go event="logout">Logout deletes the session and clears the cookie.</go>
    <go event="login ok">Logging in again opens a new session.</go>
    <go event="1 hour passes">The session outlives its TTL but stays in the map until someone uses it.</go>
    <go event="next request">findSession sees it expired, deletes it, and the visitor is anonymous again.</go>
  </walk>
  <drill node="active" topic="sessions" />
</state>
