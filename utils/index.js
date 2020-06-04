
const Web3 = require('web3')
const fs = require('fs')
const web3 = new Web3(new Web3.providers.WebsocketProvider('wss://goerli.infura.io/ws/v3/39749fc2a494412f80c769c6ce92878c'));
const Spinner = require('cli-spinner').Spinner;
const sigUtil = require('eth-sig-util')

const WALLET_FILENAME = "wallet.json"

const generateAccounts = (n, overwrite) => {
    if (fs.existsSync(WALLET_FILENAME) && !overwrite) {
        console.log(WALLET_FILENAME + " already exists")
        return
    }
    const wallet = web3.eth.accounts.wallet.create(n);
    let walletData = []
    for (let i = 0; i < n; i++) {
        const accountInfo = wallet[i];
        walletData.push(accountInfo)
    }
    fs.writeFileSync(WALLET_FILENAME, JSON.stringify({wallet: walletData}, 0, 2))
}

const getAccounts = () => {
    const accountData = JSON.parse(fs.readFileSync(WALLET_FILENAME, 'utf8'))
    return accountData.wallet
}

const getAccount = (index) => {
    const accounts = getAccounts()
    return web3.eth.accounts.wallet.add(accounts[index].privateKey);
}

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

const signTypedData = (account, data) => {
    const pk = Buffer.from(account.privateKey.substring(2), 'hex');
    console.log(pk)
    const sig = sigUtil.signTypedMessage(pk, { data }, 'V3');
    return sig
}


module.exports = {
    web3,
    generateAccounts,
    getAccounts,
    getAccount,
    spinLog,
    wrapSpinLog,
    signTypedData
}