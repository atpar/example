const { AP, Template, Utils } = require('@atpar/ap.js');
const { web3, generateAccounts, getAccount, spinLog, wrapSpinLog } = require('./utils');

const TERMS = require('./terms.json');
const SettlementToken = require('./SettlementToken.min.json');

// Main Entry Point
const main = async () => {

    // Initialize Accounts
    generateAccounts()
    const creator = getAccount(0).address
    // const counterparty = getAccount(1).address

    //Initialize creator ap.js
    const ap = await AP.init(web3, creator);

    // Deploy settlement token
    // const token = await createSettlementToken(creator)
    const tokenAddress = "0x9e98Bfbb7016B567b18059f4A2A42177557dF2a9" //token.options.address

    // Create new template
    const template = await createTemplate(ap, tokenAddress);

    //Get Template from ID
    // const template = await getTemplate(ap, "0x337db45885d43c4777a3a22e4df43f4b9089c823acb7321fdc50401a2a157799");

    process.exit(0)
}

const createSettlementToken = async (account) => {
    let sLog = spinLog("Creating ERC20 Settlement Token Contract ")
    let sampleToken = new web3.eth.Contract(SettlementToken.abi);
    let token = await sampleToken.deploy({ data: SettlementToken.bytecode }).send({ from: account, gas: 2000000 });
    sLog.stop(true)
    console.log("Token Created!")
    console.log(token.options.address)
    return token
}

const createTemplate = async (ap, tokenAddress) => {

    let extendedTerms = Utils.conversion.deriveExtendedTemplateTermsFromTerms(TERMS)
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
    // console.log(storedTemplateTerms)

    const schedule = await  template.getTemplateSchedule()
    // console.log(schedule)

    return template
}

main();