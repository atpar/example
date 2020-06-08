const { AP, Template, Order, Utils, Asset } = require('@atpar/ap.js');
const sigUtil = require('eth-sig-util')

const { web3,
    spinLog,
    deriveBufferPKFromHDWallet,
    sleep } = require('./utils');

const TEMPLATE_TERMS = require('./utils/templateTerms.json');
const SettlementToken = require('./utils/SettlementToken.min.json');

let creator
let counterparty

// Main Entry Point
const main = async () => {

    //set creator and counterparty
    creator = (await web3.eth.getAccounts())[0]
    counterparty = (await web3.eth.getAccounts())[1]

    console.log(creator)

    // Initialize creator and counterparty ap.js classes
    const creatorAP = await AP.init(web3, creator);
    const counterpartyAP = await AP.init(web3, counterparty);

    // Deploy settlement token
    const settlementToken = await createSettlementToken(creator)
    const settlementTokenAddress = settlementToken.options.address

    // // Create new template
    const template = await createTemplate(creatorAP, settlementTokenAddress);

    //Get Template from ID
    // const template = await getTemplate(creatorAP, "0x267c9dd1ad2d4cfc3da6cdf1aa8c5e17e800d35422d8e199ebdfe5858441ff2d");
    
    // Create a new Order from Template
    const order = await createAndSignOrder(creatorAP, template)

    // Sign order as counterparty
    const orderSigned = await signOrderAsCounterparty(counterpartyAP, order)
    const orderData = orderSigned.serializeOrder()

    // Load order from the orderData to verify signatures
    const verifiedOrder = await Order.load(creatorAP, orderData)
    console.log("Order has been signed and verified")

    // Issue asset from order
    // would be nice if this returned either a tx hash or an Asset object
    let sLog = spinLog("Sending Asset Issuance Transaction")
    await verifiedOrder.issueAssetFromOrder()
    sLog.stop(true)

    // ensure that all data is read so wait for tx to propogate
    await sleep(1500)

    let assetIdList = await creatorAP.getAssetIds()
    let assetId = assetIdList.pop()
    console.log("New Asset Created: " + assetId)

    let asset = await Asset.load(creatorAP, assetId)


    // Service Asset
    const schedule = await asset.getSchedule();
    let eventDecoded = Utils.schedule.decodeEvent(schedule[0])

    // console.log(eventDecoded)
    // const { amount, token, payer } = await asset.getNextScheduledPayment();
    // const assetActorAddress = await asset.getActorAddress();

    const sLog1 = spinLog("Approving AssetActor contract")
    await asset.approveNextScheduledPayment();
    sLog1.stop(true)

    // hacky prevent web3 from sending tx with same nonce
    await sleep(500)

    const timeNow = Math.floor(Date.now() / 1000)

    if (timeNow < eventDecoded.scheduleTime) {
        console.log("Asset can not be progressed until after scheduled date: " + eventDecoded.scheduleTime)
    } else {
        const sLog2 = spinLog("Progressing Asset")
        const tx2 = await asset.progress();
        sLog2.stop(true)
        console.log("Asset has been serviced: " + tx2.transactionHash)
    }

    process.exit(0)
}

const createSettlementToken = async (account) => {
    let sLog = spinLog("Creating ERC20 Settlement Token Contract ")
    let sampleToken = new web3.eth.Contract(SettlementToken.abi);
    let token = await sampleToken.deploy({ data: SettlementToken.bytecode }).send({ from: account, gas: 2000000 });
    sLog.stop(true)
    console.log("Token Created: " + token.options.address)
    return token
}

const createTemplate = async (ap, tokenAddress) => {

    let extendedTerms = Utils.conversion.deriveExtendedTemplateTermsFromTerms(TEMPLATE_TERMS)
    extendedTerms.currency = tokenAddress
    extendedTerms.settlementCurrency = tokenAddress

    let sLog = spinLog("Sending Transaction to create new Template")
    const template = await Template.create(ap, extendedTerms);
    sLog.stop(true)
    console.log("New Template Created: " + template.templateId)

    return template
}

const getTemplate = async (ap, registeredTemplateId) => {

    const template = await Template.load(ap, registeredTemplateId);
    // console.log(template)

    const storedTemplateTerms = await template.getTemplateTerms();
    console.log(storedTemplateTerms)

    const schedule = await template.getTemplateSchedule()
    // console.log(schedule)

    return template
}

const createAndSignOrder = async (ap, template) => {
    const dateNow = Math.floor(Date.now() / 1000)

    const templateTerms = await template.getTemplateTerms();

    let updatedTerms = Object.assign({}, TEMPLATE_TERMS)

    updatedTerms.notionalPrincipal = web3.utils.toWei("1000")
    updatedTerms.nominalInterestRate = web3.utils.toWei("0.5")
    updatedTerms.contractDealDate = `${dateNow}`
    // Need to add these from extended terms so they dont get overwritten with 0x0 value address
    updatedTerms.currency = templateTerms.currency
    updatedTerms.settlementCurrency = templateTerms.settlementCurrency


    // overlay customized terms over template defaults
    const customTerms = Utils.conversion.deriveCustomTermsFromTermsAndTemplateTerms(updatedTerms, templateTerms);

    let orderParams = {
        termsHash: ap.utils.erc712.getTermsHash(updatedTerms),
        templateId: template.templateId,
        customTerms,
        ownership: {
            creatorObligor: creator,
            creatorBeneficiary: creator,
            counterpartyObligor: counterparty,
            counterpartyBeneficiary: counterparty
        },
        expirationDate: String(updatedTerms.contractDealDate),
        engine: ap.contracts.pamEngine.options.address,
        admin: Utils.constants.ZERO_ADDRESS
    }

    const order = Order.create(ap, orderParams);

    console.log("Order created!")

    const typedDataOrder = Utils.erc712.getOrderDataAsTypedData(order.orderData, false, ap.signer.verifyingContractAddress)

    const privateKeyBuffer = deriveBufferPKFromHDWallet(web3.eth.accounts.wallet, creator)
    const sig = sigUtil.signTypedMessage(privateKeyBuffer, { data: typedDataOrder }, 'V3');
    order.orderData.creatorSignature = sig
 
    console.log("order signed")
    return order
}

const signOrderAsCounterparty = async (counterPartyAP, order) => {
    let orderData = order.serializeOrder();
    let typedDataOrder = Utils.erc712.getOrderDataAsTypedData(orderData, true, counterPartyAP.signer.verifyingContractAddress)
    const privateKeyBuffer = deriveBufferPKFromHDWallet(web3.eth.accounts.wallet, counterparty)
    const sig = sigUtil.signTypedMessage(privateKeyBuffer, { data: typedDataOrder }, 'V3');
    order.orderData.counterpartySignature = sig
    return order
}



main();