const Web3 = require('web3')
var web3 = new Web3('http://localhost:8545');

const txArrary = [
    '0xf86929808307a12094627306090abab3a6e1400e9345bc60c78a8bef5789056bc75e2d63100000801ba08428d489980efe26f844095e8112a9130439f28f62380549b2f1e4bf11278eeaa059a2e752fdb37d1b2f4fb83a94fc02fa393d2aca159d4be3162c681c0455bd97',
    '0xf8692a808307a12094f17f52151ebef6c7334fad080c5704d77216b73289056bc75e2d63100000801ca0ef3830d8c5843b7cb159b9c2cd9f63b0460f5135296097d4f9248c1882f18c8da00322391e5b1bf215284559c82ef27392f16d04152b6803ebc3e2079c4d84ddf2',
    '0xf8692b808307a12094c5fdf4076b8f3a5357c5e395ab970b5b54098fef89056bc75e2d63100000801ca085adcb328a0352a98b344e5e207f9ff0e517591f5d1fd4feb13ff9aeedda4c3ca0637ab17c2dcaf0b7241fee6c17849f6fe2a562aa4ae6a24a7564fe3fcd39c4aa'
]

const main = async () => {
    console.log('Applying Pre-signed Transactions...')
    for (tx of txArrary) {
        await web3.eth.sendSignedTransaction(tx)
    }
    process.exit(0);
}

main();