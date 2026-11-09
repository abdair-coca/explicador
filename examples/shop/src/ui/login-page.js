// Server-rendered login page; the form script is inlined from login-form.js.
import { loginFormScript } from './login-form.js';

export function renderLoginPage() {
  return `<!doctype html>
<title>Shop login</title>
<form id="login">
  <input name="email" type="email" required>
  <input name="password" type="password" required>
  <button>Log in</button>
  <p id="error" hidden></p>
</form>
<script>${loginFormScript}</script>`;
}
