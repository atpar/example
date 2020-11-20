import Web3 from 'web3';

import { AP } from '@atpar/protocol';
import ADDRESS_BOOK from '@atpar/protocol/ap-chain/addresses.json';
import SettlementTokenArtifact from '@atpar/protocol/build/contracts/contracts/SettlementToken.sol/SettlementToken.json';

import { keys, rpcURL } from './secret.json';
import PAMTerms from './utils/PAMTerms.json';


const deploySettlementToken =  async (web3: Web3, account: string) => {
    // @ts-ignore
    let sampleToken = new web3.eth.Contract(SettlementTokenArtifact.abi);
    sampleToken = await sampleToken.deploy({ data: SettlementTokenArtifact.bytecode }).send({ from: account, gas: 2000000 });
  
    return sampleToken;
}

(async () => {
    const web3 = new Web3(new Web3.providers.HttpProvider(rpcURL));

    keys.forEach((pk: string) => web3.eth.accounts.wallet.add(web3.eth.accounts.privateKeyToAccount(pk)));

    //set creator and counterparty
    const creator = (web3.eth.accounts.wallet[0]).address
    const counterparty = (web3.eth.accounts.wallet[1]).address 
    const anyone = (web3.eth.accounts.wallet[2]).address // used to make calls that could be made by any address

    // Initialize AP with web3 object and addressBook
    const addressBook = ADDRESS_BOOK;
    const ap = await AP.init(web3, addressBook);

    // Deploy Settlement Token
    const settlementToken = await deploySettlementToken(web3, creator);

    //create terms
    const terms = {
        ...PAMTerms,
        currency: settlementToken.options.address
    }
    
    // set up ownership
    const ownership = {
        creatorObligor: creator,
        creatorBeneficiary: creator,
        counterpartyObligor: counterparty,
        counterpartyBeneficiary: counterparty,
    }

    // compute schedule
    const schedule = await ap.utils.schedule.computeScheduleFromTerms(ap.contracts.pamEngine, terms);
    console.log(schedule)

    // Create new PAM asset
    const initializeAssetTx = await ap.contracts.pamActor.methods.initialize(
        terms, 
        schedule, 
        ownership, 
        ap.contracts.pamEngine.options.address, 
        ap.utils.constants.ZERO_ADDRESS 
    ).send({from: creator, gas: 2000000})

    // Get AssetID
    const assetId = initializeAssetTx.events.InitializedAsset.returnValues.assetId;
    console.log('Asset created with ID: ' + assetId);


    // Get asset terms
    const assetTerms = await ap.contracts.pamRegistry.methods.getTerms(assetId).call();
    const readableTerms = ap.utils.conversion.web3ResponseToPAMTerms(assetTerms);
    console.log('Asset terms: ', readableTerms);

    // Get asset state
    const assetState = await ap.contracts.pamRegistry.methods.getState(assetId).call();
    const readableState = ap.utils.conversion.web3ResponseToState(assetState);
    console.log('Asset state: ', readableState);

    // Get next scheduled event
    const nextScheduledEvent = await ap.contracts.pamRegistry.methods.getNextScheduledEvent(assetId).call();
    const decodedEvent = ap.utils.schedule.decodeEvent(nextScheduledEvent);
    console.log('Next scheduled event: ', decodedEvent)

    // approve actor to execute settlement payment 
    const amount = readableTerms.notionalPrincipal
    const currency = readableTerms.currency
    await ap.contracts.erc20(currency).methods.approve(ap.contracts.pamActor.options.address, amount)
    
    // Progress the asset
    const progressTx = await ap.contracts.pamActor.methods.progress(assetId).send({from: anyone, gas: 2000000});
    console.log('Progress events: ', progressTx.events)

    console.log('\nDONE.')
    process.exit()
})();
