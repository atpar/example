import Web3 from 'web3';
import { AP, APTypes } from '@atpar/protocol';

import ADDRESS_BOOK from '@atpar/protocol/ap-chain/addresses.json';
import SettlementTokenArtifact from '@atpar/protocol/build/contracts/contracts/tokens/SettlementToken.sol/SettlementToken.json';
import PAMTerms from './PAMTerms.json';
import { keys, rpcURL } from './secret.json';


(async () => {
    const web3 = new Web3(new Web3.providers.HttpProvider(rpcURL));

    // setup accounts
    keys.forEach((pk: string) => web3.eth.accounts.wallet.add(web3.eth.accounts.privateKeyToAccount(pk)));

    // set creator and counterparty accounts
    const creator = (web3.eth.accounts.wallet[0]).address; // lender with respect to the Terms
    const counterparty = (web3.eth.accounts.wallet[1]).address; // debtor with respect to the Terms
    const anyone = (web3.eth.accounts.wallet[2]).address // used to make calls that could be made by any address

    // Initialize AP with web3 object and addressBook
    const ap = await AP.init(web3, ADDRESS_BOOK);

    // Deploy Settlement Token
    // @ts-ignore
    const settlementToken = await (new web3.eth.Contract(SettlementTokenArtifact.abi)).deploy(
        { data: SettlementTokenArtifact.bytecode }
    ).send({ from: anyone, gas: 2000000 });

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

    // get asset terms
    console.log('Terms: ', ap.utils.conversion.parseWeb3Response<APTypes.UTerms>(
        await ap.contracts.pamRegistry.methods.getTerms(assetId).call())
    );

    // get asset state
    console.log('State: ', ap.utils.conversion.parseWeb3Response<APTypes.UState>(
        await ap.contracts.pamRegistry.methods.getState(assetId).call())
    );

    // get next scheduled event for the asset from the PAM Registry and decode it
    const nextScheduledEvent = await ap.contracts.pamRegistry.methods.getNextScheduledEvent(assetId).call();
    const decodedEvent = ap.utils.schedule.decodeEvent(nextScheduledEvent);
    // in our case that the IED (Initial Exchange event for transferring the principal from the lender to the creditor)
    console.log('Next scheduled event: ', decodedEvent);

    // approve actor to execute settlement payment (must be called before progressing the asset)
    // lender has to give allowance to the Actor to transfer the principal to the debtor
    await ap.contracts.erc20(terms.currency).methods.approve(
        ap.contracts.pamActor.options.address,
        terms.notionalPrincipal
    ).send({ from: creator, gas: 2000000 });
    
    // progress the asset - can be called by any account
    // processes the first event (IED)
    const progressTx = await ap.contracts.pamActor.methods.progress(assetId).send({ from: anyone, gas: 2000000 });
    console.log('Progressed Event: ', progressTx.events.ProgressedAsset.returnValues);

    // continue with getNextScheduledEvent for all subsequent events

    process.exit();
})();
