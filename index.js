const { AP } = require('@atpar/protocol');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3')
const {mnemonic, rpcURL} = require('./secret.json')
let provider = new HDWalletProvider(mnemonic, rpcURL);
const web3 = new Web3(provider);

const { deploySettlementToken } = require('./utils')

// Main Entry Point
const main = async () => {

    //set creator and counterparty
    const creator = (await web3.eth.getAccounts())[0]
    const counterparty = (await web3.eth.getAccounts())[1]
    const anyone = (await web3.eth.getAccounts())[2] // used to make calls that could be made by any address

    // Initialize AP with web3 object and addressBook
    const addressBook = require('@atpar/protocol/ap-chain/addresses.json'); // address book
    const ap = await AP.init(web3, addressBook);

    // Deploy Settlement Token
    const settlementToken = await deploySettlementToken(web3);

    //create terms
    const PAMTerms = require('./PAMTerms.json');
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

    const admin = creator

    // Create new PAM asset
    const initializeAssetTx = await ap.contracts.pamActor.methods.initialize(
        terms, 
        schedule, 
        ownership, 
        ap.contracts.pamEngine.options.address, 
        ap.utils.constants.ZERO_ADDRESS 
    ).send({from: creator})

    // Get AssetID
    const assetId = initializeAssetTx.events.InitializedAsset.returnValues.assetId;
    console.log('Asset created with ID: ' + assetId);


    // Get asset terms
    const assetTerms = await ap.contracts.pamRegistry.methods.getTerms(assetId).call();
    const readableTerms = ap.utils.conversion.web3ResponseToPAMTerms(assetTerms);
    // console.log(readableTerms);

    // Get asset state
    const assetState = await ap.contracts.pamRegistry.methods.getState(assetId).call();
    const readableState = ap.utils.conversion.web3ResponseToState(assetState);
    // console.log(readableState);

    // Get next scheduled event
    const nextScheduledEvent = await ap.contracts.pamRegistry.methods.getNextScheduledEvent(assetId).call();
    const decodedEvent = ap.utils.schedule.decodeEvent(nextScheduledEvent);
    // console.log(decodedEvent)


    // approve actor to execute settlement payment 
    const amount = readableTerms.notionalPrincipal
    const currency = readableTerms.currency
    await ap.contracts.erc20(currency).methods.approve(ap.contracts.pamActor.options.address, amount)
    

    // Progress the asset
    const progressTx = await ap.contracts.pamActor.methods.progress(assetId).send({from: anyone});
    // console.log(progressTx.events)


    process.exit(0);
}

main();