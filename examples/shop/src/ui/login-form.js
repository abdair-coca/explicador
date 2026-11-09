// Browser code for the login form, shipped as a string by login-page.js.
// It posts the credentials as JSON and goes to the cart on success.
export const loginFormScript = `
const form = document.getElementById('login');
const error = document.getElementById('error');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(form));
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.ok) {
    window.location.assign('/api/cart');
    return;
  }
  const { message } = await response.json();
  error.textContent = message;
  error.hidden = false;
});
`;
