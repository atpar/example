const { AP } = require('@atpar/protocol');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3')
const { mnemonic, rpcURL } = require('./secret.json');
// const { VanillaFDT } = require('@atpar/ap-contracts/ts-bindings/VanillaFDT.d.ts');
let provider = new HDWalletProvider(mnemonic, rpcURL);
const web3 = new Web3(provider);
const { getSettlementToken } = require('./utils')

const VanillaFDTArtifact = require('@atpar/protocol/build/contracts/VanillaFDT.json');


const main = async () => {

    // Initialize AP with web3 object and addressBook
    const addressBook = require('@atpar/protocol/ap-chain/addresses.json'); // address book
    const ap = await AP.init(web3, addressBook);

    const primaryOwner = (await web3.eth.getAccounts())[0]
    const fractionalOwner = (await web3.eth.getAccounts())[1]
    const anyone = (await web3.eth.getAccounts())[2] // used to make calls that could be made by any address


    // Get Initialization Params
    const assetId = ''; // paste assetId here
    if (!assetId) {
        console.log('assetId is not set')
        process.exit()
    }

    const rawTerms = await ap.contracts.pamRegistry.methods.getTerms(assetId).call();
    console.log(rawTerms.currency)
    const assetTerms = ap.utils.conversion.web3ResponseToPAMTerms(rawTerms);
    const fundsToken = assetTerms.currency
    const initialAmount = web3.utils.toWei('3')

    console.log(initialAmount)
    // Deploy FDT
    const fdt = await deployFundsDistributionToken({fundsToken, owner: primaryOwner, initialAmount})

    // Set FDT Contract as new beneficiary for asset
    await ap.contracts.pamRegistry.methods.setCreatorBeneficiary(assetId,fdt.options.address).send({from: primaryOwner});

    // Share Ownership
    await fdt.methods.mint(fractionalOwner, web3.utils.toWei('1')).send({from: primaryOwner})

    const ownerBal = await fdt.methods.balanceOf(primaryOwner).call()
    const fracBal = await fdt.methods.balanceOf(fractionalOwner).call()

    console.log('Owner Bal: ' + ownerBal.toString());
    console.log('Frac Bal: ' + fracBal.toString());

    // Mock a payment
    const settlementToken = await getSettlementToken(fundsToken);
    await settlementToken.methods.drip(fdt.options.address, web3.utils.toWei('50')).send({from: primaryOwner});

    const fdtBal = await settlementToken.methods.balanceOf(fdt.options.address).call()
    console.log('fdtBal Bal: ' + fdtBal.toString());

    const withdrawableFrac = await fdt.methods.withdrawableFundsOf(fractionalOwner).call()
    console.log('withdrawableFrac Bal: ' + withdrawableFrac.toString());


    await fdt.methods.updateFundsReceived().send({from: anyone})


    const withdrawableFrac2 = await fdt.methods.withdrawableFundsOf(fractionalOwner).call()
    console.log('withdrawableFrac Bal: ' + withdrawableFrac2.toString());


    process.exit(0);
}

const deployFundsDistributionToken = async ({
    name = 'FundsDistributionToken',
    symbol = 'FDT',
    fundsToken,
    owner,
    initialAmount = 0,
}) => {

    const fdtContract = new web3.eth.Contract(VanillaFDTArtifact.abi);

    const args = [name, symbol, fundsToken, owner, initialAmount]
    const fdt = await fdtContract.deploy({ data: VanillaFDTArtifact.bytecode, arguments: args }).send({ from: owner });

    return fdt;
    
}


main();