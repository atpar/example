const Web3 = require('web3')
var web3 = new Web3('http://localhost:8545');

const txArrary = [
    '0xf86927808307a12094627306090abab3a6e1400e9345bc60c78a8bef5789056bc75e2d63100000801ba05c433c4dff0af55ea991dd5c2e084ae464009613924fcc168593548cd5a14e75a07181c7341a1dec32c38680b9523c2ef6764bb212e54c0cda632b785d586e5765',
    '0xf86928808307a12094f17f52151ebef6c7334fad080c5704d77216b73289056bc75e2d63100000801ca07ebe45d6a5069f77a9a5c80f3c14e5a4ee9936d63b38f8ba365d2c2f0bb4c4fca05257db2412d60af9771b3b93414f8b0aa4942dae417184aaf3732dd007a4b2cd',
    '0xf86929808307a12094c5fdf4076b8f3a5357c5e395ab970b5b54098fef89056bc75e2d63100000801ba041957b5034421ed9116698ce45d55a6edb9d547f6c12f265e437fcc489f83ca4a02fd502e4c56af3e270f80168d18e3259f3dc4b4944b50e79d56a0eaf811e6cb2',
]

const main = async () => {
    console.log('Applying Pre-signed Transactions...')
    for (tx of txArrary) {
        await web3.eth.sendSignedTransaction(tx)
        console.log(await web3.eth.getBalance('0x627306090abaB3A6e1400e9345bC60c78a8BEf57'))
    }
    process.exit(0);
}

main();