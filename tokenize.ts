import Web3 from 'web3';
import BigNumber from 'bignumber.js';

import { AP } from '@atpar/protocol';
import ADDRESS_BOOK from '@atpar/protocol/ap-chain/addresses.json';

import PAMTerms from './PAMTerms.json';
import { keys, rpcURL } from './secret.json';

import VanillaFDTArtifact from '@atpar/protocol/build/contracts/contracts/tokens/FDT/VanillaFDT/VanillaFDT.sol/VanillaFDT.json';
import SettlementTokenArtifact from '@atpar/protocol/build/contracts/contracts/tokens/SettlementToken.sol/SettlementToken.json';

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
    
    const creator = (web3.eth.accounts.wallet[0]).address; // creator of the asset (lender in our case)
    const counterparty = (web3.eth.accounts.wallet[1]).address; // creator of the asset (lender in our case)
    const anyone = (web3.eth.accounts.wallet[2]).address; // used to make calls that could be made by any address
    const holder = (web3.eth.accounts.wallet[3]).address; // future holder of FDTs

    // initialize AP with web3 object and addressBook
    const ap = await AP.init(web3, ADDRESS_BOOK);

    // Deploy Settlement Token
    // @ts-ignore
    const settlementToken = await (new web3.eth.Contract(SettlementTokenArtifact.abi)).deploy(
        { data: SettlementTokenArtifact.bytecode }
    ).send({ from: creator, gas: 2000000 });


    // create the term sheet by setting the currency to the Settlement Token contract we just deployed
    const terms = { ...PAMTerms, currency: settlementToken.options.address };

    // set up ownership
    const ownership = {
        creatorObligor: creator, // account which has to fulfill the lenders obligations (such as the initial exchange)
        creatorBeneficiary: creator, // account which receives positive cashflows for the lender (such as interest payments)
        counterpartyObligor: counterparty, // account which has to fulfill the debtors obligations (such as paying interest)
        counterpartyBeneficiary: counterparty, //account which receives positive cashflows for the debtor (such as the principal)
    };

    // create new PAM asset
    const initializeAssetTx = await ap.contracts.pamActor.methods.initialize(
        terms, 
        [], // optionally pass custom schedule, 
        ownership, 
        ap.contracts.pamEngine.options.address, 
        ap.utils.constants.ZERO_ADDRESS,
        ap.utils.constants.ZERO_ADDRESS
    ).send({ from: creator, gas: 2000000 });

    // retrieve the AssetId from the transaction event logs
    const assetId = initializeAssetTx.events.InitializedAsset.returnValues.assetId;
    console.log('AssetId: ' + assetId);

    // approve actor to execute settlement payment (must be called before progressing the asset)
    // lender has to give allowance to the Actor to transfer the principal to the debtor
    await ap.contracts.erc20(terms.currency).methods.approve(
        ap.contracts.pamActor.options.address,
        terms.notionalPrincipal
    ).send({ from: creator, gas: 2000000 });

    // progress the asset - can be called by any account
    // processes the first event (IED)
    await ap.contracts.pamActor.methods.progress(assetId).send({ from: anyone, gas: 2000000 });
    
    // deploy a new Funds Distribution Token
    const fdt = await deployFundsDistributionToken(
        web3,
        // @ts-ignore
        {
            fundsToken: terms.currency,
            owner: creator,
            initialAmount: web3.utils.toWei('100')
        }
    );

    // creator sells 50% of his FDTs to a third party
    await fdt.methods.transfer(
        holder,
        new BigNumber(await fdt.methods.balanceOf(creator).call()).dividedBy(2).toString()
    ).send({ from: creator, gas: 1000000 });

    // set FDT contract as new beneficiary for asset
    // in our case the FDT will receive and distribute all future interest payments
    await ap.contracts.pamRegistry.methods.setCreatorBeneficiary(
        assetId,
        fdt.options.address
    ).send({ from: creator, gas: 2000000 });

    // approve actor to execute settlement payment
    // debtor has to give allowance to the Actor to transfer the first interest payment
    await settlementToken.methods.approve(
        ap.contracts.pamActor.options.address,
        '25479452054794518000'
    ).send({ from: counterparty, gas: 2000000 });

    // process the first interest payment (zero - because nothing has accrued since initial exchange)
    await ap.contracts.pamActor.methods.progress(assetId).send({ from: anyone, gas: 2000000 });
    // process the second interest payment (non zero)
    await ap.contracts.pamActor.methods.progress(assetId).send({ from: anyone, gas: 2000000 });

    // update internal balances in the FDT (can be called by any account)
    await fdt.methods.updateFundsReceived().send({ from: anyone, gas: 2000000 })

    // check withdrawable funds for fractional owner after calling updateFundsReceived
    const withdrawableAmount = await fdt.methods.withdrawableFundsOf(holder).call()
    // Holder received 50% of the first interst payment
    console.log('Withdrawable Balance of Holder: ' + withdrawableAmount.toString());
})();
