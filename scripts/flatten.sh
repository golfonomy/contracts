#!/bin/bash

for FILE_PATH in contracts/*
do
  FILE_NAME="$(echo $FILE_PATH | awk -F '/' '{print $2}')"
  npx hardhat flatten $FILE_PATH > flat/$FILE_NAME
  sed -i '' '1,4d' flat/$FILE_NAME
  sed -i '' '2,$s/.*SPDX-License-Identifier.*//' flat/$FILE_NAME
done

# npx hardhat flatten contracts/UUPSProxy.sol > flat/UUPSProxy.sol
