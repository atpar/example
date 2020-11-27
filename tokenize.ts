import Web3 from 'web3';

import { AP } from '@atpar/protocol';
import ADDRESS_BOOK from '@atpar/protocol/ap-chain/addresses.json';

import { keys, rpcURL } from './secret.json';

import VanillaFDTArtifact from '@atpar/protocol/build/contracts/contracts/Extensions/FDT/VanillaFDT/VanillaFDT.sol/VanillaFDT.json';
import SettlementTokenArtifact from '@atpar/protocol/build/contracts/contracts/SettlementToken.sol/SettlementToken.json';

const deployFundsDistributionToken = async (web3: Web3, {
    name = 'FundsDistributionToken',
    symbol = 'FDT',
    fundsToken,
    owner,
    initialAmount = 0,
} : 
{
    name: string | undefined,
    symbol: string | undefined,
    fundsToken: string | undefined,
    owner: string,
    initialAmount: string | number | undefined,
}) => {
    // @ts-ignore
    const fdtContract = new web3.eth.Contract(VanillaFDTArtifact.abi);
    const args = [name, symbol, fundsToken, owner, initialAmount]
    const fdt = await fdtContract.deploy({ data: VanillaFDTArtifact.bytecode, arguments: args }).send({ from: owner, gas: 2000000 });
    return fdt;
}

(async () => {
    const web3 = new Web3(new Web3.providers.HttpProvider(rpcURL));

    // setup accounts
    keys.forEach((pk: string) => web3.eth.accounts.wallet.add(web3.eth.accounts.privateKeyToAccount(pk)));
    
    const primaryOwner = (web3.eth.accounts.wallet[0]).address
    const fractionalOwner = (web3.eth.accounts.wallet[1]).address
    const anyone = (web3.eth.accounts.wallet[2]).address // used to make calls that could be made by any address

    // initialize AP with web3 object and addressBook
    const ap = await AP.init(web3, ADDRESS_BOOK);

    // get Initialization Params
    const assetId: string = process.argv[2] || ''; // paste assetId here
    if (!assetId) {
        console.log('Missing parameter AssetId.')
        process.exit()
    }

    // use asset terms to get the settlement currency
    const terms = ap.utils.conversion.web3ResponseToPAMTerms(
        await ap.contracts.pamRegistry.methods.getTerms(assetId).call()
    );
    
    // deploy Fund Distribution Token
    const fdt = await deployFundsDistributionToken(
        web3,
        // @ts-ignore
        {
            fundsToken: terms.currency,
            owner: primaryOwner,
            initialAmount: web3.utils.toWei('100')
        }
    );

    // set FDT contract as new beneficiary for asset
    await ap.contracts.pamRegistry.methods.setCreatorBeneficiary(
        assetId,
        fdt.options.address
    ).send({from: primaryOwner, gas: 2000000});

    // mint FDTs
    await fdt.methods.mint(
        fractionalOwner,
        web3.utils.toWei('1')
    ).send({from: primaryOwner, gas: 2000000});

    console.log('Primary Owner Balance: ' + await fdt.methods.balanceOf(primaryOwner).call());
    console.log('Fractional Owner Balalance: ' + await fdt.methods.balanceOf(fractionalOwner).call());

    // simulate a payment of the settlement token to the FDT address
    // in practice the FDT would be set as one of the beneficiaries
    // @ts-ignore
    const settlementToken = new web3.eth.Contract(SettlementTokenArtifact.abi, terms.currency);
    await settlementToken.methods.drip(fdt.options.address, web3.utils.toWei('50')).send({from: primaryOwner, gas: 2000000});

    // update internal balances in the FDT (can be called by any account)
    await fdt.methods.updateFundsReceived().send({from: anyone, gas: 2000000})

    // check withdrawable funds for fractional owner after calling updateFundsReceived
    const withdrawableAmount = await fdt.methods.withdrawableFundsOf(fractionalOwner).call()
    console.log('Withdrawable Balance of fractional owner (after calling updateFundsReceived): ' + withdrawableAmount.toString());
})();
