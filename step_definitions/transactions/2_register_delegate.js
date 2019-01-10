const { getFixtureUser } = require('../../utils');

const I = actor();
When('{string} register as a delegate', async (userName) => {
  const { username, address, passphrase, secondPassphrase } = getFixtureUser('username', userName);

  await I.haveAccountRegisteredAsDelegate(username, address, passphrase, secondPassphrase);
});
