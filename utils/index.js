
const fs = require('fs')
const Spinner = require('cli-spinner').Spinner;
const sigUtil = require('eth-sig-util')
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require('web3')
const {mnemonic, rpcURL} = require("../secret.json")
let provider = new HDWalletProvider(mnemonic, rpcURL);

const web3 = new Web3(provider);

const SettlementTokenArtifact = require('@atpar/ap-contracts/artifacts/SettlementToken.min.json');

//TODO implement this without dependency
const spinLog = (msg) => {
    var spinner = new Spinner(msg + ' %s');
    spinner.setSpinnerString('|/-\\');
    spinner.start();
    return spinner
}
const wrapSpinLog = async (msg, pf) => {
    var spinner = new Spinner(msg + ' %s');
    spinner.setSpinnerString('|/-\\');
    spinner.start();
    let r = await pf
    spinner.stop();
    return r
}

const deriveBufferPKFromHDWallet = (web3HDWallet, address) => {
    if (web3HDWallet._accounts && web3HDWallet._accounts._provider && web3HDWallet._accounts._provider.wallets) {
        return web3HDWallet._accounts._provider.wallets[address.toLowerCase()]._privKey
    }
    return null
}

const signTypedData = (account, data) => {
    const pk = Buffer.from(account.privateKey.substring(2), 'hex');
    const sig = sigUtil.signTypedMessage(pk, { data }, 'V3');
    return sig
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const deploySettlementToken =  async (web3) => {
    const account = (await web3.eth.getAccounts())[0];
  
    let sampleToken = new web3.eth.Contract(SettlementTokenArtifact.abi);
    sampleToken = await sampleToken.deploy({ data: SettlementTokenArtifact.bytecode }).send({ from: account, gas: 2000000 });
  
    return sampleToken;
  }
  

module.exports = {
    web3,
    spinLog,
    wrapSpinLog,
    signTypedData,
    deriveBufferPKFromHDWallet,
    sleep,
    deploySettlementToken
}