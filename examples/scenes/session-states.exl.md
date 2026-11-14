# Session lifecycle

<brief form="process">
<audience>Developers new to this shop's code; they know what a cookie is</audience>
<question>What states can a visitor's session be in, and what moves it between them?</question>
<example>The visitor Ada types a wrong password, logs in, logs out, logs in again and waits 1 hour</example>
<misconception>Believing an expired session is deleted the moment its hour ends</misconception>
<check>Predict when Ada's session is deleted once her hour is over</check>
<terms>time to live</terms>
</brief>

<theme name="security web" />

Follow Ada through one visit to the shop: six things happen, and each one changes what the server knows about her.

<timeline id="ada-visit" title="Ada's visit: six events, three outcomes" arc="example">
<event label="Wrong password" ref="src/auth/auth-service.js:6-11">Ada mistypes her password; the shop answers "Wrong email or password" and she stays anonymous.</event>
<event label="Logs in" ref="src/auth/auth-service.js:12-13">The right password gives her a random session id in a cookie.</event>
<event label="Logs out" ref="src/api/auth-routes.js:22-27">Logout deletes her session and clears the cookie.</event>
<event label="Logs in again" ref="src/auth/sessions.js:7-11">A new login opens a new session with a new id.</event>
<event label="1 hour passes">She leaves the tab open; her session's hour runs out while nobody uses it.</event>
<event label="Next request" ref="src/auth/sessions.js:13-21">She clicks again: the server finds the session expired, deletes it, and she is anonymous.</event>
</timeline>

<concept term="Time to live (TTL)" ref="src/auth/sessions.js:4">
<define>How long a stored thing stays valid after it is created.</define>
<analogy>The date on a parking ticket: after it, the ticket is worthless, even if it is still on the dashboard.</analogy>
<example>A session here lives one hour: created at 10:00, it is expired at 11:00.</example>
</concept>

A visitor is anonymous until a login succeeds. The session then lives for one hour, ends on logout, or disappears when the server restarts.

<state id="session-lifecycle" title="A session is anonymous, logged in, expired or lost" arc="answer">
  <status id="anon" label="Anonymous" desc="No valid cookie" role="initial" ref="src/api/require-session.js" />
  <status id="active" label="Logged in" desc="Cookie maps to a session" ref="src/auth/sessions.js:7-11" />
  <status id="expired" label="Expired" desc="Past its TTL, not yet removed" ref="src/auth/sessions.js:13-21" />
  <status id="lost" label="Lost (restart)" desc="The map is gone" role="final" />
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
  <code node="expired" ref="src/auth/sessions.js:13-21">An expired session is removed only when someone uses it: findSession deletes it and answers as if it never existed.</code>
</state>

Nothing watches the clock. An expired session stays in memory until a request asks for it.

<compare id="expiry" title="An expired session waits for a request to be deleted" a="What one expects" b="What the code does" ref="src/auth/sessions.js:13-21" arc="contrast">
<pair label="When the hour ends" a="the session is deleted" b="nothing happens: it stays in the map" />
<pair label="On the next request" a="nothing left to do" b="findSession sees it expired and deletes it" />
</compare>

<quiz id="expiry-check" question="Ada's hour is over. When is her session deleted?">
<option why="Nothing watches the clock: the session stays in the map after its hour ends.">The moment the hour ends</option>
<option correct="true" why="findSession checks the expiry when a request uses the session, and only then deletes it.">On her next request</option>
<option why="Logout deletes it too, but an expired session goes away earlier, on its next use.">Only when she logs out</option>
</quiz>
