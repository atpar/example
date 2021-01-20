const Web3 = require('web3')
var web3 = new Web3('http://localhost:8545');

const txArrary = [
    '0xf86926808307a12094627306090abab3a6e1400e9345bc60c78a8bef5789056bc75e2d63100000801ca0f041d4e92d8d8314da6b4d31e83655835d974566da7a26459e7a103fe1fdf536a018dd7d7aed954af3034739386dac6d4d8bb103dc3123a7d3a2b9a46b69a57a97',
    '0xf86927808307a12094f17f52151ebef6c7334fad080c5704d77216b73289056bc75e2d63100000801ca0cd25b67330c980cbc5673fd7d80fcee43108c5537dd8607c3059d31cc2731671a055e4c9dfb29db0d8adbbeee19215c8187ead1d30c95489e2e14d9c219a78e316',
    '0xf86928808307a12094c5fdf4076b8f3a5357c5e395ab970b5b54098fef89056bc75e2d63100000801ca05aa7ad1f03f1552dab4907f7174b2ee1b1d7b72010513e7d8fade61c58ddc704a05afaba0dee4156e0177325c5fb9ca80e5f957950cb09d81a086c38a7883cc8c5'
]

const main = async () => {
    console.log('Applying Pre-signed Transactions...')
    for (tx of txArrary) {
        await web3.eth.sendSignedTransaction(tx)
        // console.log(await web3.eth.getBalance('0x627306090abaB3A6e1400e9345bC60c78a8BEf57'))
    }
    process.exit(0);
}

main();