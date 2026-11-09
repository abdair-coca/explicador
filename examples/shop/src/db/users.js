// Users table, in memory for the sample. The demo password is "lovelace".
const users = [
  {
    id: 1,
    name: 'Ada',
    email: 'ada@example.com',
    passwordHash:
      'scrypt$5f1d0c7e9a2b4c6d8e0f1a2b3c4d5e6f$2149472b64273889a876e5ba0e4a969ac9df3c8290fddb2d5cb2abfc807940c6bcf4af4f51ab5ed055d21f1188bb100e697965139cf525db87dcaea430e19b0d',
  },
];

export function findUserByEmail(email) {
  return users.find((user) => user.email === email);
}
