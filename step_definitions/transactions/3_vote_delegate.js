const { getFixtureUser, from } = require('../../utils');

const I = actor();

When('{string} cast vote for a delegate {string}', async (sender, receiver) => {
  const { publicKey } = getFixtureUser('username', receiver);
  const { passphrase } = getFixtureUser('username', sender);
  const votes = [publicKey];

  const isVoted = await I.checkIfVoteOrUnvoteCasted(votes, passphrase);

  if (isVoted) {
    return;
  }
  await from(I.castVotes({ votes, passphrase }));
});

When('{string} cast my vote for himself', async (userName) => {
  const { passphrase, publicKey } = getFixtureUser('username', userName);
  const votes = [publicKey];

  const isVoted = await I.checkIfVoteOrUnvoteCasted(votes, passphrase);

  if (isVoted) {
    return;
  }
  await from(I.castVotes({ votes, passphrase }));
});

Then('delegate {string} should received vote from {string}', async (receiver, sender) => {
  const delegate = getFixtureUser('username', receiver);
  const voter = getFixtureUser('username', sender);
  const api = await I.call();

  const pendingTrx = await I.getPendingTransactionCount();
  if (pendingTrx > 0) {
    await I.waitForBlock(pendingTrx);
  }

  const { result, error } = await from(
    api.getVoters({ address: delegate.address })
  );
  expect(error).to.be.null;
  expect(result.data.address).to.deep.equal(delegate.address);
  expect(result.data.voters.some(v => v.address === voter.address)).to.deep.equal(true);
});
