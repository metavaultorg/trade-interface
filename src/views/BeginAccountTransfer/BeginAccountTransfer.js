import React, { useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { ethers } from "ethers";
import { useWeb3React } from "@web3-react/core";

import { getContract } from "../../Addresses";
import { callContract } from "../../Api";

import Modal from "../../components/Modal/Modal";
import Footer from "../../Footer";

import Token from "../../abis/Token.json";
import Vester from "../../abis/Vester.json";
import RewardTracker from "../../abis/RewardTracker.json";
import RewardRouter from "../../abis/RewardRouter.json";

import { FaCheck, FaTimes } from "react-icons/fa";

import { fetcher, approveTokens, useChainId } from "../../Helpers";

import "./BeginAccountTransfer.css";

function ValidationRow({ isValid, children }) {
  return (
    <div className="ValidationRow">
      <div className="ValidationRow-icon-container">
        {isValid && <FaCheck className="ValidationRow-icon" />}
        {!isValid && <FaTimes className="ValidationRow-icon" />}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function BeginAccountTransfer(props) {
  const { setPendingTxns } = props;
  const { active, library, account } = useWeb3React();
  const { chainId } = useChainId();

  const [receiver, setReceiver] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false);
  let parsedReceiver = ethers.constants.AddressZero;
  if (ethers.utils.isAddress(receiver)) {
    parsedReceiver = receiver;
  }

  const mvxAddress = getContract(chainId, "MVX");
  const mvxVesterAddress = getContract(chainId, "MvxVester");
  const mvlpVesterAddress = getContract(chainId, "MvlpVester");

  const rewardRouterAddress = getContract(chainId, "RewardRouter");

  const { data: mvxVesterBalance } = useSWR([active, chainId, mvxVesterAddress, "balanceOf", account], {
    fetcher: fetcher(library, Token),
  });

  const { data: mvlpVesterBalance } = useSWR([active, chainId, mvlpVesterAddress, "balanceOf", account], {
    fetcher: fetcher(library, Token),
  });

  const stakedMvxTrackerAddress = getContract(chainId, "StakedMvxTracker");
  const { data: cumulativeMvxRewards } = useSWR(
    [active, chainId, stakedMvxTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: fetcher(library, RewardTracker),
    }
  );

  const stakedMvlpTrackerAddress = getContract(chainId, "StakedMvlpTracker");
  const { data: cumulativeMvlpRewards } = useSWR(
    [active, chainId, stakedMvlpTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: fetcher(library, RewardTracker),
    }
  );

  const { data: transferredCumulativeMvxRewards } = useSWR(
    [active, chainId, mvxVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: fetcher(library, Vester),
    }
  );

  const { data: transferredCumulativeMvlpRewards } = useSWR(
    [active, chainId, mvlpVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: fetcher(library, Vester),
    }
  );

  const { data: pendingReceiver } = useSWR([active, chainId, rewardRouterAddress, "pendingReceivers", account], {
    fetcher: fetcher(library, RewardRouter),
  });

  const { data: mvxAllowance } = useSWR([active, chainId, mvxAddress, "allowance", account, stakedMvxTrackerAddress], {
    fetcher: fetcher(library, Token),
  });

  const { data: mvxStaked } = useSWR(
    [active, chainId, stakedMvxTrackerAddress, "depositBalances", account, mvxAddress],
    {
      fetcher: fetcher(library, RewardTracker),
    }
  );

  const needApproval = mvxAllowance && mvxStaked && mvxStaked.gt(mvxAllowance);

  const hasVestedMvx = mvxVesterBalance && mvxVesterBalance.gt(0);
  const hasVestedMvlp = mvlpVesterBalance && mvlpVesterBalance.gt(0);
  const hasStakedMvx =
    (cumulativeMvxRewards && cumulativeMvxRewards.gt(0)) ||
    (transferredCumulativeMvxRewards && transferredCumulativeMvxRewards.gt(0));
  const hasStakedMvlp =
    (cumulativeMvlpRewards && cumulativeMvlpRewards.gt(0)) ||
    (transferredCumulativeMvlpRewards && transferredCumulativeMvlpRewards.gt(0));
  const hasPendingReceiver = pendingReceiver && pendingReceiver !== ethers.constants.AddressZero;

  const getError = () => {
    if (!account) {
      return "Wallet is not connected";
    }
    if (hasVestedMvx) {
      return "Vested MVX not withdrawn";
    }
    if (hasVestedMvlp) {
      return "Vested MVLP not withdrawn";
    }
    if (!receiver || receiver.length === 0) {
      return "Enter Receiver Address";
    }
    if (!ethers.utils.isAddress(receiver)) {
      return "Invalid Receiver Address";
    }
    if (hasStakedMvx || hasStakedMvlp) {
      return "Invalid Receiver";
    }
    if ((parsedReceiver || "").toString().toLowerCase() === (account || "").toString().toLowerCase()) {
      return "Self-transfer not supported";
    }

    if (
      (parsedReceiver || "").length > 0 &&
      (parsedReceiver || "").toString().toLowerCase() === (pendingReceiver || "").toString().toLowerCase()
    ) {
      return "Transfer already initiated";
    }
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isTransferring) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (needApproval) {
      return "Approve MVX";
    }
    if (isApproving) {
      return "Approving...";
    }
    if (isTransferring) {
      return "Transferring";
    }

    return "Begin Transfer";
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

    setIsTransferring(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());

    callContract(chainId, contract, "signalTransfer", [parsedReceiver], {
      sentMsg: "Transfer submitted!",
      failMsg: "Transfer failed.",
      setPendingTxns,
    })
      .then(async (res) => {
        setIsTransferSubmittedModalVisible(true);
      })
      .finally(() => {
        setIsTransferring(false);
      });
  };

  const completeTransferLink = `/complete_account_transfer/${account}/${parsedReceiver}`;
  const pendingTransferLink = `/complete_account_transfer/${account}/${pendingReceiver}`;

  return (
    <div className="BeginAccountTransfer Page page-layout">
      <Modal
        isVisible={isTransferSubmittedModalVisible}
        setIsVisible={setIsTransferSubmittedModalVisible}
        label="Transfer Submitted"
      >
        Your transfer has been initiated.
        <br />
        <br />
        <Link className="App-cta" to={completeTransferLink}>
          Continue
        </Link>
      </Modal>
      <div className="Page-title-section">
        <div className="Page-title">Transfer Account</div>
        <div className="Page-description">
          Please only use this for full account transfers.
          <br />
          This will transfer all your MVX, esMVX, MVLP and Multiplier Points to your new account.
          <br />
          Transfers are only supported if the receiving account has not staked MVX or MVLP tokens before.
          <br />
          Transfers are one-way, you will not be able to transfer staked tokens back to the sending account.
        </div>
        {hasPendingReceiver && (
          <div className="Page-description">
            You have a <Link to={pendingTransferLink}>pending transfer</Link> to {pendingReceiver}.
          </div>
        )}
      </div>
      <div className="Page-content">
        <div className="input-form">
          <div className="input-row">
            <label className="input-label">Receiver Address</label>
            <div>
              <input
                type="text"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                className="text-input"
              />
            </div>
          </div>
          <div className="BeginAccountTransfer-validations">
            <ValidationRow isValid={!hasVestedMvx}>
              Sender has withdrawn all tokens from MVX Vesting Vault
            </ValidationRow>
            <ValidationRow isValid={!hasVestedMvlp}>
              Sender has withdrawn all tokens from MVLP Vesting Vault
            </ValidationRow>
            <ValidationRow isValid={!hasStakedMvx}>Receiver has not staked MVX tokens before</ValidationRow>
            <ValidationRow isValid={!hasStakedMvlp}>Receiver has not staked MVLP tokens before</ValidationRow>
          </div>
          <div className="input-row">
            <button
              className="App-cta Exchange-swap-button"
              disabled={!isPrimaryEnabled()}
              onClick={() => onClickPrimary()}
            >
              {getPrimaryText()}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
