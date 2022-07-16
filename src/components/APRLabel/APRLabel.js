import React from "react";

import useSWR from "swr";

import {
  PLACEHOLDER_ACCOUNT,
  fetcher,
  formatKeyAmount,
  getBalanceAndSupplyData,
  getDepositBalanceData,
  getVestingData,
  getStakingData,
  getProcessedData,
} from "../../Helpers";

import Vault from "../../abis/Vault.json";
import Reader from "../../abis/Reader.json";
import RewardReader from "../../abis/RewardReader.json";
import Token from "../../abis/Token.json";
import MvlpManager from "../../abis/MvlpManager.json";

import { useWeb3React } from "@web3-react/core";

import { useMvxPrice, useTotalMvxSupply } from "../../Api";

import { getContract } from "../../Addresses";

export default function APRLabel({ chainId, label }) {
  let { active } = useWeb3React();

  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const readerAddress = getContract(chainId, "Reader");

  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const mvxAddress = getContract(chainId, "MVX");
  const esMvxAddress = getContract(chainId, "ES_MVX");
  const bnMvxAddress = getContract(chainId, "BN_MVX");
  const mvlpAddress = getContract(chainId, "MVLP");

  const stakedMvxTrackerAddress = getContract(chainId, "StakedMvxTracker");
  const bonusMvxTrackerAddress = getContract(chainId, "BonusMvxTracker");
  const feeMvxTrackerAddress = getContract(chainId, "FeeMvxTracker");

  const stakedMvlpTrackerAddress = getContract(chainId, "StakedMvlpTracker");
  const feeMvlpTrackerAddress = getContract(chainId, "FeeMvlpTracker");

  const mvlpManagerAddress = getContract(chainId, "MvlpManager");

  const mvxVesterAddress = getContract(chainId, "MvxVester");
  const mvlpVesterAddress = getContract(chainId, "MvlpVester");

  const vesterAddresses = [mvxVesterAddress, mvlpVesterAddress];

  const walletTokens = [mvxAddress, esMvxAddress, mvlpAddress, stakedMvxTrackerAddress];
  const depositTokens = [
    mvxAddress,
    esMvxAddress,
    stakedMvxTrackerAddress,
    bonusMvxTrackerAddress,
    bnMvxAddress,
    mvlpAddress,
  ];
  const rewardTrackersForDepositBalances = [
    stakedMvxTrackerAddress,
    stakedMvxTrackerAddress,
    bonusMvxTrackerAddress,
    feeMvxTrackerAddress,
    feeMvxTrackerAddress,
    feeMvlpTrackerAddress,
  ];
  const rewardTrackersForStakingInfo = [
    stakedMvxTrackerAddress,
    bonusMvxTrackerAddress,
    feeMvxTrackerAddress,
    stakedMvlpTrackerAddress,
    feeMvlpTrackerAddress,
  ];

  const { data: walletBalances } = useSWR(
    [`StakeV2:walletBalances:${active}`, chainId, readerAddress, "getTokenBalancesWithSupplies", PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(undefined, Reader, [walletTokens]),
    }
  );

  const { data: depositBalances } = useSWR(
    [`StakeV2:depositBalances:${active}`, chainId, rewardReaderAddress, "getDepositBalances", PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(undefined, RewardReader, [depositTokens, rewardTrackersForDepositBalances]),
    }
  );

  const { data: stakingInfo } = useSWR(
    [`StakeV2:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(undefined, RewardReader, [rewardTrackersForStakingInfo]),
    }
  );

  const { data: stakedMvxSupply } = useSWR(
    [`StakeV2:stakedMvxSupply:${active}`, chainId, mvxAddress, "balanceOf", stakedMvxTrackerAddress],
    {
      fetcher: fetcher(undefined, Token),
    }
  );

  const { data: aums } = useSWR([`StakeV2:getAums:${active}`, chainId, mvlpManagerAddress, "getAums"], {
    fetcher: fetcher(undefined, MvlpManager),
  });

  const { data: nativeTokenPrice } = useSWR(
    [`StakeV2:nativeTokenPrice:${active}`, chainId, vaultAddress, "getMinPrice", nativeTokenAddress],
    {
      fetcher: fetcher(undefined, Vault),
    }
  );

  const { data: vestingInfo } = useSWR(
    [`StakeV2:vestingInfo:${active}`, chainId, readerAddress, "getVestingInfo", PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(undefined, Reader, [vesterAddresses]),
    }
  );

  const { mvxPrice } = useMvxPrice(chainId, {}, active);

  let { total: mvxSupply } = useTotalMvxSupply();

  let aum;
  if (aums && aums.length > 0) {
    aum = aums[0].add(aums[1]).div(2);
  }

  const { balanceData, supplyData } = getBalanceAndSupplyData(walletBalances);
  const depositBalanceData = getDepositBalanceData(depositBalances);
  const stakingData = getStakingData(stakingInfo);
  const vestingData = getVestingData(vestingInfo);

  const processedData = getProcessedData(
    balanceData,
    supplyData,
    depositBalanceData,
    stakingData,
    vestingData,
    aum,
    nativeTokenPrice,
    stakedMvxSupply,
    mvxPrice,
    mvxSupply
  );

  return <>{`${formatKeyAmount(processedData, label, 2, 2, true)}%`}</>;
}
