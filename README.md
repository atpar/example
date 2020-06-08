# AP.js Demo

Consider this project the "hello, world" for the [AP.js Library](https://github.com/atpar/ap-monorepo/tree/master/packages/ap.js). In this example we will walk through the process of creating and issuing an ACTUS protocol compliant financial instrument on a public ethereum blockchain.

## Setup

First, you will need to create a file in the root of the director named `secret.json` which will store your wallet and provider configuration objects. The JSON structure of this file should contain a `mnemonic` field with a 12 word mnemonic phrase as well as a `rpcURL` field containing the string of the ethereum RPC URL you wish to connect to. See below for an example of what the file should look like.

```
{
    "mnemonic": "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
    "rpcURL": "https://goerli.infura.io/v3/<YOUR PROJECT ID>"
}
```json

You will need to fund the primary address you plan on using for this example with Goerli Testnet ETH to pay for transaction gas costs. You can find a goerli faucet [here](https://goerli-faucet.slock.it/).


## Run the full example

After funding the wallet you can run the full example with the command:

    npm start


For more documentation on how to use `ap.js` please refer to the [Actus Protocol Docs](https://docs.actus-protocol.io/guides/getting-started)