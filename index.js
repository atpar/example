const { AP, Template, Order, Utils, Asset } = require('@atpar/ap.js');
const { web3, generateAccounts, getAccount, spinLog, signTypedData } = require('./utils');

const TERMS = require('./utils/terms.json');
const TEMPLATE_TERMS = require('./utils/terms.json');
const SettlementToken = require('./utils/SettlementToken.min.json');

const creatorAccount = getAccount(0)
const creator = creatorAccount.address
const counterpartyAccount = getAccount(1)
const counterparty = counterpartyAccount.address

// Main Entry Point
const main = async () => {

    // Initialize creator ap.js
    const creatorAP = await AP.init(web3, creator);
    const counterpartyAP = await AP.init(web3, counterparty);
    // Deploy settlement token
    const token = await createSettlementToken(creator)
    const tokenAddress = token.options.address

    // Create new template
    const template = await createTemplate(creatorAP, tokenAddress);

    //Get Template from ID
    // const template = await getTemplate(creatorAP, "0x337db45885d43c4777a3a22e4df43f4b9089c823acb7321fdc50401a2a157799");

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
    await verifiedOrder.issueAssetFromOrder();
    sLog.stop(true)

    let assetIdList = await creatorAP.getAssetIds()
    console.log(assetIdList)

    let assetId = assetIdList.pop()
    console.log(assetId)

    let asset = await Asset.load(creatorAP, assetId)
    let schedule = await asset.getSchedule()
    console.log(schedule)
    let nextEvent = await asset.getNextScheduledEvent()
    console.log(nextEvent)
    let decodedEvent = Utils.schedule.decodeEvent(nextEvent)
    console.log(decodedEvent)

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

    // unnecessary?
    // const template = await wrapSpinLog("Sending Transaction to create new Template", Template.create(ap, extendedTerms))

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

    const dateNow = Math.round((new Date()).getTime() / 1000)

    const templateTerms = template.getTemplateTerms();

    let termsToUpdate = {
        notionalPrincipal: '44000000000000000000000',
        nominalInterestRate: '3500000000000000000',
        contractDealDate: `${dateNow}`,
    }

    // overlay customized terms over template defaults
    const customTerms = Utils.conversion.deriveCustomTermsFromTermsAndTemplateTerms(termsToUpdate, templateTerms);

    console.log(customTerms)

    let orderParams = {
        termsHash: ap.utils.erc712.getTermsHash(TERMS),
        templateId: template.templateId,
        customTerms: ap.utils.conversion.deriveCustomTerms(TERMS),
        ownership: {
            creatorObligor: creator,
            creatorBeneficiary: creator,
            counterpartyObligor: counterparty,
            counterpartyBeneficiary: counterparty
        },
        expirationDate: String(TERMS.contractDealDate),
        engine: ap.contracts.pamEngine.options.address,
        admin: Utils.constants.ZERO_ADDRESS
    }

    const order = Order.create(ap, orderParams);

    console.log("Order created!")

    const typedDataOrder = Utils.erc712.getOrderDataAsTypedData(order.orderData, false, ap.signer.verifyingContractAddress)

    // await order.signOrder();
    const sig = signTypedData(creatorAccount, typedDataOrder)
    order.orderData.creatorSignature = sig

    return order
}

const signOrderAsCounterparty = async (counterPartyAP, order) => {
    let orderData = order.serializeOrder();
    let typedDataOrder = Utils.erc712.getOrderDataAsTypedData(orderData, true, counterPartyAP.signer.verifyingContractAddress)
    console.log(typedDataOrder)
    let sig = signTypedData(counterpartyAccount, typedDataOrder)
    order.orderData.counterpartySignature = sig
    return order
}



main();