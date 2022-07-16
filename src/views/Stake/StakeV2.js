import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useWeb3React } from "@web3-react/core";

import Modal from "../../components/Modal/Modal";
import Checkbox from "../../components/Checkbox/Checkbox";
import Tooltip from "../../components/Tooltip/Tooltip";
import Footer from "../../Footer";
import earnedBigIcon from "../../img/earnlogo.svg";
import Vault from "../../abis/Vault.json";
import Reader from "../../abis/Reader.json";
import Vester from "../../abis/Vester.json";
import RewardRouter from "../../abis/RewardRouter.json";
import RewardReader from "../../abis/RewardReader.json";
import Token from "../../abis/Token.json";
import MvlpManager from "../../abis/MvlpManager.json";

import { ethers } from "ethers";
import {
  helperToast,
  bigNumberify,
  fetcher,
  formatAmount,
  formatKeyAmount,
  formatAmountFree,
  getChainName,
  expandDecimals,
  parseValue,
  approveTokens,
  getServerUrl,
  useLocalStorageSerializeKey,
  useChainId,
  MVLP_DECIMALS,
  USD_DECIMALS,
  MVXMVLP_DISPLAY_DECIMALS,
  BASIS_POINTS_DIVISOR,
  POLYGON,
  PLACEHOLDER_ACCOUNT,
  getBalanceAndSupplyData,
  getDepositBalanceData,
  getVestingData,
  getStakingData,
  getProcessedData,
  getPageTitle,
} from "../../Helpers";
import { callContract, useMvxPrice, useTotalMvxStaked, useTotalMvxSupply } from "../../Api";
import { getConstant } from "../../Constants";

import useSWR from "swr";

import { getContract } from "../../Addresses";

import "./StakeV2.css";
import SEO from "../../components/Common/SEO";
import { BREAK } from "graphql";

const { AddressZero } = ethers.constants;

function StakeModal(props) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    active,
    account,
    library,
    stakingTokenSymbol,
    stakingTokenAddress,
    farmAddress,
    rewardRouterAddress,
    stakeMethodName,
    setPendingTxns,
  } = props;
  const [isStaking, setIsStaking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { data: tokenAllowance } = useSWR(
    active && stakingTokenAddress && [active, chainId, stakingTokenAddress, "allowance", account, farmAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  let amount = parseValue(value, 18);
  const needApproval = farmAddress !== AddressZero && tokenAllowance && amount && amount.gt(tokenAllowance);

  const getError = () => {
    if (!amount || amount.eq(0)) {
      return "ENTER AN AMOUNT";
    }
    if (maxAmount && amount.gt(maxAmount)) {
      return "MAX AMOUNT EXCEEDED";
    }
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: stakingTokenAddress,
        spender: farmAddress,
        chainId,
      });
      return;
    }

    setIsStaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());

    callContract(chainId, contract, stakeMethodName, [amount], {
      sentMsg: "Stake submitted!",
      failMsg: "Stake failed.",
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsStaking(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isStaking) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isApproving) {
      return `Approving ${stakingTokenSymbol}...`;
    }
    if (needApproval) {
      return `Approve ${stakingTokenSymbol}`;
    }
    if (isStaking) {
      return "Staking...";
    }
    return "Stake";
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">Stake</div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}>
              Max: {formatAmount(maxAmount, 18, 4, true)}
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input
                type="number"
                placeholder="0.0"
                className="Exchange-swap-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="PositionEditor-token-symbol">{stakingTokenSymbol}</div>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function UnstakeModal(props) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    library,
    unstakingTokenSymbol,
    rewardRouterAddress,
    unstakeMethodName,
    multiplierPointsAmount,
    reservedAmount,
    bonusMvxInFeeMvx,
    setPendingTxns,
  } = props;
  const [isUnstaking, setIsUnstaking] = useState(false);

  let amount = parseValue(value, 18);
  let burnAmount;

  if (
    multiplierPointsAmount &&
    multiplierPointsAmount.gt(0) &&
    amount &&
    amount.gt(0) &&
    bonusMvxInFeeMvx &&
    bonusMvxInFeeMvx.gt(0)
  ) {
    burnAmount = multiplierPointsAmount.mul(amount).div(bonusMvxInFeeMvx);
  }

  const shouldShowReductionAmount = true;
  let rewardReductionBasisPoints;
  if (burnAmount && bonusMvxInFeeMvx) {
    rewardReductionBasisPoints = burnAmount.mul(BASIS_POINTS_DIVISOR).div(bonusMvxInFeeMvx);
  }

  const getError = () => {
    if (!amount) {
      return "ENTER AN AMOUNT";
    }
    if (amount.gt(maxAmount)) {
      return "MAX AMOUNT EXCEEDED";
    }
  };

  const onClickPrimary = () => {
    setIsUnstaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    callContract(chainId, contract, unstakeMethodName, [amount], {
      sentMsg: "Unstake submitted!",
      failMsg: "Unstake failed.",
      successMsg: "Unstake completed!",
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsUnstaking(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isUnstaking) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isUnstaking) {
      return "Unstaking...";
    }
    return "Unstake";
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">Unstake</div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}>
              Max: {formatAmount(maxAmount, 18, 4, true)}
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input
                type="number"
                placeholder="0.0"
                className="Exchange-swap-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="PositionEditor-token-symbol">{unstakingTokenSymbol}</div>
          </div>
        </div>
        {reservedAmount && reservedAmount.gt(0) && (
          <div className="Modal-note">
            You have {formatAmount(reservedAmount, 18, 2, true)} tokens reserved for vesting.
          </div>
        )}
        {burnAmount && burnAmount.gt(0) && rewardReductionBasisPoints && rewardReductionBasisPoints.gt(0) && (
          <div className="Modal-note">
            Unstaking will burn&nbsp;
            <a href=" https://docs.metavault.trade/rewards" target="_blank" rel="noopener noreferrer">
              {formatAmount(burnAmount, 18, 4, true)} Multiplier Points
            </a>
            .&nbsp;
            {shouldShowReductionAmount && (
              <span>Boost %: -{formatAmount(rewardReductionBasisPoints, 2, 2)}%.</span>
            )}
          </div>
        )}
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function VesterDepositModal(props) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    balance,
    escrowedBalance,
    averageStakedAmount,
    maxVestableAmount,
    library,
    stakeTokenLabel,
    reserveAmount,
    maxReserveAmount,
    vesterAddress,
    setPendingTxns,
  } = props;
  const [isDepositing, setIsDepositing] = useState(false);

  let amount = parseValue(value, 18);

  let nextReserveAmount = reserveAmount;

  let nextDepositAmount = escrowedBalance;
  if (amount) {
    nextDepositAmount = escrowedBalance.add(amount);
  }

  let additionalReserveAmount = bigNumberify(0);
  if (amount && averageStakedAmount && maxVestableAmount && maxVestableAmount.gt(0)) {
    nextReserveAmount = nextDepositAmount.mul(averageStakedAmount).div(maxVestableAmount);
    if (nextReserveAmount.gt(reserveAmount)) {
      additionalReserveAmount = nextReserveAmount.sub(reserveAmount);
    }
  }

  const getError = () => {
    if (!amount || amount.eq(0)) {
      return "ENTER AN AMOUNT";
    }
    if (maxAmount && amount.gt(maxAmount)) {
      return "MAX AMOUNT EXCEEDED";
    }
    if (nextReserveAmount.gt(maxReserveAmount)) {
      return "INSUFFICIENT STAKED TOKENS";
    }
  };

  const onClickPrimary = () => {
    setIsDepositing(true);
    const contract = new ethers.Contract(vesterAddress, Vester.abi, library.getSigner());

    callContract(chainId, contract, "deposit", [amount], {
      sentMsg: "Deposit submitted!",
      failMsg: "Deposit failed!",
      successMsg: "Deposited!",
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsDepositing(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isDepositing) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isDepositing) {
      return "Depositing...";
    }
    return "Deposit";
  };

  return (
    <SEO title={getPageTitle("Earn")}>
      <div className="StakeModal">
        <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title} className="non-scrollable">
          <div className="Exchange-swap-section">
            <div className="Exchange-swap-section-top">
              <div className="muted">
                <div className="Exchange-swap-usd">Deposit</div>
              </div>
              <div
                className="muted align-right clickable"
                onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}
              >
                Max: {formatAmount(maxAmount, 18, 4, true)}
              </div>
            </div>
            <div className="Exchange-swap-section-bottom">
              <div>
                <input
                  type="number"
                  placeholder="0.0"
                  className="Exchange-swap-input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <div className="PositionEditor-token-symbol">esMVX</div>
            </div>
          </div>
          <div className="VesterDepositModal-info-rows">
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Wallet</div>
              <div className="align-right">{formatAmount(balance, 18, 2, true)} esMVX</div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Vault Capacity</div>
              <div className="align-right">
                <Tooltip
                  handle={`${formatAmount(nextDepositAmount, 18, 2, true)} / ${formatAmount(
                    maxVestableAmount,
                    18,
                    2,
                    true
                  )}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <>
                        Vault Capacity for your Account
                        <br />
                        <br />
                        Deposited: {formatAmount(escrowedBalance, 18, 2, true)} esMVX
                        <br />
                        Max Capacity: {formatAmount(maxVestableAmount, 18, 2, true)} esMVX
                        <br />
                      </>
                    );
                  }}
                />
              </div>
            </div>
          </div>
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">Reserve Amount</div>
            <div className="align-right">
              <Tooltip
                handle={`${formatAmount(
                  reserveAmount && reserveAmount.gte(additionalReserveAmount) ? reserveAmount : additionalReserveAmount,
                  18,
                  2,
                  true
                )} / ${formatAmount(maxReserveAmount, 18, 2, true)}`}
                position="right-bottom"
                renderContent={() => {
                  return (
                    <>
                      Current Reserved: {formatAmount(reserveAmount, 18, 2, true)}
                      <br />
                      Additional reserve required: {formatAmount(additionalReserveAmount, 18, 2, true)}
                      <br />
                      {amount && nextReserveAmount.gt(maxReserveAmount) && (
                        <div>
                          <br />
                          You need a total of at least {formatAmount(nextReserveAmount, 18, 2, true)} {stakeTokenLabel}{" "}
                          to vest {formatAmount(amount, 18, 2, true)} esMVX.
                        </div>
                      )}
                    </>
                  );
                }}
              />
            </div>
          </div>
          <div className="Exchange-swap-button-container">
            <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
              {getPrimaryText()}
            </button>
          </div>
        </Modal>
      </div>
    </SEO>
  );
}

function VesterWithdrawModal(props) {
  const { isVisible, setIsVisible, chainId, title, library, vesterAddress, setPendingTxns } = props;
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const onClickPrimary = () => {
    setIsWithdrawing(true);
    const contract = new ethers.Contract(vesterAddress, Vester.abi, library.getSigner());

    callContract(chainId, contract, "withdraw", [], {
      sentMsg: "Withdraw submitted.",
      failMsg: "Withdraw failed.",
      successMsg: "Withdrawn!",
      setPendingTxns,
    })
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsWithdrawing(false);
      });
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div>
        This will halt vesting and retrieve all tokens from reserve.
          <br />
          <br />
          Unvested MVX tokens will stay as MVX tokens.
          <br />
          <br />
          For claiming unvested MVX tokens without withdrawing, use the "CLAIM" button under the "Total Earnings" section.
          <br />
          <br />
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={isWithdrawing}>
            {!isWithdrawing && "Confirm Withdraw"}
            {isWithdrawing && "Confirming..."}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function CompoundModal(props) {
  const {
    isVisible,
    setIsVisible,
    rewardRouterAddress,
    active,
    account,
    library,
    chainId,
    setPendingTxns,
    totalVesterRewards,
    nativeTokenSymbol,
    wrappedTokenSymbol,
  } = props;
  const [isCompounding, setIsCompounding] = useState(false);
  const [shouldClaimMvx, setShouldClaimMvx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-mvx"],
    true
  );
  const [shouldStakeMvx, setShouldStakeMvx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-stake-mvx"],
    true
  );
  const [shouldClaimEsMvx, setShouldClaimEsMvx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-es-mvx"],
    true
  );
  const [shouldStakeEsMvx, setShouldStakeEsMvx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-stake-es-mvx"],
    true
  );
  const [shouldStakeMultiplierPoints, setShouldStakeMultiplierPoints] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-stake-multiplier-points"],
    true
  );
  const [shouldClaimWeth, setShouldClaimWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-weth"],
    true
  );
  const [shouldConvertWeth, setShouldConvertWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-convert-weth"],
    true
  );

  const mvxAddress = getContract(chainId, "MVX");
  const stakedMvxTrackerAddress = getContract(chainId, "StakedMvxTracker");

  const [isApproving, setIsApproving] = useState(false);

  const { data: tokenAllowance } = useSWR(
    active && [active, chainId, mvxAddress, "allowance", account, stakedMvxTrackerAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  const needApproval = shouldStakeMvx && tokenAllowance && totalVesterRewards && totalVesterRewards.gt(tokenAllowance);

  const isPrimaryEnabled = () => {
    return !isCompounding && !isApproving && !isCompounding;
  };

  const getPrimaryText = () => {
    if (isApproving) {
      return `Approving MVX...`;
    }
    if (needApproval) {
      return `Approve MVX`;
    }
    if (isCompounding) {
      return "Compounding...";
    }
    return "Compound";
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: mvxAddress,
        spender: stakedMvxTrackerAddress,
        chainId,
      });
      return;
    }

    setIsCompounding(true);

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    callContract(
      chainId,
      contract,
      "handleRewards",
      [
        shouldClaimMvx || shouldStakeMvx,
        shouldStakeMvx,
        shouldClaimEsMvx || shouldStakeEsMvx,
        shouldStakeEsMvx,
        shouldStakeMultiplierPoints,
        shouldClaimWeth || shouldConvertWeth,
        shouldConvertWeth,
      ],
      {
        sentMsg: "Compound submitted!",
        failMsg: "Compound failed.",
        successMsg: "Compound completed!",
        setPendingTxns,
      }
    )
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsCompounding(false);
      });
  };

  const toggleShouldStakeMvx = (value) => {
    if (value) {
      setShouldClaimMvx(true);
    }
    setShouldStakeMvx(value);
  };

  const toggleShouldStakeEsMvx = (value) => {
    if (value) {
      setShouldClaimEsMvx(true);
    }
    setShouldStakeEsMvx(value);
  };

  const toggleConvertWeth = (value) => {
    if (value) {
      setShouldClaimWeth(true);
    }
    setShouldConvertWeth(value);
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label="Compound Rewards">
        <div className="CompoundModal-menu">
          <div>
            <Checkbox isChecked={shouldStakeMultiplierPoints} setIsChecked={setShouldStakeMultiplierPoints}>
              Stake Multiplier Points
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimMvx} setIsChecked={setShouldClaimMvx} disabled={shouldStakeMvx}>
              Claim unvested MVX
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldStakeMvx} setIsChecked={toggleShouldStakeMvx}>
              Stake claimed MVX
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimEsMvx} setIsChecked={setShouldClaimEsMvx} disabled={shouldStakeEsMvx}>
              Claim esMVX Rewards
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldStakeEsMvx} setIsChecked={toggleShouldStakeEsMvx}>
              Stake claimed esMVX
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimWeth} setIsChecked={setShouldClaimWeth} disabled={shouldConvertWeth}>
              Claim {wrappedTokenSymbol} Rewards
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldConvertWeth} setIsChecked={toggleConvertWeth}>
              Convert {wrappedTokenSymbol} to {nativeTokenSymbol}
            </Checkbox>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button text-uppercase" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ClaimModal(props) {
  const {
    isVisible,
    setIsVisible,
    rewardRouterAddress,
    library,
    chainId,
    setPendingTxns,
    nativeTokenSymbol,
    wrappedTokenSymbol,
  } = props;
  const [isClaiming, setIsClaiming] = useState(false);
  const [shouldClaimMvx, setShouldClaimMvx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-claim-mvx"],
    true
  );
  const [shouldClaimEsMvx, setShouldClaimEsMvx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-claim-es-mvx"],
    true
  );
  const [shouldClaimWeth, setShouldClaimWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-claim-weth"],
    true
  );
  const [shouldConvertWeth, setShouldConvertWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-convert-weth"],
    true
  );

  const isPrimaryEnabled = () => {
    return !isClaiming;
  };

  const getPrimaryText = () => {
    if (isClaiming) {
      return `CLAIMING...`;
    }
    return "CLAIM";
  };

  const onClickPrimary = () => {
    setIsClaiming(true);

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    callContract(
      chainId,
      contract,
      "handleRewards",
      [
        shouldClaimMvx,
        false, // shouldStakeMvx
        shouldClaimEsMvx,
        false, // shouldStakeEsMvx
        false, // shouldStakeMultiplierPoints
        shouldClaimWeth,
        shouldConvertWeth,
      ],
      {
        sentMsg: "Claim submitted.",
        failMsg: "Claim failed.",
        successMsg: "Claim completed!",
        setPendingTxns,
      }
    )
      .then(async (res) => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsClaiming(false);
      });
  };

  const toggleConvertWeth = (value) => {
    if (value) {
      setShouldClaimWeth(true);
    }
    setShouldConvertWeth(value);
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label="Claim Rewards">
        <div className="CompoundModal-menu">
          <div>
            <Checkbox isChecked={shouldClaimMvx} setIsChecked={setShouldClaimMvx}>
              Claim unvested MVX
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimEsMvx} setIsChecked={setShouldClaimEsMvx}>
              Claim esMVX Rewards
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimWeth} setIsChecked={setShouldClaimWeth} disabled={shouldConvertWeth}>
              Claim {wrappedTokenSymbol} Rewards
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldConvertWeth} setIsChecked={toggleConvertWeth}>
              Convert {wrappedTokenSymbol} to {nativeTokenSymbol}
            </Checkbox>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function StakeV2({ setPendingTxns, connectWallet }) {
  const { active, library, account } = useWeb3React();
  const { chainId } = useChainId();

  const chainName = getChainName(chainId);

  const hasInsurance = false;

  const [isStakeModalVisible, setIsStakeModalVisible] = useState(false);
  const [stakeModalTitle, setStakeModalTitle] = useState("");
  const [stakeModalMaxAmount, setStakeModalMaxAmount] = useState(undefined);
  const [stakeValue, setStakeValue] = useState("");
  const [stakingTokenSymbol, setStakingTokenSymbol] = useState("");
  const [stakingTokenAddress, setStakingTokenAddress] = useState("");
  const [stakingFarmAddress, setStakingFarmAddress] = useState("");
  const [stakeMethodName, setStakeMethodName] = useState("");

  const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false);
  const [unstakeModalTitle, setUnstakeModalTitle] = useState("");
  const [unstakeModalMaxAmount, setUnstakeModalMaxAmount] = useState(undefined);
  const [unstakeModalReservedAmount, setUnstakeModalReservedAmount] = useState(undefined);
  const [unstakeValue, setUnstakeValue] = useState("");
  const [unstakingTokenSymbol, setUnstakingTokenSymbol] = useState("");
  const [unstakeMethodName, setUnstakeMethodName] = useState("");

  const [isVesterDepositModalVisible, setIsVesterDepositModalVisible] = useState(false);
  const [vesterDepositTitle, setVesterDepositTitle] = useState("");
  const [vesterDepositStakeTokenLabel, setVesterDepositStakeTokenLabel] = useState("");
  const [vesterDepositMaxAmount, setVesterDepositMaxAmount] = useState("");
  const [vesterDepositBalance, setVesterDepositBalance] = useState("");
  const [vesterDepositEscrowedBalance, setVesterDepositEscrowedBalance] = useState("");
  const [vesterDepositAverageStakedAmount, setVesterDepositAverageStakedAmount] = useState("");
  const [vesterDepositMaxVestableAmount, setVesterDepositMaxVestableAmount] = useState("");
  const [vesterDepositValue, setVesterDepositValue] = useState("");
  const [vesterDepositReserveAmount, setVesterDepositReserveAmount] = useState("");
  const [vesterDepositMaxReserveAmount, setVesterDepositMaxReserveAmount] = useState("");
  const [vesterDepositAddress, setVesterDepositAddress] = useState("");

  const [isVesterWithdrawModalVisible, setIsVesterWithdrawModalVisible] = useState(false);
  const [vesterWithdrawTitle, setVesterWithdrawTitle] = useState(false);
  const [vesterWithdrawAddress, setVesterWithdrawAddress] = useState("");

  const [isCompoundModalVisible, setIsCompoundModalVisible] = useState(false);
  const [isClaimModalVisible, setIsClaimModalVisible] = useState(false);

  const rewardRouterAddress = getContract(chainId, "RewardRouter");
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

  const stakedMvxDistributorAddress = getContract(chainId, "StakedMvxDistributor");
  const stakedMvlpDistributorAddress = getContract(chainId, "StakedMvlpDistributor");

  const mvxVesterAddress = getContract(chainId, "MvxVester");
  const mvlpVesterAddress = getContract(chainId, "MvlpVester");

  const vesterAddresses = [mvxVesterAddress, mvlpVesterAddress];

  const excludedEsMvxAccounts = [stakedMvxDistributorAddress, stakedMvlpDistributorAddress];

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const wrappedTokenSymbol = getConstant(chainId, "wrappedTokenSymbol");

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
    [
      `StakeV2:walletBalances:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: fetcher(library, Reader, [walletTokens]),
    }
  );

  const { data: depositBalances } = useSWR(
    [
      `StakeV2:depositBalances:${active}`,
      chainId,
      rewardReaderAddress,
      "getDepositBalances",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: fetcher(library, RewardReader, [depositTokens, rewardTrackersForDepositBalances]),
    }
  );

  const { data: stakingInfo } = useSWR(
    [`StakeV2:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, RewardReader, [rewardTrackersForStakingInfo]),
    }
  );

  const { data: stakedMvxSupply } = useSWR(
    [`StakeV2:stakedMvxSupply:${active}`, chainId, mvxAddress, "balanceOf", stakedMvxTrackerAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  const { data: aums } = useSWR([`StakeV2:getAums:${active}`, chainId, mvlpManagerAddress, "getAums"], {
    fetcher: fetcher(library, MvlpManager),
  });

  const { data: nativeTokenPrice } = useSWR(
    [`StakeV2:nativeTokenPrice:${active}`, chainId, vaultAddress, "getMinPrice", nativeTokenAddress],
    {
      fetcher: fetcher(library, Vault),
    }
  );

  const { data: esMvxSupply } = useSWR(
    [`StakeV2:esMvxSupply:${active}`, chainId, readerAddress, "getTokenSupply", esMvxAddress],
    {
      fetcher: fetcher(library, Reader, [excludedEsMvxAccounts]),
    }
  );

  const { data: vestingInfo } = useSWR(
    [`StakeV2:vestingInfo:${active}`, chainId, readerAddress, "getVestingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, Reader, [vesterAddresses]),
    }
  );

  const { mvxPrice } = useMvxPrice(chainId, { polygon: chainId === POLYGON ? library : undefined }, active);

  let { total: totalMvxSupply } = useTotalMvxSupply();

  let { polygon: polygonMvxStaked, total: totalMvxStaked } = useTotalMvxStaked();

  let { total: mvxSupply } = useTotalMvxSupply();

  const isMvxTransferEnabled = true;

  let esMvxSupplyUsd;
  if (esMvxSupply && mvxPrice) {
    esMvxSupplyUsd = esMvxSupply.mul(mvxPrice).div(expandDecimals(1, 18));
  }

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

  let hasMultiplierPoints = false;
  let multiplierPointsAmount;
  if (processedData && processedData.bonusMvxTrackerRewards && processedData.bnMvxInFeeMvx) {
    multiplierPointsAmount = processedData.bonusMvxTrackerRewards.add(processedData.bnMvxInFeeMvx);
    if (multiplierPointsAmount.gt(0)) {
      hasMultiplierPoints = true;
    }
  }
  let totalRewardTokens;
  if (processedData && processedData.bnMvxInFeeMvx && processedData.bonusMvxInFeeMvx) {
    totalRewardTokens = processedData.bnMvxInFeeMvx.add(processedData.bonusMvxInFeeMvx);
  }

  let totalRewardTokensAndMvlp;
  if (totalRewardTokens && processedData && processedData.mvlpBalance) {
    totalRewardTokensAndMvlp = totalRewardTokens.add(processedData.mvlpBalance);
  }

  const bonusMvxInFeeMvx = processedData ? processedData.bonusMvxInFeeMvx : undefined;

  let stakedMvxSupplyUsd;
  if (!totalMvxStaked.isZero() && mvxPrice) {
    stakedMvxSupplyUsd = totalMvxStaked.mul(mvxPrice).div(expandDecimals(1, 18));
  }

  let totalSupplyUsd;
  if (totalMvxSupply && !totalMvxSupply.isZero() && mvxPrice) {
    totalSupplyUsd = totalMvxSupply.mul(mvxPrice).div(expandDecimals(1, 18));
  }

  let maxUnstakeableMvx = bigNumberify(0);
  if (
    totalRewardTokens &&
    vestingData &&
    vestingData.mvxVesterPairAmount &&
    multiplierPointsAmount &&
    processedData.bonusMvxInFeeMvx
  ) {
    const availableTokens = totalRewardTokens.sub(vestingData.mvxVesterPairAmount);
    const stakedTokens = processedData.bonusMvxInFeeMvx;
    const divisor = multiplierPointsAmount.add(stakedTokens);
    if (divisor.gt(0)) {
      maxUnstakeableMvx = availableTokens.mul(stakedTokens).div(divisor);
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const showStakeMvxModal = () => {
    if (!isMvxTransferEnabled) {
      helperToast.error("MVX transfers not yet enabled");
      return;
    }

    setIsStakeModalVisible(true);
    setStakeModalTitle("Stake MVX");
    setStakeModalMaxAmount(processedData.mvxBalance);
    setStakeValue("");
    setStakingTokenSymbol("MVX");
    setStakingTokenAddress(mvxAddress);
    setStakingFarmAddress(stakedMvxTrackerAddress);
    setStakeMethodName("stakeMvx");
  };

  const showStakeEsMvxModal = () => {
    setIsStakeModalVisible(true);
    setStakeModalTitle("Stake esMVX");
    setStakeModalMaxAmount(processedData.esMvxBalance);
    setStakeValue("");
    setStakingTokenSymbol("esMVX");
    setStakingTokenAddress(esMvxAddress);
    setStakingFarmAddress(AddressZero);
    setStakeMethodName("stakeEsMvx");
  };

  const showMvxVesterDepositModal = () => {
    let remainingVestableAmount = vestingData.mvxVester.maxVestableAmount.sub(vestingData.mvxVester.vestedAmount);
    if (processedData.esMvxBalance.lt(remainingVestableAmount)) {
      remainingVestableAmount = processedData.esMvxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle("MVX Vault");
    setVesterDepositStakeTokenLabel("staked MVX + esMVX + Multiplier Points");
    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData.esMvxBalance);
    setVesterDepositEscrowedBalance(vestingData.mvxVester.escrowedBalance);
    setVesterDepositMaxVestableAmount(vestingData.mvxVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData.mvxVester.averageStakedAmount);
    setVesterDepositReserveAmount(vestingData.mvxVester.pairAmount);
    setVesterDepositMaxReserveAmount(totalRewardTokens);
    setVesterDepositValue("");
    setVesterDepositAddress(mvxVesterAddress);
  };

  const showMvlpVesterDepositModal = () => {
    let remainingVestableAmount = vestingData.mvlpVester.maxVestableAmount.sub(vestingData.mvlpVester.vestedAmount);
    if (processedData.esMvxBalance.lt(remainingVestableAmount)) {
      remainingVestableAmount = processedData.esMvxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle("MVLP Vault");
    setVesterDepositStakeTokenLabel("staked MVLP");
    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData.esMvxBalance);
    setVesterDepositEscrowedBalance(vestingData.mvlpVester.escrowedBalance);
    setVesterDepositMaxVestableAmount(vestingData.mvlpVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData.mvlpVester.averageStakedAmount);
    setVesterDepositReserveAmount(vestingData.mvlpVester.pairAmount);
    setVesterDepositMaxReserveAmount(processedData.mvlpBalance);
    setVesterDepositValue("");
    setVesterDepositAddress(mvlpVesterAddress);
  };

  const showMvxVesterWithdrawModal = () => {
    if (!vestingData || !vestingData.mvxVesterVestedAmount || vestingData.mvxVesterVestedAmount.eq(0)) {
      helperToast.error("You have not deposited any tokens for vesting.");
      return;
    }

    setIsVesterWithdrawModalVisible(true);
    setVesterWithdrawTitle("Withdraw from MVX Vault");
    setVesterWithdrawAddress(mvxVesterAddress);
  };

  const showMvlpVesterWithdrawModal = () => {
    if (!vestingData || !vestingData.mvlpVesterVestedAmount || vestingData.mvlpVesterVestedAmount.eq(0)) {
      helperToast.error("You have not deposited any tokens for vesting.");
      return;
    }

    setIsVesterWithdrawModalVisible(true);
    setVesterWithdrawTitle("Withdraw from MVLP Vault");
    setVesterWithdrawAddress(mvlpVesterAddress);
  };

  const showUnstakeMvxModal = () => {
    if (!isMvxTransferEnabled) {
      helperToast.error("MVX transfers not yet enabled");
      return;
    }
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle("Unstake MVX");
    let maxAmount = processedData.mvxInStakedMvx;
    if (
      processedData.mvxInStakedMvx &&
      vestingData &&
      vestingData.mvxVesterPairAmount.gt(0) &&
      maxUnstakeableMvx &&
      maxUnstakeableMvx.lt(processedData.mvxInStakedMvx)
    ) {
      maxAmount = maxUnstakeableMvx;
    }
    setUnstakeModalMaxAmount(maxAmount);
    setUnstakeModalReservedAmount(vestingData.mvxVesterPairAmount);
    setUnstakeValue("");
    setUnstakingTokenSymbol("MVX");
    setUnstakeMethodName("unstakeMvx");
  };

  const showUnstakeEsMvxModal = () => {
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle("Unstake esMVX");
    let maxAmount = processedData.esMvxInStakedMvx;
    if (
      processedData.esMvxInStakedMvx &&
      vestingData &&
      vestingData.mvxVesterPairAmount.gt(0) &&
      maxUnstakeableMvx &&
      maxUnstakeableMvx.lt(processedData.esMvxInStakedMvx)
    ) {
      maxAmount = maxUnstakeableMvx;
    }
    setUnstakeModalMaxAmount(maxAmount);
    setUnstakeModalReservedAmount(vestingData.mvxVesterPairAmount);
    setUnstakeValue("");
    setUnstakingTokenSymbol("esMVX");
    setUnstakeMethodName("unstakeEsMvx");
  };

  const renderMultiplierPointsLabel = useCallback(() => {
    return "Multiplier Points APR";
  }, []);

  const renderMultiplierPointsValue = useCallback(() => {
    return (
      <Tooltip
        handle={`100.00%`}
        position="right-bottom"
        renderContent={() => {
          return (
            <>
              Boost your rewards with Multiplier Points.&nbsp;
              <a
                href=" https://docs.metavault.trade/rewards#multiplier-points"
                rel="noreferrer"
                target="_blank"
                className="text-white"
              >
                More info
              </a>
              .
            </>
          );
        }}
      />
    );
  }, []);

  let earnMsg;
  if (totalRewardTokensAndMvlp && totalRewardTokensAndMvlp.gt(0)) {
    let mvxAmountStr;
    if (processedData.mvxInStakedMvx && processedData.mvxInStakedMvx.gt(0)) {
      mvxAmountStr = formatAmount(processedData.mvxInStakedMvx, 18, 2, true) + " MVX";
    }
    let esMvxAmountStr;
    if (processedData.esMvxInStakedMvx && processedData.esMvxInStakedMvx.gt(0)) {
      esMvxAmountStr = formatAmount(processedData.esMvxInStakedMvx, 18, 2, true) + " esMVX";
    }
    let mpAmountStr;
    if (processedData.bonusMvxInFeeMvx && processedData.bnMvxInFeeMvx.gt(0)) {
      mpAmountStr = formatAmount(processedData.bnMvxInFeeMvx, 18, 2, true) + " MP";
    }
    let mvlpStr;
    if (processedData.mvlpBalance && processedData.mvlpBalance.gt(0)) {
      mvlpStr = formatAmount(processedData.mvlpBalance, 18, 2, true) + " MVLP";
    }
    const amountStr = [mvxAmountStr, esMvxAmountStr, mpAmountStr, mvlpStr].filter((s) => s).join(", ");
    earnMsg = (
      <div>
        You earn {nativeTokenSymbol} rewards with {formatAmount(totalRewardTokensAndMvlp, 18, 2, true)} tokens.
        <br />
        Tokens: {amountStr}.
      </div>
    );
  }

  return (
    <div className="StakeV2 Page page-layout">
      <StakeModal
        isVisible={isStakeModalVisible}
        setIsVisible={setIsStakeModalVisible}
        chainId={chainId}
        title={stakeModalTitle}
        maxAmount={stakeModalMaxAmount}
        value={stakeValue}
        setValue={setStakeValue}
        active={active}
        account={account}
        library={library}
        stakingTokenSymbol={stakingTokenSymbol}
        stakingTokenAddress={stakingTokenAddress}
        farmAddress={stakingFarmAddress}
        rewardRouterAddress={rewardRouterAddress}
        stakeMethodName={stakeMethodName}
        hasMultiplierPoints={hasMultiplierPoints}
        setPendingTxns={setPendingTxns}
        nativeTokenSymbol={nativeTokenSymbol}
        wrappedTokenSymbol={wrappedTokenSymbol}
      />
      <UnstakeModal
        setPendingTxns={setPendingTxns}
        isVisible={isUnstakeModalVisible}
        setIsVisible={setIsUnstakeModalVisible}
        chainId={chainId}
        title={unstakeModalTitle}
        maxAmount={unstakeModalMaxAmount}
        reservedAmount={unstakeModalReservedAmount}
        value={unstakeValue}
        setValue={setUnstakeValue}
        library={library}
        unstakingTokenSymbol={unstakingTokenSymbol}
        rewardRouterAddress={rewardRouterAddress}
        unstakeMethodName={unstakeMethodName}
        multiplierPointsAmount={multiplierPointsAmount}
        bonusMvxInFeeMvx={bonusMvxInFeeMvx}
      />
      <VesterDepositModal
        isVisible={isVesterDepositModalVisible}
        setIsVisible={setIsVesterDepositModalVisible}
        chainId={chainId}
        title={vesterDepositTitle}
        stakeTokenLabel={vesterDepositStakeTokenLabel}
        maxAmount={vesterDepositMaxAmount}
        balance={vesterDepositBalance}
        escrowedBalance={vesterDepositEscrowedBalance}
        averageStakedAmount={vesterDepositAverageStakedAmount}
        maxVestableAmount={vesterDepositMaxVestableAmount}
        reserveAmount={vesterDepositReserveAmount}
        maxReserveAmount={vesterDepositMaxReserveAmount}
        value={vesterDepositValue}
        setValue={setVesterDepositValue}
        library={library}
        vesterAddress={vesterDepositAddress}
        setPendingTxns={setPendingTxns}
      />
      <VesterWithdrawModal
        isVisible={isVesterWithdrawModalVisible}
        setIsVisible={setIsVesterWithdrawModalVisible}
        vesterAddress={vesterWithdrawAddress}
        chainId={chainId}
        title={vesterWithdrawTitle}
        library={library}
        setPendingTxns={setPendingTxns}
      />
      <CompoundModal
        active={active}
        account={account}
        setPendingTxns={setPendingTxns}
        isVisible={isCompoundModalVisible}
        setIsVisible={setIsCompoundModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        totalVesterRewards={processedData.totalVesterRewards}
        wrappedTokenSymbol={wrappedTokenSymbol}
        nativeTokenSymbol={nativeTokenSymbol}
        library={library}
        chainId={chainId}
      />
      <ClaimModal
        active={active}
        account={account}
        setPendingTxns={setPendingTxns}
        isVisible={isClaimModalVisible}
        setIsVisible={setIsClaimModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        totalVesterRewards={processedData.totalVesterRewards}
        wrappedTokenSymbol={wrappedTokenSymbol}
        nativeTokenSymbol={nativeTokenSymbol}
        library={library}
        chainId={chainId}
      />
      <div className="Page-title-section marginbottommedia">
        {/*     <div className="section-title-block">
            <div className="section-title-icon section-title-icontablet">
                <img src={earnedBigIcon} alt="statsBigIcon" />
              </div>
              <div className="Page-title">EARN</div>
        <div className=" Page-description">

          Stake{" "}
          <a href="https://docs.metavault.trade/tokenomics" target="_blank" rel="noopener noreferrer" className="ahreftextcolor">
            MVX
          </a>{" "}
          and{" "}
          <a href="https://docs.metavault.trade/mvlp" target="_blank" rel="noopener noreferrer" className="ahreftextcolor">
            MVLP
          </a>{" "}
          to earn rewards.
        </div>
        </div> */}

        <div className="section-title-block sectionsmallscreen">
          <div className="section-title-icon section-title-icontablet section-title-iconsmall">
            <img src={earnedBigIcon} alt="statsBigIcon" />
          </div>
          <div className="section-title-content Stake-cardsmobile ">
            <div className="Page-title">EARN</div>
            <div className="Page-description">
              Stake{" "}
              <a
                href="https://docs.metavault.trade/tokenomics"
                className="textcolorwhite"
                target="_blank"
                rel="noopener noreferrer"
              >
                MVX
              </a>{" "}
              or{" "}
              <a
                href="https://docs.metavault.trade/mvlp"
                className="textcolorwhite"
                target="_blank"
                rel="noopener noreferrer"
              >
                + Liq
              </a>{" "}
              to earn rewards and platform fees.
            </div>
            {earnMsg && <div className="Page-description">{earnMsg}</div>}
          </div>
        </div>

        {/*         {earnMsg && <div className="Page-description">{earnMsg}</div>} */}
      </div>
      <div className="StakeV2-content mb-5">
        <div className="StakeV2-cards">
          <div className="App-card StakeV2-mvx-card">
            <div className="App-card-title">MVX</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">MVX Price</div>
                <div>
                  {!mvxPrice && "..."}
                  {mvxPrice && (
                    <Tooltip
                      position="right-bottom"
                      className="nowrap"
                      handle={"$" + formatAmount(mvxPrice, USD_DECIMALS, MVXMVLP_DISPLAY_DECIMALS, true)}
                      renderContent={() => <>Price on Polygon: ${formatAmount(mvxPrice, USD_DECIMALS, MVXMVLP_DISPLAY_DECIMALS, true)}</>}
                    />
                  )}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">esMVX Wallet</div>
                <div>
                  {formatKeyAmount(processedData, "esMvxBalance", 18, 2, true)} esMVX ($
                  {formatKeyAmount(processedData, "esMvxBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">esMVX Staked</div>
                <div>
                  {formatKeyAmount(processedData, "esMvxInStakedMvx", 18, 2, true)} esMVX ($
                  {formatKeyAmount(processedData, "esMvxInStakedMvxUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">MVX Wallet</div>
                <div>
                  {formatKeyAmount(processedData, "mvxBalance", 18, 2, true)} MVX ($
                  {formatKeyAmount(processedData, "mvxBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label"> MVX Staked</div>
                <div>
                  {formatKeyAmount(processedData, "mvxInStakedMvx", 18, 2, true)} MVX ($
                  {formatKeyAmount(processedData, "mvxInStakedMvxUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>

              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">APR</div>
                <div>
                  <Tooltip
                    handle={`${formatKeyAmount(processedData, "mvxAprTotalWithBoost", 2, 2, true)}%`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <div className="Tooltip-row">
                            <span className="label text-white">Escrowed MVX APR</span>
                            <span>{formatKeyAmount(processedData, "mvxAprForEsMvx", 2, 2, true)}%</span>
                          </div>

                          {(!processedData.mvxBoostAprForNativeToken ||
                            processedData.mvxBoostAprForNativeToken.eq(0)) && (
                            <div className="mt-2 mb-2">
                              <div className="Tooltip-row">
                                <span className="label text-white">{nativeTokenSymbol} Base APR</span>
                                <span>{formatKeyAmount(processedData, "mvxAprForNativeToken", 2, 2, true)}%</span>
                              </div>
                              <div className="Tooltip-row">
                                <span className="label text-white">{nativeTokenSymbol} Boosted APR</span>
                                <span>{formatKeyAmount(processedData, "mvxBoostAprForNativeToken", 2, 2, true)}%</span>
                              </div>
                              <div className="Tooltip-row">
                                <span className="label text-white">{nativeTokenSymbol} Total APR</span>
                                <span>
                                  {formatKeyAmount(processedData, "mvxAprForNativeTokenWithBoost", 2, 2, true)}%
                                </span>
                              </div>
                              <br />
                              <div className="text-white">The Boosted APR is from your staked Multiplier Points.</div>
                            </div>
                          )}
                          {processedData.mvxBoostAprForNativeToken && processedData.mvxBoostAprForNativeToken.gt(0) && (
                            <div>
                              <br />
                              <div className="Tooltip-row">
                                <span className="label text-white">{nativeTokenSymbol} Base APR</span>
                                <span>{formatKeyAmount(processedData, "mvxAprForNativeToken", 2, 2, true)}%</span>
                              </div>
                              <div className="Tooltip-row">
                                <span className="label text-white">{nativeTokenSymbol} Boosted APR</span>
                                <span>{formatKeyAmount(processedData, "mvxBoostAprForNativeToken", 2, 2, true)}%</span>
                              </div>
                              <div className="Tooltip-row">
                                <span className="label text-white">{nativeTokenSymbol} Total APR</span>
                                <span>
                                  {formatKeyAmount(processedData, "mvxAprForNativeTokenWithBoost", 2, 2, true)}%
                                </span>
                              </div>
                              <br />
                              <div className="text-white">The Boosted APR is from your staked Multiplier Points.</div>
                            </div>
                          )}
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Rewards</div>
                <div>
                  <Tooltip
                    handle={`$${formatKeyAmount(processedData, "totalMvxRewardsUsd", USD_DECIMALS, 2, true)}`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <div className="Tooltip-row">
                            <span className="label text-white">
                              {nativeTokenSymbol} ({wrappedTokenSymbol})
                            </span>
                            <span>
                              {formatKeyAmount(processedData, "feeMvxTrackerRewards", 18, 4)} ($
                              {formatKeyAmount(processedData, "feeMvxTrackerRewardsUsd", USD_DECIMALS, 2, true)})
                            </span>
                          </div>
                          <div className="Tooltip-row">
                            <span className="label text-white">Escrowed MVX</span>
                            <span>
                              {formatKeyAmount(processedData, "stakedMvxTrackerRewards", 18, 4)} ($
                              {formatKeyAmount(processedData, "stakedMvxTrackerRewardsUsd", USD_DECIMALS, 2, true)})
                            </span>
                          </div>
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">{renderMultiplierPointsLabel()}</div>
                <div>{renderMultiplierPointsValue()}</div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked Multiplier Points</div>
                <div>{formatKeyAmount(processedData, "bnMvxInFeeMvx", 18, 4, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">Boost %</div>
                <div>
                  <Tooltip
                    handle={`${formatAmount(processedData.boostBasisPoints, 2, 2, false)}%`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          You are earning {formatAmount(processedData.boostBasisPoints, 2, 2, false)}% more{" "}
                          {nativeTokenSymbol} rewards using {formatAmount(processedData.bnMvxInFeeMvx, 18, 4, 2, true)}{" "}
                          Staked Multiplier Points.
                          <br />
                          <br />
                          Use the "Compound" button to stake your Multiplier Points.
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">Total esMVX Staked</div>
                <div>
                  {formatKeyAmount(processedData, "stakedEsMvxSupply", 18, 0, true)} esMVX ($
                  {formatKeyAmount(processedData, "stakedEsMvxSupplyUsd", USD_DECIMALS, 0, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total esMVX Supply</div>
                <div>
                  {formatAmount(esMvxSupply, 18, 0, true)} esMVX (${formatAmount(esMvxSupplyUsd, USD_DECIMALS, 0, true)}
                  )
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total MVX Staked</div>
                <div>
                  {!totalMvxStaked && "..."}
                  {totalMvxStaked && (
                    <Tooltip
                      position="right-bottom"
                      className="nowrap"
                      handle={
                        formatAmount(totalMvxStaked, 18, 0, true) +
                        " MVX" +
                        ` ($${formatAmount(stakedMvxSupplyUsd, USD_DECIMALS, 0, true)})`
                      }
                      renderContent={() => <>Polygon: {formatAmount(polygonMvxStaked, 18, 0, true)} MVX</>}
                    />
                  )}
                </div>
              </div>
              <div className="App-card-row mb-6">
                <div className="label">Total MVX Supply</div>
                {!totalMvxSupply && "..."}
                {totalMvxSupply && (
                  <div>
                    {formatAmount(totalMvxSupply, 18, 0, true)} MVX ($
                    {formatAmount(totalSupplyUsd, USD_DECIMALS, 0, true)})
                  </div>
                )}
              </div>

              <div className="App-card-divider"></div>
              <div className="App-card-options">
                <Link className="App-button-option App-card-option btnwt text-center" to="/buy_mvx">
                  BUY MVX
                </Link>

                {active && <div className="App-card-divider"></div>}
                {active && (
                  <button className="App-button-option App-card-option btnwt" onClick={() => showStakeEsMvxModal()}>
                    STAKE esMVX
                  </button>
                )}
                {active && (
                  <button className="App-button-option App-card-option btnwt" onClick={() => showUnstakeEsMvxModal()}>
                    UNSTAKE esMVX
                  </button>
                )}
                {active && <div className="App-card-divider"></div>}
                {active && (
                  <button className="App-button-option App-card-option btnwt" onClick={() => showStakeMvxModal()}>
                    STAKE MVX
                  </button>
                )}
                {active && (
                  <button className="App-button-option App-card-option btnwt" onClick={() => showUnstakeMvxModal()}>
                    UNSTAKE MVX
                  </button>
                )}
                {active && <div className="App-card-divider"></div>}
                {active && (
                  <Link className="App-button-option App-card-option px-4 pe-4" to="/begin_account_transfer">
                    TRANSFER ACCOUNT
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="StakeV2-mvx-card">
            <div className="App-card ">
              <div className="App-card-title">MVLP ({chainName})</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Price</div>
                  <div>${formatKeyAmount(processedData, "mvlpPrice", USD_DECIMALS, MVXMVLP_DISPLAY_DECIMALS, true)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Wallet</div>
                  <div>
                    {formatKeyAmount(processedData, "mvlpBalance", MVLP_DECIMALS, 2, true)} MVLP ($
                    {formatKeyAmount(processedData, "mvlpBalanceUsd", USD_DECIMALS, 2, true)})
                  </div>
                </div>
                {/*       <div className="App-card-row">
                      <div className="label">Staked</div>
                      <div>
                        {formatKeyAmount(processedData, "mvlpBalance", MVLP_DECIMALS, 2, true)} MVLP ($
                        {formatKeyAmount(processedData, "mvlpBalanceUsd", USD_DECIMALS, 2, true)})
                      </div>
                    </div> */}
                <div className="App-card-divider"></div>
                <div className="App-card-row">
                  <div className="label">APR</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(processedData, "mvlpAprTotal", 2, 2, true)}%`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            <div className="Tooltip-row">
                              <span className="label text-white">
                                {nativeTokenSymbol} ({wrappedTokenSymbol}) APR
                              </span>
                              <span>{formatKeyAmount(processedData, "mvlpAprForNativeToken", 2, 2, true)}%</span>
                            </div>
                            <div className="Tooltip-row">
                              <span className="label text-white">Escrowed MVX APR</span>
                              <span>{formatKeyAmount(processedData, "mvlpAprForEsMvx", 2, 2, true)}%</span>
                            </div>
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Rewards</div>
                  <div>
                    <Tooltip
                      handle={`$${formatKeyAmount(processedData, "totalMvlpRewardsUsd", USD_DECIMALS, 2, true)}`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            <div className="Tooltip-row">
                              <span className="label text-white">
                                {nativeTokenSymbol} ({wrappedTokenSymbol})
                              </span>
                              <span>
                                {formatKeyAmount(processedData, "feeMvlpTrackerRewards", 18, 4)} ($
                                {formatKeyAmount(processedData, "feeMvlpTrackerRewardsUsd", USD_DECIMALS, 2, true)})
                              </span>
                            </div>
                            <div className="Tooltip-row">
                              <span className="label text-white">Escrowed MVX</span>
                              <span>
                                {formatKeyAmount(processedData, "stakedMvlpTrackerRewards", 18, 4)} ($
                                {formatKeyAmount(processedData, "stakedMvlpTrackerRewardsUsd", USD_DECIMALS, 2, true)})
                              </span>
                            </div>
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-divider"></div>
                {/*   <div className="App-card-row">
                      <div className="label">Total Staked</div>
                      <div>
                        {formatKeyAmount(processedData, "mvlpSupply", 18, 2, true)} MVLP ($
                        {formatKeyAmount(processedData, "mvlpSupplyUsd", USD_DECIMALS, 2, true)})
                      </div>
                    </div> */}
                <div className="App-card-row">
                  <div className="label">Supply</div>
                  <div>
                    {formatKeyAmount(processedData, "mvlpSupply", 18, 2, true)} MVLP ($
                    {formatKeyAmount(processedData, "mvlpSupplyUsd", USD_DECIMALS, 2, true)})
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  <Link className="App-button-option App-card-option btnwt text-center" to="/buy_mvlp">
                    + LIQ.
                  </Link>
                  <Link className="App-button-option App-card-option btnwt text-center" to="/buy_mvlp#redeem">
                    - LIQ.
                  </Link>
                  {hasInsurance && (
                    <a
                      className="App-button-option App-card-option"
                      href="https://app.insurace.io/Insurance/Cart?id=124&referrer=545066382753150189457177837072918687520318754040"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PURCHASE INSURANCE
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="App-card primary StakeV2-total-rewards-card mt-3">
              <div className="App-card-title">Total Earnings</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    {nativeTokenSymbol} ({wrappedTokenSymbol})
                  </div>
                  <div>
                    {formatKeyAmount(processedData, "totalNativeTokenRewards", 18, 4, true)} ($
                    {formatKeyAmount(processedData, "totalNativeTokenRewardsUsd", USD_DECIMALS, 2, true)})
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Escrowed MVX</div>
                  <div>
                    {formatKeyAmount(processedData, "totalEsMvxRewards", 18, 4, true)} ($
                    {formatKeyAmount(processedData, "totalEsMvxRewardsUsd", USD_DECIMALS, 2, true)})
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Unvested MVX</div>
                  <div>
                    {formatKeyAmount(processedData, "totalVesterRewards", 18, 4, true)} ($
                    {formatKeyAmount(processedData, "totalVesterRewardsUsd", USD_DECIMALS, 2, true)})
                  </div>
                </div>

                <div className="App-card-row">
                  <div className="label">Multiplier Points</div>
                  <div>{formatKeyAmount(processedData, "bonusMvxTrackerRewards", 18, 4, true)}</div>
                </div>
                {/*   <div className="App-card-row">
                      <div className="label">Staked Multiplier Points</div>
                      <div>{formatKeyAmount(processedData, "bnMvxInFeeMvx", 18, 4, true)}</div>
                    </div> */}
                <div className="App-card-row">
                  <div className="label">Total</div>
                  <div>${formatKeyAmount(processedData, "totalRewardsUsd", USD_DECIMALS, 2, true)}</div>
                </div>
                {/* <div className="App-card-bottom-placeholder">
                      <div className="App-card-divider"></div>
                      <div className="App-card-options">
                        {active && <button className="App-button-option App-card-option">Compound</button>}
                        {active && <button className="App-button-option App-card-option">Claim</button>}
                        {!active && (
                          <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                            Connect Wallet
                          </button>
                        )}
                      </div>
                    </div> */}
                <div className="App-card-bottom">
                  <div className="App-card-divider"></div>
                  <div className="App-card-options">
                    {active && (
                      <button
                        className="App-button-option App-card-option btnwt"
                        onClick={() => setIsCompoundModalVisible(true)}
                      >
                        COMPOUND
                      </button>
                    )}
                    {active && (
                      <button
                        className="App-button-option App-card-option btnwt"
                        onClick={() => setIsClaimModalVisible(true)}
                      >
                        CLAIM
                      </button>
                    )}
                    {!active && (
                      <button className="App-button-option App-card-option px-4 pe-4" onClick={() => connectWallet()}>
                        CONNECT WALLET
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/*    <div className="App-card">
            <div className="App-card-title">Escrowed MVX</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Price</div>
                <div>${formatAmount(mvxPrice, USD_DECIMALS, 2, true)}</div>
              </div>
           
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">APR</div>
                <div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(processedData, "mvxAprTotalWithBoost", 2, 2, true)}%`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            <div className="Tooltip-row">
                              <span className="label">
                                {nativeTokenSymbol} ({wrappedTokenSymbol}) Base APR
                              </span>
                              <span>{formatKeyAmount(processedData, "mvxAprForNativeToken", 2, 2, true)}%</span>
                            </div>
                            {processedData.bnMvxInFeeMvx && processedData.bnMvxInFeeMvx.gt(0) && (
                              <div className="Tooltip-row">
                                <span className="label">
                                  {nativeTokenSymbol} ({wrappedTokenSymbol}) Boosted APR
                                </span>
                                <span>{formatKeyAmount(processedData, "mvxBoostAprForNativeToken", 2, 2, true)}%</span>
                              </div>
                            )}
                            <div className="Tooltip-row">
                              <span className="label">Escrowed MVX APR</span>
                              <span>{formatKeyAmount(processedData, "mvxAprForEsMvx", 2, 2, true)}%</span>
                            </div>
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">{renderMultiplierPointsLabel()}</div>
                <div>{renderMultiplierPointsValue()}</div>
              </div>
              <div className="App-card-divider"></div>
            
              <div className="App-card-divider"></div>
              <div className="App-card-options">
             
                {!active && (
                  <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          </div>  */}
        </div>
      </div>

      {/*     <div>
        <div className="Page-title-section">
          <div className="Page-title">Vest</div>
          <div className="Page-description">
            Convert esMVX tokens to MVX tokens.
            <br />
            Please read the{" "}
            <a href="https://docs.metavault.trade/rewards#vesting" target="_blank" rel="noopener noreferrer" className="ahreftextcolor">
              vesting details
            </a>{" "}
            before using the vaults.
          </div>
        </div>
        <div>
          <div className="StakeV2-cards">
            <div className="App-card StakeV2-mvx-card">
              <div className="App-card-title">MVX Vault</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Staked Tokens</div>
                  <div>
                    <Tooltip
                      handle={formatAmount(totalRewardTokens, 18, 2, true)}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            {formatAmount(processedData.mvxInStakedMvx, 18, 2, true)} MVX
                            <br />
                            {formatAmount(processedData.esMvxInStakedMvx, 18, 2, true)} esMVX
                            <br />
                            {formatAmount(processedData.bnMvxInFeeMvx, 18, 2, true)} Multiplier Points
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Reserved for Vesting</div>
                  <div>
                    {formatKeyAmount(vestingData, "mvxVesterPairAmount", 18, 2, true)} /{" "}
                    {formatAmount(totalRewardTokens, 18, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Vesting Status</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "mvxVesterClaimSum", 18, 4, true)} / ${formatKeyAmount(
                        vestingData,
                        "mvxVesterVestedAmount",
                        18,
                        4,
                        true
                      )}`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            {formatKeyAmount(vestingData, "mvxVesterClaimSum", 18, 4, true)} tokens have been converted
                            to MVX from the&nbsp;
                            {formatKeyAmount(vestingData, "mvxVesterVestedAmount", 18, 4, true)} esMVX deposited for
                            vesting.
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Claimable</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "mvxVesterClaimable", 18, 4, true)} MVX`}
                      position="right-bottom"
                      renderContent={() =>
                        `${formatKeyAmount(
                          vestingData,
                          "mvxVesterClaimable",
                          18,
                          4,
                          true
                        )} MVX tokens can be claimed, use the options under the Total Rewards section to claim them.`
                      }
                    />
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {!active && (
                    <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                      Connect Wallet
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showMvxVesterDepositModal()}>
                      Deposit
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showMvxVesterWithdrawModal()}>
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="App-card StakeV2-mvx-card">
              <div className="App-card-title">MVLP Vault</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Staked Tokens</div>
                  <div>{formatAmount(processedData.mvlpBalance, 18, 2, true)} MVLP</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Reserved for Vesting</div>
                  <div>
                    {formatKeyAmount(vestingData, "mvlpVesterPairAmount", 18, 2, true)} /{" "}
                    {formatAmount(processedData.mvlpBalance, 18, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Vesting Status</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "mvlpVesterClaimSum", 18, 4, true)} / ${formatKeyAmount(
                        vestingData,
                        "mvlpVesterVestedAmount",
                        18,
                        4,
                        true
                      )}`}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <>
                            {formatKeyAmount(vestingData, "mvlpVesterClaimSum", 18, 4, true)} tokens have been converted
                            to MVX from the&nbsp;
                            {formatKeyAmount(vestingData, "mvlpVesterVestedAmount", 18, 4, true)} esMVX deposited for
                            vesting.
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Claimable</div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "mvlpVesterClaimable", 18, 4, true)} MVX`}
                      position="right-bottom"
                      renderContent={() =>
                        `${formatKeyAmount(
                          vestingData,
                          "mvlpVesterClaimable",
                          18,
                          4,
                          true
                        )} MVX tokens can be claimed, use the options under the Total Rewards section to claim them.`
                      }
                    ></Tooltip>
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {!active && (
                    <button className="App-button-option App-card-option" onClick={() => connectWallet()}>
                      Connect Wallet
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showMvlpVesterDepositModal()}>
                      Deposit
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showMvlpVesterWithdrawModal()}>
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>  */}
      <Footer />
    </div>
  );
}
