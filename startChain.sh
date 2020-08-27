#!/bin/sh

set -o errexit

trap shutdown_ganache INT TERM EXIT

shutdown_ganache() {
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}

echo "• running ganache-cli"

# use id ap-chain Id
npx ganache-cli \
	--blockTime '2' \
	--networkId '1994' \
	--gasLimit '0xF42400' \
	--defaultBalanceEther '5000000000' \
	--deterministic --mnemonic "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat" &

ganache_pid=$!

sleep 1

echo "✓ ready"

if [ -n "$1" ]
	then 
		eval $1
	else 
		while true; do sleep 1; done
fi
