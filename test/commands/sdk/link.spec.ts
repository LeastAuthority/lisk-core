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
import { join } from 'path';

describe('sdk:link command', () => {
	const setupTest = () =>
		test
			.stub(fs, 'removeSync', sandbox.stub().returns(null))
			.stub(fs, 'symlinkSync', sandbox.stub().returns(null))
			.stdout();

	describe('sdk:link', () => {
		test
			.stdout()
			.command(['sdk:link'])
			.catch(error => {
				return expect(error.message).to.contain(
					'Missing 1 required arg:\ntargetSDKFolder  The path to the lisk SDK folder\nSee more help with --help',
				);
			})
			.it('should throw an error when target folder is missing');
	});

	describe('sdk:link /path/does/not/exist', () => {
		setupTest()
			.stub(fs, 'pathExistsSync', sandbox.stub().withArgs('/path/does/not/exist').returns(false))
			.command(['sdk:link', '/path/does/not/exist'])
			.catch(error => {
				return expect(error.message).to.contain(
					"Path '/path/does/not/exist' does not exist or no access allowed",
				);
			})
			.it('should throw an error when the target folder does not exist');
	});

	describe('sdk:link /path/exists', () => {
		const fakeSDKPath = '/path/exists';
		const targetSDKPath = join(__dirname, '../../../', 'node_modules', 'lisk-sdk');

		setupTest()
			.stub(fs, 'pathExistsSync', sandbox.stub().withArgs('/path/exists').returns(true))
			.command(['sdk:link', fakeSDKPath])
			.it('should call file system functions with correct parameters', out => {
				expect(fs.pathExistsSync).to.be.calledWith(fakeSDKPath);
				expect(fs.removeSync).calledWith(targetSDKPath);
				expect(fs.symlinkSync).calledWith(fakeSDKPath, targetSDKPath);
				expect(out.stdout).to.contain(`Linked '/path/exists' to '${targetSDKPath}'`);
			});
	});
});
