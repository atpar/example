#!/bin/sh

if [ ! -d "node_modules/@atpar/ap-contracts/build" ]
then
	echo "• compiling contracts"
	(
		cd node_modules/@atpar/ap-contracts
		npx --quiet cross-env NODE_OPTIONS="--max_old_space_size=4096" truffle compile | 1>/dev/null
	)
fi

echo "• migrating contracts"

(
	cd node_modules/@atpar/ap-contracts
	npx cross-env NODE_OPTIONS="--max_old_space_size=4096" truffle migrate --reset --network development
)

echo "✓ ready"
