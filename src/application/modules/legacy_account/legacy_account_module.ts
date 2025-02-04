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
 */

import { AfterGenesisBlockApplyContext, BaseModule, codec } from 'lisk-sdk';
import { CHAIN_STATE_UNREGISTERED_ADDRESSES } from './constants';
import { unregisteredAddressesSchema } from './schema';
import { ReclaimAsset } from './transaction_assets/reclaim_asset';

export class LegacyAccountModule extends BaseModule {
	public name = 'legacyAccount';
	public id = 1000;
	public transactionAssets = [new ReclaimAsset()];

	// eslint-disable-next-line class-methods-use-this
	public async afterGenesisBlockApply({
		genesisBlock,
		reducerHandler,
		stateStore,
	}: AfterGenesisBlockApplyContext): Promise<void> {
		const { accounts } = genesisBlock.header.asset;
		// New address is 20-byte value specified in LIP 0018 if the account has a registered public key.
		// Otherwise, it is the 8-byte value of the legacy address.
		const unregisteredAddresses = accounts.filter(account => account.address.length !== 20);
		const unregisteredAddressesWithBalance = await Promise.all(
			unregisteredAddresses.map(async ({ address }) => {
				const balance = await reducerHandler.invoke<bigint>('token:getBalance', { address });
				return { address, balance };
			}),
		);
		const encodedUnregisteredAddresses = codec.encode(unregisteredAddressesSchema, {
			unregisteredAddresses: unregisteredAddressesWithBalance,
		});
		// Delete legacy account from account state
		for (const { address } of unregisteredAddresses) {
			await stateStore.account.del(address);
		}
		stateStore.chain.set(CHAIN_STATE_UNREGISTERED_ADDRESSES, encodedUnregisteredAddresses);
	}
}
