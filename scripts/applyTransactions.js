const Web3 = require('web3')
var web3 = new Web3('http://localhost:8545');

const txArrary = [
    '0xf86921808307a12094627306090abab3a6e1400e9345bc60c78a8bef5789056bc75e2d63100000801ba0e6ba4bf36ff426218a74e3f7d868523a3e43adf851066dd555035a6475a32949a030795067158d8eb1f45ab29ce6d777d3fc082e4407504b20f288ba57c6ae9d26',
    '0xf86922808307a12094f17f52151ebef6c7334fad080c5704d77216b73289056bc75e2d63100000801ca04cf2fd4cf9380c11e5cd510551d5b4bee44c9684799649010dd0db7d205cd677a06bc253b0ed5a8a5ba7c5068b1919634aadfc86761d9e4248c6a9782a907cfd9c',
    '0xf86923808307a12094c5fdf4076b8f3a5357c5e395ab970b5b54098fef89056bc75e2d63100000801ba00224f5971c34a419ec15730b29843b486eee79c9e79c660289421b0959f3ec74a03eb88cc4f0abbe195506274b9b44dfee58e5786c948cdbb94766df8092912bf6'
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