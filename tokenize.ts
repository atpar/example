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

    // set up example accounts
    keys.forEach((pk: string) => web3.eth.accounts.wallet.add(web3.eth.accounts.privateKeyToAccount(pk)));
    const primaryOwner = (web3.eth.accounts.wallet[0]).address
    const fractionalOwner = (web3.eth.accounts.wallet[1]).address
    const anyone = (web3.eth.accounts.wallet[2]).address // used to make calls that could be made by any address

    // Initialize AP with web3 object and addressBook
    const addressBook = ADDRESS_BOOK;
    const ap = await AP.init(web3, addressBook);

    // Get Initialization Params
    const assetId: string = process.argv[2] || ''; // paste assetId here
    if (!assetId) {
        console.log('Missing parameter AssetId.')
        process.exit()
    }

    // Use asset terms to get the settlement currency
    const rawTerms = await ap.contracts.pamRegistry.methods.getTerms(assetId).call();
    console.log(rawTerms.currency)
    const assetTerms = ap.utils.conversion.web3ResponseToPAMTerms(rawTerms);
    const fundsToken = assetTerms.currency
    const initialAmount = web3.utils.toWei('3')

    // Deploy Fund Distribution Token
    // @ts-ignore
    const fdt = await deployFundsDistributionToken(web3, {fundsToken, owner: primaryOwner, initialAmount})

    // Set FDT Contract as new beneficiary for asset
    await ap.contracts.pamRegistry.methods.setCreatorBeneficiary(assetId,fdt.options.address).send({from: primaryOwner, gas: 2000000});

    // Share Ownership
    await fdt.methods.mint(fractionalOwner, web3.utils.toWei('1')).send({from: primaryOwner, gas: 2000000})

    const ownerBal = await fdt.methods.balanceOf(primaryOwner).call()
    const fracBal = await fdt.methods.balanceOf(fractionalOwner).call()

    console.log('Primary Owner Balance: ' + ownerBal.toString());
    console.log('Fractional Owner Balalance: ' + fracBal.toString());

    // Mock a payment of the settlement token to the FDT address
    // @ts-ignore
    const settlementToken = new web3.eth.Contract(SettlementTokenArtifact.abi, fundsToken);
    await settlementToken.methods.drip(fdt.options.address, web3.utils.toWei('50')).send({from: primaryOwner, gas: 2000000});

    // const fdtBal = await settlementToken.methods.balanceOf(fdt.options.address).call()
    // console.log('fdtBal Bal: ' + fdtBal.toString());

    // Check withdrawable funds for fractional owner before calling updateFundsReceived
    const withdrawableFrac = await fdt.methods.withdrawableFundsOf(fractionalOwner).call()
    console.log('Withdrawable Balance of fractional owner (before calling updateFundsReceived): ' + withdrawableFrac.toString());


    // update internal balances in the FDT (can be called by any account)
    await fdt.methods.updateFundsReceived().send({from: anyone, gas: 2000000})

    // Check withdrawable funds for fractional owner after calling updateFundsReceived
    const withdrawableFrac2 = await fdt.methods.withdrawableFundsOf(fractionalOwner).call()
    console.log('Withdrawable Balance of fractional owner (after calling updateFundsReceived): ' + withdrawableFrac2.toString());


    process.exit(0);
})();
