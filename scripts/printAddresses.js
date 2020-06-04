
(async () => {
    const { getAccounts } = require('../utils');
    const accounts = getAccounts();
    let addr = accounts.map(a => {
        return a.address
    });
    console.log(addr)
    process.exit()
})()