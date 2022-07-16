import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";

import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { ethers } from "ethers";

import Tab from "../Tab/Tab";
import cx from "classnames";

import { getToken, getTokens, getWhitelistedTokens, getWrappedToken, getNativeToken } from "../../data/Tokens";
import { getContract } from "../../Addresses";
import {
  helperToast,
  useLocalStorageByChainId,
  getTokenInfo,
  // getChainName,
  useChainId,
  expandDecimals,
  fetcher,
  bigNumberify,
  formatAmount,
  formatAmountFree,
  formatKeyAmount,
  // formatDateTime,
  getBuyMvlpToAmount,
  getBuyMvlpFromAmount,
  getSellMvlpFromAmount,
  getSellMvlpToAmount,
  parseValue,
  approveTokens,
  getUsd,
  adjustForDecimals,
  MVLP_DECIMALS,
  USD_DECIMALS,
  BASIS_POINTS_DIVISOR,
  MVLP_COOLDOWN_DURATION,
  SECONDS_PER_YEAR,
  USDM_DECIMALS,
  POLYGON,
  PLACEHOLDER_ACCOUNT,
  MVXMVLP_DISPLAY_DECIMALS,
} from "../../Helpers";

import { callContract, useMvxPrice, useInfoTokens } from "../../Api";

import TokenSelector from "../Exchange/TokenSelector";
import BuyInputSection from "../BuyInputSection/BuyInputSection";
import Tooltip from "../Tooltip/Tooltip";

import Reader from "../../abis/Reader.json";
import RewardReader from "../../abis/RewardReader.json";
import Vault from "../../abis/Vault.json";
import MvlpManager from "../../abis/MvlpManager.json";
import RewardTracker from "../../abis/RewardTracker.json";
import Vester from "../../abis/Vester.json";
import RewardRouter from "../../abis/RewardRouter.json";
import Token from "../../abis/Token.json";

import mvlp24Icon from "../../img/ic_mvlp_24.svg";
import mvlp40Icon from "../../img/mvlp.png";
import arrowIcon from "../../img/ic_convert_down.svg";

import polygon16Icon from "../../img/ic_matic_16new.svg";

import "./MvlpSwap.css";
import AssetDropdown from "../../views/Dashboard/AssetDropdown";

const { AddressZero } = ethers.constants;

function getStakingData(stakingInfo) {
  if (!stakingInfo || stakingInfo.length === 0) {
    return;
  }

  const keys = ["stakedMvlpTracker", "feeMvlpTracker"];
  const data = {};
  const propsLength = 5;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      claimable: stakingInfo[i * propsLength],
      tokensPerInterval: stakingInfo[i * propsLength + 1],
      averageStakedAmounts: stakingInfo[i * propsLength + 2],
      cumulativeRewards: stakingInfo[i * propsLength + 3],
      totalSupply: stakingInfo[i * propsLength + 4],
    };
  }

  return data;
}

export default function MvlpSwap(props) {
  const { savedSlippageAmount, isBuying, setPendingTxns, connectWallet, setIsBuying } = props;
  const history = useHistory();
  const swapLabel = isBuying ? "+ LIQ." : "- LIQ.";
  const tabLabel = isBuying ? "+ LIQ." : "- LIQ.";
  const { active, library, account } = useWeb3React();
  const { chainId } = useChainId();
  // const chainName = getChainName(chainId)
  const tokens = getTokens(chainId);
  const whitelistedTokens = getWhitelistedTokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
  const [swapValue, setSwapValue] = useState("");
  const [mvlpValue, setMvlpValue] = useState("");
  const [swapTokenAddress, setSwapTokenAddress] = useLocalStorageByChainId(
    chainId,
    `${swapLabel}-swap-token-address`,
    AddressZero
  );
  const [isApproving, setIsApproving] = useState(false);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anchorOnSwapAmount, setAnchorOnSwapAmount] = useState(true);
  const [feeBasisPoints, setFeeBasisPoints] = useState("");

  const readerAddress = getContract(chainId, "Reader");
  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const stakedMvlpTrackerAddress = getContract(chainId, "StakedMvlpTracker");
  const feeMvlpTrackerAddress = getContract(chainId, "FeeMvlpTracker");
  const usdmAddress = getContract(chainId, "USDM");
  const mvlpManagerAddress = getContract(chainId, "MvlpManager");
  const rewardRouterAddress = getContract(chainId, "RewardRouter");
  const tokensForBalanceAndSupplyQuery = [stakedMvlpTrackerAddress, usdmAddress];

  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR(
    [`MvlpSwap:getTokenBalances:${active}`, chainId, readerAddress, "getTokenBalances", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, Reader, [tokenAddresses]),
    }
  );

  const { data: balancesAndSupplies } = useSWR(
    [
      `MvlpSwap:getTokenBalancesWithSupplies:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: fetcher(library, Reader, [tokensForBalanceAndSupplyQuery]),
    }
  );

  const { data: aums } = useSWR([`MvlpSwap:getAums:${active}`, chainId, mvlpManagerAddress, "getAums"], {
    fetcher: fetcher(library, MvlpManager),
  });

  const { data: totalTokenWeights } = useSWR(
    [`MvlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: fetcher(library, Vault),
    }
  );

  const tokenAllowanceAddress = swapTokenAddress === AddressZero ? nativeTokenAddress : swapTokenAddress;
  const { data: tokenAllowance } = useSWR(
    [active, chainId, tokenAllowanceAddress, "allowance", account || PLACEHOLDER_ACCOUNT, mvlpManagerAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  const { data: lastPurchaseTime } = useSWR(
    [`MvlpSwap:lastPurchaseTime:${active}`, chainId, mvlpManagerAddress, "lastAddedAt", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, MvlpManager),
    }
  );

  const { data: mvlpBalance } = useSWR(
    [`MvlpSwap:mvlpBalance:${active}`, chainId, feeMvlpTrackerAddress, "stakedAmounts", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, RewardTracker),
    }
  );

  const mvlpVesterAddress = getContract(chainId, "MvlpVester");
  const { data: reservedAmount } = useSWR(
    [`MvlpSwap:reservedAmount:${active}`, chainId, mvlpVesterAddress, "pairAmounts", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, Vester),
    }
  );

  const { mvxPrice } = useMvxPrice(chainId, { polygon: chainId === POLYGON ? library : undefined }, active);

  const rewardTrackersForStakingInfo = [stakedMvlpTrackerAddress, feeMvlpTrackerAddress];
  const { data: stakingInfo } = useSWR(
    [`MvlpSwap:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, RewardReader, [rewardTrackersForStakingInfo]),
    }
  );

  const stakingData = getStakingData(stakingInfo);

  const redemptionTime = lastPurchaseTime ? lastPurchaseTime.add(MVLP_COOLDOWN_DURATION) : undefined;
  const inCooldownWindow = redemptionTime && parseInt(Date.now() / 1000) < redemptionTime;

  const mvlpSupply = balancesAndSupplies ? balancesAndSupplies[1] : bigNumberify(0);
  const usdmSupply = balancesAndSupplies ? balancesAndSupplies[3] : bigNumberify(0);
  let aum;
  if (aums && aums.length > 0) {
    aum = isBuying ? aums[0] : aums[1];
  }
  const mvlpPrice =
    aum && aum.gt(0) && mvlpSupply.gt(0)
      ? aum.mul(expandDecimals(1, MVLP_DECIMALS)).div(mvlpSupply)
      : expandDecimals(1, USD_DECIMALS);
  let mvlpBalanceUsd;
  if (mvlpBalance) {
    mvlpBalanceUsd = mvlpBalance.mul(mvlpPrice).div(expandDecimals(1, MVLP_DECIMALS));
  }
  const mvlpSupplyUsd = mvlpSupply.mul(mvlpPrice).div(expandDecimals(1, MVLP_DECIMALS));

  let reserveAmountUsd;
  if (reservedAmount) {
    reserveAmountUsd = reservedAmount.mul(mvlpPrice).div(expandDecimals(1, MVLP_DECIMALS));
  }

  const { infoTokens } = useInfoTokens(library, chainId, active, tokenBalances, undefined);
  const swapToken = getToken(chainId, swapTokenAddress);
  const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress);

  const swapTokenBalance = swapTokenInfo && swapTokenInfo.balance ? swapTokenInfo.balance : bigNumberify(0);

  const swapAmount = parseValue(swapValue, swapToken && swapToken.decimals);
  const mvlpAmount = parseValue(mvlpValue, MVLP_DECIMALS);

  const needApproval =
    isBuying && swapTokenAddress !== AddressZero && tokenAllowance && swapAmount && swapAmount.gt(tokenAllowance);

  const swapUsdMin = getUsd(swapAmount, swapTokenAddress, false, infoTokens);
  const mvlpUsdMax = mvlpAmount && mvlpPrice ? mvlpAmount.mul(mvlpPrice).div(expandDecimals(1, MVLP_DECIMALS)) : undefined;

  let isSwapTokenCapReached;
  if (swapTokenInfo.managedUsd && swapTokenInfo.maxUsdmAmount) {
    isSwapTokenCapReached = swapTokenInfo.managedUsd.gt(
      adjustForDecimals(swapTokenInfo.maxUsdmAmount, USDM_DECIMALS, USD_DECIMALS)
    );
  }

  const onSwapValueChange = (e) => {
    setAnchorOnSwapAmount(true);
    setSwapValue(e.target.value);
  };

  const onMvlpValueChange = (e) => {
    setAnchorOnSwapAmount(false);
    setMvlpValue(e.target.value);
  };

  const onSelectSwapToken = (token) => {
    setSwapTokenAddress(token.address);
    setIsWaitingForApproval(false);
  };

  const nativeToken = getTokenInfo(infoTokens, AddressZero);

  let totalApr = bigNumberify(0);

  let feeMvlpTrackerAnnualRewardsUsd;
  let feeMvlpTrackerApr;
  if (
    stakingData &&
    stakingData.feeMvlpTracker &&
    stakingData.feeMvlpTracker.tokensPerInterval &&
    nativeToken &&
    nativeToken.minPrice &&
    mvlpSupplyUsd &&
    mvlpSupplyUsd.gt(0)
  ) {
    feeMvlpTrackerAnnualRewardsUsd = stakingData.feeMvlpTracker.tokensPerInterval
      .mul(SECONDS_PER_YEAR)
      .mul(nativeToken.minPrice)
      .div(expandDecimals(1, 18));
    feeMvlpTrackerApr = feeMvlpTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(mvlpSupplyUsd);
    totalApr = totalApr.add(feeMvlpTrackerApr);
  }

  let stakedMvlpTrackerAnnualRewardsUsd;
  let stakedMvlpTrackerApr;

  if (
    mvxPrice &&
    stakingData &&
    stakingData.stakedMvlpTracker &&
    stakingData.stakedMvlpTracker.tokensPerInterval &&
    mvlpSupplyUsd &&
    mvlpSupplyUsd.gt(0)
  ) {
    stakedMvlpTrackerAnnualRewardsUsd = stakingData.stakedMvlpTracker.tokensPerInterval
      .mul(SECONDS_PER_YEAR)
      .mul(mvxPrice)
      .div(expandDecimals(1, 18));
    stakedMvlpTrackerApr = stakedMvlpTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(mvlpSupplyUsd);
    totalApr = totalApr.add(stakedMvlpTrackerApr);
  }

  useEffect(() => {
    const updateSwapAmounts = () => {
      if (anchorOnSwapAmount) {
        if (!swapAmount) {
          setMvlpValue("");
          setFeeBasisPoints("");
          return;
        }

        if (isBuying) {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getBuyMvlpToAmount(
            swapAmount,
            swapTokenAddress,
            infoTokens,
            mvlpPrice,
            usdmSupply,
            totalTokenWeights
          );
          const nextValue = formatAmountFree(nextAmount, MVLP_DECIMALS, MVLP_DECIMALS);
          setMvlpValue(nextValue);
          setFeeBasisPoints(feeBps);
        } else {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getSellMvlpFromAmount(
            swapAmount,
            swapTokenAddress,
            infoTokens,
            mvlpPrice,
            usdmSupply,
            totalTokenWeights
          );
          const nextValue = formatAmountFree(nextAmount, MVLP_DECIMALS, MVLP_DECIMALS);
          setMvlpValue(nextValue);
          setFeeBasisPoints(feeBps);
        }

        return;
      }

      if (!mvlpAmount) {
        setSwapValue("");
        setFeeBasisPoints("");
        return;
      }

      if (swapToken) {
        if (isBuying) {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getBuyMvlpFromAmount(
            mvlpAmount,
            swapTokenAddress,
            infoTokens,
            mvlpPrice,
            usdmSupply,
            totalTokenWeights
          );
          const nextValue = formatAmountFree(nextAmount, swapToken.decimals, swapToken.decimals);
          setSwapValue(nextValue);
          setFeeBasisPoints(feeBps);
        } else {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getSellMvlpToAmount(
            mvlpAmount,
            swapTokenAddress,
            infoTokens,
            mvlpPrice,
            usdmSupply,
            totalTokenWeights,
            true
          );

          const nextValue = formatAmountFree(nextAmount, swapToken.decimals, swapToken.decimals);
          setSwapValue(nextValue);
          setFeeBasisPoints(feeBps);
        }
      }
    };

    updateSwapAmounts();
  }, [
    isBuying,
    anchorOnSwapAmount,
    swapAmount,
    mvlpAmount,
    swapToken,
    swapTokenAddress,
    infoTokens,
    mvlpPrice,
    usdmSupply,
    totalTokenWeights,
  ]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const switchSwapOption = (hash = "") => {
    history.push(`${history.location.pathname}#${hash}`);
    props.setIsBuying(hash === "redeem" ? false : true);
  };

  const fillMaxAmount = () => {
    if (isBuying) {
      setAnchorOnSwapAmount(true);
      setSwapValue(formatAmountFree(swapTokenBalance, swapToken.decimals, swapToken.decimals));
      return;
    }

    setAnchorOnSwapAmount(false);
    setMvlpValue(formatAmountFree(maxSellAmount, MVLP_DECIMALS, MVLP_DECIMALS));
  };

  const getError = () => {
    if (!isBuying && inCooldownWindow) {
      return [`Redemption time not yet reached`];
    }

    if (!swapAmount || swapAmount.eq(0)) {
      return ["ENTER AN AMOUNT"];
    }
    if (!mvlpAmount || mvlpAmount.eq(0)) {
      return ["ENTER AN AMOUNT"];
    }

    if (isBuying) {
      const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress);
      if (swapTokenInfo && swapTokenInfo.balance && swapAmount && swapAmount.gt(swapTokenInfo.balance)) {
        return [`INSUFFICIENT ${swapTokenInfo.symbol} BALANCE`];
      }

      if (swapTokenInfo.maxUsdmAmount && swapTokenInfo.usdmAmount && swapUsdMin) {
        const usdmFromAmount = adjustForDecimals(swapUsdMin, USD_DECIMALS, USDM_DECIMALS);
        const nextUsdmAmount = swapTokenInfo.usdmAmount.add(usdmFromAmount);
        if (swapTokenInfo.maxUsdmAmount.gt(0) && nextUsdmAmount.gt(swapTokenInfo.maxUsdmAmount)) {
          return [`${swapTokenInfo.symbol} pool exceeded, try different token`, true];
        }
      }
    }

    if (!isBuying) {
      if (maxSellAmount && mvlpAmount && mvlpAmount.gt(maxSellAmount)) {
        return [`INSUFFICIENT MVLP BALANCE`];
      }

      const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress);
      if (
        swapTokenInfo &&
        swapTokenInfo.availableAmount &&
        swapAmount &&
        swapAmount.gt(swapTokenInfo.availableAmount)
      ) {
        return [`INSUFFICIENT LIQUIDITY`];
      }
    }

    return [false];
  };

  const isPrimaryEnabled = () => {
    if (!active) {
      return true;
    }
    const [error, modal] = getError();
    if(error){
      console.error(error);
    }
    if (error && !modal) {
      return false;
    }
    if ((needApproval && isWaitingForApproval) || isApproving) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isSubmitting) {
      return false;
    }
    if (isSwapTokenCapReached) {
      return false;
    }

    return true;
  };

  const getPrimaryText = () => {
    if (!active) {
      return "Connect Wallet";
    }
    const [error, modal] = getError();
    if(error){
      console.error(error);
    }

    if (error && !modal) {
      return error;
    }
    if (isBuying && isSwapTokenCapReached) {
      return `Max Capacity for ${swapToken.symbol} Reached`;
    }

    if (needApproval && isWaitingForApproval) {
      return "Waiting for Approval";
    }
    if (isApproving) {
      return `Approving ${swapToken.symbol}...`;
    }
    if (needApproval) {
      return `Approve ${swapToken.symbol}`;
    }

    if (isSubmitting) {
      return isBuying ? `Buying...` : `Selling...`;
    }

    return isBuying ? "+ LIQ." : "- LIQ.";
  };

  const approveFromToken = () => {
    approveTokens({
      setIsApproving,
      library,
      tokenAddress: swapToken.address,
      spender: mvlpManagerAddress,
      chainId: chainId,
      onApproveSubmitted: () => {
        setIsWaitingForApproval(true);
      },
      infoTokens,
      getTokenInfo,
    });
  };

  const buyMvlp = () => {
    setIsSubmitting(true);

    const minMvlp = mvlpAmount.mul(BASIS_POINTS_DIVISOR - savedSlippageAmount).div(BASIS_POINTS_DIVISOR);

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    const method = swapTokenAddress === AddressZero ? "mintAndStakeMvlpETH" : "mintAndStakeMvlp";
    const params = swapTokenAddress === AddressZero ? [0, minMvlp] : [swapTokenAddress, swapAmount, 0, minMvlp];
    const value = swapTokenAddress === AddressZero ? swapAmount : 0;

    callContract(chainId, contract, method, params, {
      value,
      sentMsg: "Buy submitted.",
      failMsg: "Buy failed.",
      successMsg: `${formatAmount(mvlpAmount, 18, 4, true)} MVLP bought with ${formatAmount(
        swapAmount,
        swapTokenInfo.decimals,
        4,
        true
      )} ${swapTokenInfo.symbol}!`,
      setPendingTxns,
    })
      .then(async () => {})
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const sellMvlp = () => {
    setIsSubmitting(true);

    const minOut = swapAmount.mul(BASIS_POINTS_DIVISOR - savedSlippageAmount).div(BASIS_POINTS_DIVISOR);

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    const method = swapTokenAddress === AddressZero ? "unstakeAndRedeemMvlpETH" : "unstakeAndRedeemMvlp";
    const params =
      swapTokenAddress === AddressZero ? [mvlpAmount, minOut, account] : [swapTokenAddress, mvlpAmount, minOut, account];

    callContract(chainId, contract, method, params, {
      sentMsg: "Sell submitted!",
      failMsg: "Sell failed.",
      successMsg: `${formatAmount(mvlpAmount, 18, 4, true)} MVLP sold for ${formatAmount(
        swapAmount,
        swapTokenInfo.decimals,
        4,
        true
      )} ${swapTokenInfo.symbol}!`,
      setPendingTxns,
    })
      .then(async () => {})
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const onClickPrimary = () => {
    if (!active) {
      connectWallet();
      return;
    }

    if (needApproval) {
      approveFromToken();
      return;
    }

    const [error, modal] = getError();
    if(error){
      console.error(error);
    }

    if (modal) {
      return;
    }

    if (isBuying) {
      buyMvlp();
    } else {
      sellMvlp();
    }
  };

  let payLabel = "Pay";
  let receiveLabel = "Receive";
  let payBalance = "$0.00";
  let receiveBalance = "$0.00";
  if (isBuying) {
    if (swapUsdMin) {
      payBalance = `$${formatAmount(swapUsdMin, USD_DECIMALS, 2, true)}`;
    }
    if (mvlpUsdMax) {
      receiveBalance = `$${formatAmount(mvlpUsdMax, USD_DECIMALS, 2, true)}`;
    }
  } else {
    if (mvlpUsdMax) {
      payBalance = `$${formatAmount(mvlpUsdMax, USD_DECIMALS, 2, true)}`;
    }
    if (swapUsdMin) {
      receiveBalance = `$${formatAmount(swapUsdMin, USD_DECIMALS, 2, true)}`;
    }
  }

  const selectToken = (token) => {
    setAnchorOnSwapAmount(false);
    setSwapTokenAddress(token.address);
    helperToast.success(`${token.symbol} selected in order form`);
  };

  let feePercentageText = formatAmount(feeBasisPoints, 2, 2, true, "-");
  if (feeBasisPoints !== undefined && feeBasisPoints.toString().length > 0) {
    feePercentageText += "%";
  }

  let maxSellAmount = mvlpBalance;
  if (mvlpBalance && reservedAmount) {
    maxSellAmount = mvlpBalance.sub(reservedAmount);
  }

  const wrappedTokenSymbol = getWrappedToken(chainId).symbol;
  const nativeTokenSymbol = getNativeToken(chainId).symbol;

  const onSwapOptionChange = (opt) => {
    if (opt === "- LIQ.") {
      switchSwapOption("redeem");
    } else {
      switchSwapOption();
    }
  };

  return (
    <div className="MvlpSwap">
      {/* <div className="Page-title-section">
        <div className="Page-title">{isBuying ? "Buy MVLP" : "Sell MVLP"}</div>
        {isBuying && <div className="Page-description">
          Purchase <a href=" https://docs.metavault.trade/mvlp" target="_blank" rel="noopener noreferrer">MVLP tokens</a> to earn {nativeTokenSymbol} fees from swaps and leverage trading.<br/>
          Note that there is a minimum holding time of 15 minutes after a purchase.<br/>
          <div>View <Link to="/earn">staking</Link> page.</div>
        </div>}
        {!isBuying && <div className="Page-description">
          Redeem your MVLP tokens for any supported asset.
          {inCooldownWindow && <div>
            MVLP tokens can only be redeemed 15 minutes after your most recent purchase.<br/>
            Your last purchase was at {formatDateTime(lastPurchaseTime)}, you can redeem MVLP tokens after {formatDateTime(redemptionTime)}.<br/>
          </div>}
          <div>View <Link to="/earn">staking</Link> page.</div>
        </div>}
      </div> */}
      <div className="MvlpSwap-content">
        <div className="App-card MvlpSwap-stats-card">
          <div className="App-card-title">
            <div className="App-card-title-mark">
              <div className="App-card-title-mark-icon">
                <img src={mvlp40Icon} alt="mvlp40Icon" />
                  <img src={polygon16Icon} alt="polygon16Icon" className="selected-network-symbol" />
              </div>
              <div className="App-card-title-mark-info">
                <div className="App-card-title-mark-title">MVLP</div>
                <div className="App-card-title-mark-subtitle">MVLP</div>
              </div>
            </div>
          </div>
          <div className="App-card-divider"></div>
          <div className="App-card-content">
            <div className="App-card-row">
              <div className="label">Price</div>
              <div className="value">${formatAmount(mvlpPrice, USD_DECIMALS, MVXMVLP_DISPLAY_DECIMALS, true)}</div>
            </div>
            <div className="App-card-row">
              <div className="label">Wallet</div>
              <div className="value">
                {formatAmount(mvlpBalance, MVLP_DECIMALS, 4, true)} MVLP ($
                {formatAmount(mvlpBalanceUsd, USD_DECIMALS, 2, true)})
              </div>
            </div>
          </div>
          <div className="App-card-divider"></div>
          <div className="App-card-content">
            {!isBuying && (
              <div className="App-card-row">
                <div className="label">Reserved</div>
                <div className="value">
                  <Tooltip
                    handle={`${formatAmount(reservedAmount, 18, 4, true)} MVLP ($${formatAmount(
                      reserveAmountUsd,
                      USD_DECIMALS,
                      2,
                      true
                    )})`}
                    position="right-bottom"
                    renderContent={() =>
                      `${formatAmount(reservedAmount, 18, 4, true)} Reserved MVLP for vesting.`
                    }
                  />
                </div>
              </div>
            )}
            <div className="App-card-row">
              <div className="label">APR</div>
              <div className="value">
                <Tooltip
                  handle={`${formatAmount(totalApr, 2, 2, true)}%`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <>
                        <div className="Tooltip-row">
                          <span className="label">
                            {nativeTokenSymbol} ({wrappedTokenSymbol}) APR
                          </span>
                          <span>{formatAmount(feeMvlpTrackerApr, 2, 2, false)}%</span>
                        </div>
                        <div className="Tooltip-row">
                          <span className="label">Escrowed MVX APR</span>
                          <span>{formatAmount(stakedMvlpTrackerApr, 2, 2, false)}%</span>
                        </div>
                      </>
                    );
                  }}
                />
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">Total Supply</div>
              <div className="value">
                {formatAmount(mvlpSupply, MVLP_DECIMALS, 4, true)} MVLP ($
                {formatAmount(mvlpSupplyUsd, USD_DECIMALS, 2, true)})
              </div>
            </div>
          </div>
        </div>
        <div className="MvlpSwap-box App-box">
          <Tab
            options={["+ LIQ.", "- LIQ."]}
            option={tabLabel}
            onChange={onSwapOptionChange}
            className="Exchange-swap-option-tabs"
          />
          {isBuying && (
            <BuyInputSection
              topLeftLabel={payLabel}
              topRightLabel={`Balance: `}
              tokenBalance={`${formatAmount(swapTokenBalance, swapToken.decimals, 4, true)}`}
              inputValue={swapValue}
              onInputValueChange={onSwapValueChange}
              showMaxButton={swapValue !== formatAmountFree(swapTokenBalance, swapToken.decimals, swapToken.decimals)}
              onClickTopRightLabel={fillMaxAmount}
              onClickMax={fillMaxAmount}
              selectedToken={swapToken}
              balance={payBalance}
            >
              <TokenSelector
                label="Pay"
                chainId={chainId}
                tokenAddress={swapTokenAddress}
                onSelectToken={onSelectSwapToken}
                tokens={whitelistedTokens}
                infoTokens={infoTokens}
                className="MvlpSwap-from-token"
                showSymbolImage={true}
                showTokenImgInDropdown={true}
              />
            </BuyInputSection>
          )}

          {!isBuying && (
            <BuyInputSection
              topLeftLabel={payLabel}
              topRightLabel={`Available: `}
              tokenBalance={`${formatAmount(maxSellAmount, MVLP_DECIMALS, 4, true)}`}
              inputValue={mvlpValue}
              onInputValueChange={onMvlpValueChange}
              showMaxButton={mvlpValue !== formatAmountFree(maxSellAmount, MVLP_DECIMALS, MVLP_DECIMALS)}
              onClickTopRightLabel={fillMaxAmount}
              onClickMax={fillMaxAmount}
              balance={payBalance}
              defaultTokenName={"MVLP"}
            >
              <div className="selected-token">
                MVLP <img src={mvlp24Icon} alt="mvlp24Icon" />
              </div>
            </BuyInputSection>
          )}

          <div className="AppOrder-ball-container">
            <div className="AppOrder-ball">
              <img
                src={arrowIcon}
                alt="arrowIcon"
                onClick={() => {
                  setIsBuying(!isBuying);
                  switchSwapOption(isBuying ? "redeem" : "");
                }}
              />
            </div>
          </div>

          {isBuying && (
            <BuyInputSection
              topLeftLabel={receiveLabel}
              topRightLabel={`Balance: `}
              tokenBalance={`${formatAmount(mvlpBalance, MVLP_DECIMALS, 4, true)}`}
              inputValue={mvlpValue}
              onInputValueChange={onMvlpValueChange}
              balance={receiveBalance}
              defaultTokenName={"MVLP"}
            >
              <div className="selected-token">
                MVLP <img src={mvlp24Icon} alt="mvlp24Icon" />
              </div>
            </BuyInputSection>
          )}

          {!isBuying && (
            <BuyInputSection
              topLeftLabel={receiveLabel}
              topRightLabel={`Balance: `}
              tokenBalance={`${formatAmount(swapTokenBalance, swapToken.decimals, 4, true)}`}
              inputValue={swapValue}
              onInputValueChange={onSwapValueChange}
              balance={receiveBalance}
              selectedToken={swapToken}
            >
              <TokenSelector
                label="Receive"
                chainId={chainId}
                tokenAddress={swapTokenAddress}
                onSelectToken={onSelectSwapToken}
                tokens={whitelistedTokens}
                infoTokens={infoTokens}
                className="MvlpSwap-from-token"
                showSymbolImage={true}
                showTokenImgInDropdown={true}
              />
            </BuyInputSection>
          )}
          <div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">{feeBasisPoints > 50 ? "WARNING: High Fees" : "Fees"}</div>
              <div className="align-right fee-block">
                {isBuying && (
                  <Tooltip
                    handle={isBuying && isSwapTokenCapReached ? "NA" : feePercentageText}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          {feeBasisPoints > 50 && <div>Select an alternative asset for providing liquidity to reduce fees.</div>}
                          To get the lowest fee percentages, look in the "SAVE FEES" section below.
                        </>
                      );
                    }}
                  />
                )}
                {!isBuying && (
                  <Tooltip
                    handle={feePercentageText}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          {feeBasisPoints > 50 && <div>To reduce fees, select a different asset to remove liquidity.</div>}
                          To get the lowest fee percentages, look in the "SAVE FEES" section below.
                        </>
                      );
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="MvlpSwap-cta Exchange-swap-button-container">
            <button className="App-cta Exchange-swap-button text-uppercase" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
              {getPrimaryText()}
            </button>
          </div>
        </div>
      </div>
      <div className="Tab-title-section" style={{marginLeft:-12}}>
        <div className="Page-title">SAVE FEES</div>
        {isBuying && (
          <div className="Page-description">
            The fees can be vary based on the asset you wish to add liquidity for MVLP.
            <br /> Enter the requested amount of MVLP or asset to be added into the interface and compare the fees here.
          </div>
        )}
        {!isBuying && (
          <div className="Page-description">
            The fees can be vary based on the asset you wish to add liquidity for MVLP.
            <br /> Enter the requested amount of MVLP or asset to be added into the interface and compare the fees here.
          </div>
        )}
      </div>
      <div className="MvlpSwap-token-list">
        {/* <div className="MvlpSwap-token-list-content"> */}
        <table className="token-table">
          <thead>
            <tr>
              <th>TOKEN</th>
              <th>PRICE</th>
              <th>
                {isBuying ? (
                  <Tooltip
                    handle={"AVAILABLE"}
                    tooltipIconPosition="right"
                    position="right-bottom text-none"
                    renderContent={() => "Available amount to deposit into MVLP."}
                  />
                ) : (
                  <Tooltip
                    handle={"AVAILABLE"}
                    tooltipIconPosition="right"
                    position="right-bottom text-none"
                    renderContent={() => {
                      return (
                        <>
                          <div>Available amount to -LIQ. from MVLP.</div>
                          <div>Funds that are not being utilized by current open positions.</div>
                        </>
                      );
                    }}
                  />
                )}
              </th>
              <th>WALLET</th>
              <th>
                <Tooltip
                  handle={"FEES"}
                  tooltipIconPosition="right"
                  position="right-bottom text-none"
                  renderContent={() => {
                    return (
                      <>
                        <div>Fees will be shown once you have entered an amount in the order form.</div>
                      </>
                    );
                  }}
                />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tokenList.map((token) => {
              let tokenFeeBps;
              if (isBuying) {
                const { feeBasisPoints: feeBps } = getBuyMvlpFromAmount(
                  mvlpAmount,
                  token.address,
                  infoTokens,
                  mvlpPrice,
                  usdmSupply,
                  totalTokenWeights
                );
                tokenFeeBps = feeBps;
              } else {
                const { feeBasisPoints: feeBps } = getSellMvlpToAmount(
                  mvlpAmount,
                  token.address,
                  infoTokens,
                  mvlpPrice,
                  usdmSupply,
                  totalTokenWeights
                );
                tokenFeeBps = feeBps;
              }
              const tokenInfo = getTokenInfo(infoTokens, token.address);
              let managedUsd;
              if (tokenInfo && tokenInfo.managedUsd) {
                managedUsd = tokenInfo.managedUsd;
              }
              let availableAmountUsd;
              if (tokenInfo && tokenInfo.minPrice && tokenInfo.availableAmount) {
                availableAmountUsd = tokenInfo.availableAmount
                  .mul(tokenInfo.minPrice)
                  .div(expandDecimals(1, token.decimals));
              }
              let balanceUsd;
              if (tokenInfo && tokenInfo.minPrice && tokenInfo.balance) {
                balanceUsd = tokenInfo.balance.mul(tokenInfo.minPrice).div(expandDecimals(1, token.decimals));
              }

              var tokenImage = null;

              try {
                tokenImage = require("../../img/ic_" + token.symbol.toLowerCase() + "_40.svg");
              } catch (error) {
                console.error(error);
              }
              let isCapReached = tokenInfo.managedAmount?.gt(tokenInfo.maxUsdmAmount);

              let amountLeftToDeposit;
              if (tokenInfo.maxUsdmAmount && tokenInfo.maxUsdmAmount.gt(0)) {
                amountLeftToDeposit = adjustForDecimals(tokenInfo.maxUsdmAmount, USDM_DECIMALS, USD_DECIMALS).sub(
                  tokenInfo.managedUsd
                );
              }
              function renderFees() {
                const swapUrl =
                  chainId === POLYGON
                    ? `https://app.uniswap.org/#/swap?inputCurrency=${token.address}`
                    : `https://traderjoexyz.com/trade?inputCurrency=${token.address}`;
                switch (true) {
                  case (isBuying && isCapReached) || (!isBuying && managedUsd?.lt(1)):
                    return (
                      <Tooltip
                        handle="NA"
                        position="right-bottom"
                        renderContent={() => (
                          <div>
                            Max pool capacity reached for {tokenInfo.symbol}
                            <br />
                            <br />
                            Please mint MVLP using another token
                            <br />
                            <p>
                              <a href={swapUrl} target="_blank" rel="noreferrer">
                                Swap on {chainId === POLYGON ? "Uniswap" : "Trader Joe"}
                              </a>
                            </p>
                          </div>
                        )}
                      />
                    );
                  case (isBuying && !isCapReached) || (!isBuying && managedUsd?.gt(0)):
                    return `${formatAmount(tokenFeeBps, 2, 2, true, "-")}${
                      tokenFeeBps !== undefined && tokenFeeBps.toString().length > 0 ? "%" : ""
                    }`;
                  default:
                    return "";
                }
              }

              return (
                <tr key={token.symbol}>
                  <td>
                    <div className="App-card-title-info">
                      <div className="App-card-title-info-icon">
                        <img src={tokenImage && tokenImage.default} alt={token.symbol} width="40px" />
                      </div>
                      <div className="App-card-title-info-text">
                        <div className="App-card-info-title">{token.name}</div>
                        <div className="App-card-info-subtitle">{token.symbol}</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                      </div>
                    </div>
                  </td>
                  <td>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, tokenInfo.displayDecimals, true)}</td>
                  <td>
                    {isBuying && (
                      <div>
                        <Tooltip
                          handle={
                            amountLeftToDeposit && amountLeftToDeposit.lt(0)
                              ? "$0.00"
                              : `$${formatAmount(amountLeftToDeposit, USD_DECIMALS, 2, true)}`
                          }
                          position="right-bottom"
                          tooltipIconPosition="right"
                          renderContent={() => {
                            return (
                              <>
                                Current Pool Amount: ${formatAmount(managedUsd, USD_DECIMALS, 2, true)} (
                                {formatKeyAmount(tokenInfo, "poolAmount", token.decimals, 2, true)} {token.symbol})
                                <br />
                                <br />
                                Max Pool Capacity: ${formatAmount(tokenInfo.maxUsdmAmount, 18, 0, true)}
                              </>
                            );
                          }}
                        />
                      </div>
                    )}
                    {!isBuying && (
                      <div>
                        {formatKeyAmount(tokenInfo, "availableAmount", token.decimals, 2, true)} {token.symbol} ($
                        {formatAmount(availableAmountUsd, USD_DECIMALS, 2, true)})
                      </div>
                    )}
                  </td>
                  <td>
                    {formatKeyAmount(tokenInfo, "balance", tokenInfo.decimals, 2, true)} {tokenInfo.symbol} ($
                    {formatAmount(balanceUsd, USD_DECIMALS, 2, true)})
                  </td>
                  <td>{renderFees()}</td>
                  <td>
                    <button
                      className={cx("App-button-option action-btn", isBuying ? "buying" : "selling")}
                      onClick={() => selectToken(token)}
                    >
                      {isBuying ? "+LIQ. WITH " + token.symbol : "-LIQ. FOR " + token.symbol}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="token-grid">
          {tokenList.map((token) => {
            let tokenFeeBps;
            if (isBuying) {
              const { feeBasisPoints: feeBps } = getBuyMvlpFromAmount(
                mvlpAmount,
                token.address,
                infoTokens,
                mvlpPrice,
                usdmSupply,
                totalTokenWeights
              );
              tokenFeeBps = feeBps;
            } else {
              const { feeBasisPoints: feeBps } = getSellMvlpToAmount(
                mvlpAmount,
                token.address,
                infoTokens,
                mvlpPrice,
                usdmSupply,
                totalTokenWeights
              );
              tokenFeeBps = feeBps;
            }
            const tokenInfo = getTokenInfo(infoTokens, token.address);
            let managedUsd;
            if (tokenInfo && tokenInfo.managedUsd) {
              managedUsd = tokenInfo.managedUsd;
            }
            let availableAmountUsd;
            if (tokenInfo && tokenInfo.minPrice && tokenInfo.availableAmount) {
              availableAmountUsd = tokenInfo.availableAmount
                .mul(tokenInfo.minPrice)
                .div(expandDecimals(1, token.decimals));
            }
            let balanceUsd;
            if (tokenInfo && tokenInfo.minPrice && tokenInfo.balance) {
              balanceUsd = tokenInfo.balance.mul(tokenInfo.minPrice).div(expandDecimals(1, token.decimals));
            }

            let amountLeftToDeposit;
            if (tokenInfo.maxUsdmAmount && tokenInfo.maxUsdmAmount.gt(0)) {
              amountLeftToDeposit = adjustForDecimals(tokenInfo.maxUsdmAmount, USDM_DECIMALS, USD_DECIMALS).sub(
                tokenInfo.managedUsd
              );
            }
            let isCapReached = tokenInfo.managedAmount?.gt(tokenInfo.maxUsdmAmount);

            var tokenImage = null;

            try {
              tokenImage = require("../../img/ic_" + token.symbol.toLowerCase() + "_40.svg");
            } catch (error) {
              console.error(error);
            }

            function renderFees() {
              switch (true) {
                case (isBuying && isCapReached) || (!isBuying && managedUsd?.lt(1)):
                  return (
                    <Tooltip
                      handle="NA"
                      position="right-bottom"
                      renderContent={() =>
                        `Maximum pool capacity reached for ${tokenInfo.symbol}. Please add +LIQ. with another token for the MVLP`
                      }
                    />
                  );
                case (isBuying && !isCapReached) || (!isBuying && managedUsd?.gt(0)):
                  return `${formatAmount(tokenFeeBps, 2, 2, true, "-")}${
                    tokenFeeBps !== undefined && tokenFeeBps.toString().length > 0 ? "%" : ""
                  }`;
                default:
                  return "";
              }
            }

            return (
              <div className="App-card" key={token.symbol}>
                  <img src={tokenImage && tokenImage.default} alt={token.symbol} width="40px" /><span className="mt-2 mx-1">{token.name}</span>
                <div className="App-card-title">{/* {token.name} */}</div>
                <div className="App-card-divider"></div>
                <div className="App-card-content">
                  <div className="App-card-row">
                    <div className="label">Price</div>
                    <div>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, tokenInfo.displayDecimals, true)}</div>
                  </div>
                  {isBuying && (
                    <div className="App-card-row">
                      <Tooltip
                        className="label"
                        handle="Available"
                        position="left-bottom"
                        renderContent={() => "Available amount to deposit into MVLP."}
                      />
                      <div>
                        <Tooltip
                          handle={amountLeftToDeposit && `$${formatAmount(amountLeftToDeposit, USD_DECIMALS, 2, true)}`}
                          position="right-bottom"
                          tooltipIconPosition="right"
                          renderContent={() => {
                            return (
                              <>
                                Current Pool Amount: ${formatAmount(managedUsd, USD_DECIMALS, 2, true)} (
                                {formatKeyAmount(tokenInfo, "poolAmount", token.decimals, 2, true)} {token.symbol})
                                <br />
                                <br />
                                Maximum Pool Capacity: ${formatAmount(tokenInfo.maxUsdmAmount, 18, 0, true)}
                              </>
                            );
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {!isBuying && (
                    <div className="App-card-row">
                      <Tooltip
                        handle="Available"
                        position="left-bottom"
                        renderContent={() => {
                          return (
                            <>
                              <div>Available amount to withdraw from MVLP.</div>
                              <div>Funds not utilized by current open positions.</div>
                            </>
                          );
                        }}
                      />
                      <div>
                        {formatKeyAmount(tokenInfo, "availableAmount", token.decimals, 2, true)} {token.symbol} ($
                        {formatAmount(availableAmountUsd, USD_DECIMALS, 2, true)})
                      </div>
                    </div>
                  )}

                  <div className="App-card-row">
                    <div className="label">Wallet</div>
                    <div>
                      {formatKeyAmount(tokenInfo, "balance", tokenInfo.decimals, 2, true)} {tokenInfo.symbol} ($
                      {formatAmount(balanceUsd, USD_DECIMALS, 2, true)})
                    </div>
                  </div>
                  <div className="App-card-row">
                    <div className="label">
                      {tokenFeeBps ? (
                        "Fees"
                      ) : (
                        <Tooltip
                          handle={`Fees`}
                          renderContent={() => `Please enter an amount to see fee percentages`}
                        />
                      )}
                    </div>
                    <div>{renderFees()}</div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-options">
                    {isBuying && (
                      <button className="App-button-option App-card-option text-uppercase" onClick={() => selectToken(token)}>
                        +Liq. with {token.symbol}
                      </button>
                    )}
                    {!isBuying && (
                      <button className="App-button-option App-card-option text-uppercase" onClick={() => selectToken(token)}>
                        -liq. for {token.symbol}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* </div> */}
      </div>
    </div>
  );
}
