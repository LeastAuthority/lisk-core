/*
 * Copyright © 2020 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */

import { expect, test } from '@oclif/test';
import * as sandbox from 'sinon';
import * as fs from 'fs-extra';
import * as inquirer from 'inquirer';
import { cryptography, IPCChannel, transactionSchema } from 'lisk-sdk';

import baseIPC from '../../../src/base_ipc';
import * as appUtils from '../../../src/utils/application';
import * as readerUtils from '../../../src/utils/reader';
import {
	dposVoteAssetSchema,
	tokenTransferAssetSchema,
	accountSchema,
} from '../../utils/transactions';

const transactionsAssets = [
	{
		moduleID: 2,
		assetID: 0,
		schema: tokenTransferAssetSchema,
	},
	{
		moduleID: 5,
		assetID: 1,
		schema: dposVoteAssetSchema,
	},
];
const passphrase = 'peanut hundred pen hawk invite exclude brain chunk gadget wait wrong ready';
const transferAsset =
	'{"amount":100,"recipientAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","data":"send token"}';
const voteAsset =
	'{"votes":[{"delegateAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","amount":100},{"delegateAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","amount":-50}]}';
const unVoteAsset =
	'{"votes":[{"delegateAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","amount":-50}]}';
const { publicKey } = cryptography.getAddressAndPublicKeyFromPassphrase(passphrase);
const senderPublickey = publicKey.toString('hex');

describe('transaction:create command', () => {
	const fsStub = sandbox.stub().returns(true);
	const printJSONStub = sandbox.stub();
	const ipcInvokeStub = sandbox.stub();
	const ipcStartAndListenStub = sandbox.stub();
	const promptAssetStub = sandbox.stub().resolves({
		amount: 100,
		recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
		data: 'send token',
	});

	ipcInvokeStub
		.withArgs('app:getSchema')
		.resolves({
			transaction: transactionSchema,
			transactionsAssets,
			account: accountSchema,
		})
		.withArgs('app:getNodeInfo')
		.resolves({
			networkIdentifier: '873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3',
		})
		.withArgs('app:getAccount')
		.resolves(
			'0a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb8581512050880c2d72f1a020800220208002a3b0a1a0a0a67656e657369735f3834180020850528003080a094a58d1d121d0a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151080a094a58d1d',
		);

	afterEach(() => {
		ipcInvokeStub.resetHistory();
		printJSONStub.resetHistory();
		ipcStartAndListenStub.resetHistory();
		promptAssetStub.resetHistory();
	});

	const setupTest = () =>
		test
			.stub(appUtils, 'isApplicationRunning', sandbox.stub().returns(true))
			.stub(fs, 'existsSync', fsStub)
			.stub(baseIPC.prototype, 'printJSON', printJSONStub)
			.stub(IPCChannel.prototype, 'startAndListen', ipcStartAndListenStub)
			.stub(IPCChannel.prototype, 'invoke', ipcInvokeStub)
			.stub(inquirer, 'prompt', promptAssetStub)
			.stub(readerUtils, 'getPassphraseFromPrompt', sandbox.stub().resolves(passphrase))
			.stdout()
			.stderr();

	describe('transaction:create', () => {
		setupTest()
			.command(['transaction:create'])
			.catch((error: Error) => expect(error.message).to.contain('Missing 3 required args:'))
			.it('should throw an error when no arguments are provided.');
	});

	describe('transaction:create 2', () => {
		setupTest()
			.command(['transaction:create', '2'])
			.catch((error: Error) => expect(error.message).to.contain('Missing 2 required args:'))
			.it('should throw an error when fee, nonce and transaction type are provided.');
	});

	describe('transaction:create 2 0', () => {
		setupTest()
			.command(['transaction:create', '2', '0'])
			.catch((error: Error) => expect(error.message).to.contain('Missing 1 required arg:'))
			.it('should throw an error when nonce and transaction type are provided.');
	});

	describe('transaction:create 99999 0 100000000', () => {
		setupTest()
			.command(['transaction:create', '99999', '0', '100000000'])
			.catch((error: Error) =>
				expect(error.message).to.contain(
					'Transaction moduleID:99999 with assetID:0 is not registered in the application',
				),
			)
			.it('should throw an error when moduleID is not registered.');
	});

	describe('offline', () => {
		describe('with flags', () => {
			describe(`transaction:create 2 0 100000000 --asset='{"amount": "abc"}' --passphrase=${passphrase} --offline`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						'--asset={"amount": "abc"}',
						`--passphrase=${passphrase}`,
						'--offline',
						'--data-path=/tmp',
						'--network=devnet',
					])
					.catch((error: Error) =>
						expect(error.message).to.contain(
							'Flag: --data-path should not be specified while creating transaction offline',
						),
					)
					.it('should throw error for data path flag.');
			});

			describe(`transaction:create 2 0 100000000 --asset='{"amount": "abc"}' --passphrase=${passphrase} --offline`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						'--asset={"amount": "abc"}',
						`--passphrase=${passphrase}`,
						'--offline',
						'--network=devnet',
					])
					.catch((error: Error) =>
						expect(error.message).to.contain(
							'Flag: --network-identifier must be specified while creating transaction offline',
						),
					)
					.it('should throw error for missing network identifier flag.');
			});

			describe(`transaction:create 2 0 100000000 --asset='{"amount": "abc"}' --passphrase=${passphrase} --offline`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						'--asset={"amount": "abc"}',
						`--passphrase=${passphrase}`,
						'--offline',
						'--network=devnet',
						'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
					])
					.catch((error: Error) =>
						expect(error.message).to.contain(
							'Flag: --nonce must be specified while creating transaction offline',
						),
					)
					.it('should throw error for missing nonce flag.');
			});

			describe(`transaction:create 2 0 100000000 --asset=${transferAsset} --no-signature`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						`--asset=${transferAsset}`,
						'--no-signature',
						'--offline',
						'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
						'--nonce=1',
						'--network=devnet',
					])
					.catch((error: Error) =>
						expect(error.message).to.contain(
							'Sender publickey must be specified when no-signature flags is used',
						),
					)
					.it(
						'should throw error when sender publickey not specified when no-signature flag is used.',
					);
			});

			describe(`transaction:create 2 0 100000000 --asset=${transferAsset} --passphrase=${passphrase}`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						'--offline',
						`--asset=${transferAsset}`,
						`--passphrase=${passphrase}`,
						'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
						'--nonce=1',
						'--network=devnet',
					])
					.it('should return encoded transaction string in hex format with signature', () => {
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0802100018012080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a40816039d55d0710f6b412e221b4fc0422a29d5314603c43eeafab0017e4c6bfbd575c5d53b2c0429992922737ec0f8add0767b904b80cfc411021bfdb0b04bc0a',
						});
					});
			});

			describe(`transaction:create 2 0 100000000 --asset=${transferAsset} --no-signature --sender-publickey=${senderPublickey}`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						'--offline',
						`--asset=${transferAsset}`,
						'--no-signature',
						`--sender-publickey=${senderPublickey}`,
						'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
						'--nonce=1',
						'--network=devnet',
					])
					.it('should return encoded transaction string in hex format without signature', () => {
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0802100018012080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e',
						});
					});
			});

			describe(`transaction:create 5 1 100000000 --asset=${voteAsset} --passphrase=${passphrase}`, () => {
				setupTest()
					.command([
						'transaction:create',
						'5',
						'1',
						'100000000',
						'--offline',
						`--asset=${voteAsset}`,
						`--passphrase=${passphrase}`,
						'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
						'--nonce=1',
						'--network=devnet',
					])
					.it('should return encoded transaction string in hex format with signature', () => {
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0805100118012080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a32350a190a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb8581510c8010a180a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb8581510633a40cf630a8bd820a4176bde1c9af65c316d020c3db012729d46d1fa5784e0f9b7eaa730dcc7ad603620c302f0855116398e8c9ba7a2a6ed54061e67fbf1f7c5100c',
						});
					});
			});

			describe(`transaction:create 5 1 100000000 --asset=${unVoteAsset} --passphrase=${passphrase}`, () => {
				setupTest()
					.command([
						'transaction:create',
						'5',
						'1',
						'100000000',
						'--offline',
						`--asset=${unVoteAsset}`,
						`--passphrase=${passphrase}`,
						'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
						'--nonce=1',
						'--network=devnet',
					])
					.it('should return encoded transaction string in hex format with signature', () => {
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0805100118012080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a321a0a180a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb8581510633a4009da2349735f2bd71d2e013f261c1ff4a75091daed56521de4b55156a5c8802446574328c76a3168c5f912cdf59275f070c1a1904fec6e8ef3a021019a96820b',
						});
					});
			});
		});

		describe('with prompts and flags', () => {
			describe(`transaction:create 2 0 100000000 --passphrase=${passphrase}`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						`--passphrase=${passphrase}`,
						'--offline',
						'--network=devnet',
						'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
						'--nonce=1',
					])
					.it('should prompt user for asset.', () => {
						expect(promptAssetStub).to.be.calledOnce;
						expect(promptAssetStub).to.be.calledWithExactly([
							{ message: 'Please enter: amount: ', name: 'amount', type: 'input' },
							{
								message: 'Please enter: recipientAddress: ',
								name: 'recipientAddress',
								type: 'input',
							},
							{ message: 'Please enter: data: ', name: 'data', type: 'input' },
						]);
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0802100018012080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a40816039d55d0710f6b412e221b4fc0422a29d5314603c43eeafab0017e4c6bfbd575c5d53b2c0429992922737ec0f8add0767b904b80cfc411021bfdb0b04bc0a',
						});
					});
			});

			describe('transaction:create 2 0 100000000 ', () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						'--offline',
						'--network=devnet',
						'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
						'--nonce=1',
					])
					.it('should prompt user for asset and passphrase.', () => {
						expect(promptAssetStub).to.be.calledOnce;
						expect(promptAssetStub).to.be.calledWithExactly([
							{ message: 'Please enter: amount: ', name: 'amount', type: 'input' },
							{
								message: 'Please enter: recipientAddress: ',
								name: 'recipientAddress',
								type: 'input',
							},
							{ message: 'Please enter: data: ', name: 'data', type: 'input' },
						]);
						expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly('passphrase', true);
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0802100018012080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a40816039d55d0710f6b412e221b4fc0422a29d5314603c43eeafab0017e4c6bfbd575c5d53b2c0429992922737ec0f8add0767b904b80cfc411021bfdb0b04bc0a',
						});
					});
			});

			describe(`transaction:create 2 0 100000000 --asset=${transferAsset} --no-signature --json`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						`--asset=${transferAsset}`,
						'--no-signature',
						`--sender-publickey=${senderPublickey}`,
						'--json',
						'--offline',
						'--network=devnet',
						'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
						'--nonce=1',
					])
					.it(
						'should return unsigned transaction in json format when no passphrase specified',
						() => {
							expect(printJSONStub).to.be.calledOnce;
							expect(printJSONStub).to.be.calledWithExactly({
								moduleID: 2,
								assetID: 0,
								nonce: '1',
								fee: '100000000',
								senderPublicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
								asset: {
									amount: '100',
									data: 'send token',
									recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
								},
								signatures: [],
							});
						},
					);
			});

			describe(`transaction:create 2 0 100000000 --asset=${transferAsset} --passphrase=${passphrase} --json`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						`--asset=${transferAsset}`,
						`--passphrase=${passphrase}`,
						'--json',
						'--offline',
						'--network=devnet',
						'--network-identifier=873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3.',
						'--nonce=1',
					])
					.it('should return signed transaction in json format when passphrase specified', () => {
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							moduleID: 2,
							assetID: 0,
							nonce: '1',
							fee: '100000000',
							senderPublicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
							asset: {
								amount: '100',
								data: 'send token',
								recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
							},
							signatures: [
								'816039d55d0710f6b412e221b4fc0422a29d5314603c43eeafab0017e4c6bfbd575c5d53b2c0429992922737ec0f8add0767b904b80cfc411021bfdb0b04bc0a',
							],
						});
					});
			});
		});
	});

	describe('online', () => {
		describe('with flags', () => {
			describe(`transaction:create 2 0 100000000 --asset='{"amount": "abc"}' --passphrase=${passphrase}`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						'--asset={"amount": "abc"}',
						`--passphrase=${passphrase}`,
					])
					.catch((error: Error) =>
						expect(error.message).to.contain('Cannot convert abc to a BigInt'),
					)
					.it('should throw error for invalid asset.');
			});

			describe(`transaction:create 2 0 100000000 --asset=${transferAsset} --no-signature`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						`--asset=${transferAsset}`,
						'--no-signature',
					])
					.catch((error: Error) =>
						expect(error.message).to.contain(
							'Sender publickey must be specified when no-signature flags is used',
						),
					)
					.it(
						'should throw error when sender publickey not specified when no-signature flag is used.',
					);
			});

			describe(`transaction:create 2 0 100000000 --asset=${transferAsset} --passphrase=${passphrase}`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						`--asset=${transferAsset}`,
						`--passphrase=${passphrase}`,
					])
					.it('should return encoded transaction string in hex format with signature', () => {
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0802100018002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a403cc8c8c81097fe59d9df356b3c3f1dd10f619bfabb54f5d187866092c67e0102c64dbe24f357df493cc7ebacdd2e55995db8912245b718d88ebf7f4f4ac01f04',
						});
					});
			});

			describe(`transaction:create 2 0 100000000 --asset=${transferAsset} --no-signature --sender-publickey=${senderPublickey}`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						`--asset=${transferAsset}`,
						'--no-signature',
						`--sender-publickey=${senderPublickey}`,
					])
					.it('should return encoded transaction string in hex format without signature', () => {
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0802100018002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e',
						});
					});
			});

			describe(`transaction:create 5 1 100000000 --asset=${voteAsset} --passphrase=${passphrase}`, () => {
				setupTest()
					.command([
						'transaction:create',
						'5',
						'1',
						'100000000',
						`--asset=${voteAsset}`,
						`--passphrase=${passphrase}`,
					])
					.it('should return encoded transaction string in hex format with signature', () => {
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0805100118002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a32350a190a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb8581510c8010a180a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb8581510633a40d8d475f98d02508e410c735934f6db047bf99e22094f13fe24281b066d4fc725885f696e4e929320700117e01b1baa7251dd8639d194032c9ad9af93d5d6c50f',
						});
					});
			});

			describe(`transaction:create 5 1 100000000 --asset=${unVoteAsset} --passphrase=${passphrase}`, () => {
				setupTest()
					.command([
						'transaction:create',
						'5',
						'1',
						'100000000',
						`--asset=${unVoteAsset}`,
						`--passphrase=${passphrase}`,
					])
					.it('should return encoded transaction string in hex format with signature', () => {
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0805100118002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a321a0a180a14ab0041a7d3f7b2c290b5b834d46bdc7b7eb8581510633a40cb9d17b605f2711accaba4759a4e99c4b1ece97da0220603af9e8fd9aa88e01cd45dbca9aaad7fee61f6ef622149057b0189a4ab9ab5a9bc3e1a2bdad302d104',
						});
					});
			});
		});

		describe('with prompts and flags', () => {
			describe(`transaction:create 2 0 100000000 --passphrase=${passphrase}`, () => {
				setupTest()
					.command(['transaction:create', '2', '0', '100000000', `--passphrase=${passphrase}`])
					.it('should prompt user for asset.', () => {
						expect(promptAssetStub).to.be.calledOnce;
						expect(promptAssetStub).to.be.calledWithExactly([
							{ message: 'Please enter: amount: ', name: 'amount', type: 'input' },
							{
								message: 'Please enter: recipientAddress: ',
								name: 'recipientAddress',
								type: 'input',
							},
							{ message: 'Please enter: data: ', name: 'data', type: 'input' },
						]);
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0802100018002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a403cc8c8c81097fe59d9df356b3c3f1dd10f619bfabb54f5d187866092c67e0102c64dbe24f357df493cc7ebacdd2e55995db8912245b718d88ebf7f4f4ac01f04',
						});
					});
			});

			describe('transaction:create 2 0 100000000 --nonce=999', () => {
				setupTest()
					.command(['transaction:create', '2', '0', '100000000', '--nonce=999'])
					.it('should prompt user for asset and passphrase.', () => {
						expect(promptAssetStub).to.be.calledOnce;
						expect(promptAssetStub).to.be.calledWithExactly([
							{ message: 'Please enter: amount: ', name: 'amount', type: 'input' },
							{
								message: 'Please enter: recipientAddress: ',
								name: 'recipientAddress',
								type: 'input',
							},
							{ message: 'Please enter: data: ', name: 'data', type: 'input' },
						]);
						expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly('passphrase', true);
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0802100018002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a403cc8c8c81097fe59d9df356b3c3f1dd10f619bfabb54f5d187866092c67e0102c64dbe24f357df493cc7ebacdd2e55995db8912245b718d88ebf7f4f4ac01f04',
						});
					});
			});

			describe('transaction:create 2 0 100000000', () => {
				setupTest()
					.command(['transaction:create', '2', '0', '100000000'])
					.it('should prompt user for asset and passphrase.', () => {
						expect(promptAssetStub).to.be.calledOnce;
						expect(promptAssetStub).to.be.calledWithExactly([
							{ message: 'Please enter: amount: ', name: 'amount', type: 'input' },
							{
								message: 'Please enter: recipientAddress: ',
								name: 'recipientAddress',
								type: 'input',
							},
							{ message: 'Please enter: data: ', name: 'data', type: 'input' },
						]);
						expect(readerUtils.getPassphraseFromPrompt).to.be.calledWithExactly('passphrase', true);
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							transaction:
								'0802100018002080c2d72f2a200fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a322408641214ab0041a7d3f7b2c290b5b834d46bdc7b7eb858151a0a73656e6420746f6b656e3a403cc8c8c81097fe59d9df356b3c3f1dd10f619bfabb54f5d187866092c67e0102c64dbe24f357df493cc7ebacdd2e55995db8912245b718d88ebf7f4f4ac01f04',
						});
					});
			});

			describe(`transaction:create 2 0 100000000 --asset=${transferAsset} --no-signature --json`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						`--asset=${transferAsset}`,
						'--no-signature',
						`--sender-publickey=${senderPublickey}`,
						'--json',
					])
					.it(
						'should return unsigned transaction in json format when no passphrase specified',
						() => {
							expect(printJSONStub).to.be.calledOnce;
							expect(printJSONStub).to.be.calledWithExactly({
								moduleID: 2,
								assetID: 0,
								nonce: '0',
								fee: '100000000',
								senderPublicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
								asset: {
									amount: '100',
									data: 'send token',
									recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
								},
								signatures: [],
							});
						},
					);
			});

			describe(`transaction:create 2 0 100000000 --asset=${transferAsset} --passphrase=${passphrase} --json`, () => {
				setupTest()
					.command([
						'transaction:create',
						'2',
						'0',
						'100000000',
						`--asset=${transferAsset}`,
						`--passphrase=${passphrase}`,
						'--json',
					])
					.it('should return signed transaction in json format when passphrase specified', () => {
						expect(printJSONStub).to.be.calledOnce;
						expect(printJSONStub).to.be.calledWithExactly({
							moduleID: 2,
							assetID: 0,
							nonce: '0',
							fee: '100000000',
							senderPublicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
							asset: {
								amount: '100',
								data: 'send token',
								recipientAddress: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
							},
							signatures: [
								'3cc8c8c81097fe59d9df356b3c3f1dd10f619bfabb54f5d187866092c67e0102c64dbe24f357df493cc7ebacdd2e55995db8912245b718d88ebf7f4f4ac01f04',
							],
						});
					});
			});
		});
	});
});
