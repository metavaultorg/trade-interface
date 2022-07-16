import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";

import MvlpSwap from "../../components/Mvlp/MvlpSwap";
import BuyMvlpIcon from "../../img/ic_buy_mvlp.svg";
import Footer from "../../Footer";
import "./BuyMvlp.css";

import { useChainId } from "../../Helpers";
import { getNativeToken } from "../../data/Tokens";

export default function BuyMvlp(props) {
  const { chainId } = useChainId();
  const history = useHistory();
  const [isBuying, setIsBuying] = useState(true);
  const nativeTokenSymbol = getNativeToken(chainId).symbol;

  useEffect(() => {
    const hash = history.location.hash.replace("#", "");
    const buying = hash === "redeem" ? false : true;
    setIsBuying(buying);
  }, [history.location.hash]);

  return (
    <div className="default-container buy-mvlp-content page-layout">
          <div className="section-title-content mb-3">
          <div className="Page-title">+ / - LIQ.</div>
          <div className="Page-description mb-3">
            Add liquidity and get{" "}
            <a href="https://docs.metavault.trade/mvlp" target="_blank" rel="noopener noreferrer" className="ahreftextcolor">
              MVLP
            </a>{" "}
            - tokens to earn fees from swaps and leverage trading in {nativeTokenSymbol}.
            <br />
            Note: There is a minimum 15 minutes holding time after adding liquidity.
            <br />
            View <Link to="/earn" className="ahreftextcolor">earn</Link> page.
          </div>
        </div>

   {/*    <div className="section-title-block">
        <div className="section-title-icon">
          <img src={BuyMvlpIcon} alt="BuyMvlpIcon" />
        </div>
        <div className="section-title-content">
          <div className="Page-title">+ / - LIQ.</div>
          <div className="Page-description">
            Purchase{" "}
            <a href="https://docs.metavault.trade/mvlp" target="_blank" rel="noopener noreferrer" className="ahreftextcolor">
              MVLP tokens
            </a>{" "}
            to earn {nativeTokenSymbol} fees from swaps and leverages trading.
            <br />
            Note that there is a minimum holding time of 15 minutes after a purchase.
            <br />
            View <Link to="/earn" className="ahreftextcolor">staking</Link> page.
          </div>
        </div>
      </div> */}
      <MvlpSwap {...props} isBuying={isBuying} setIsBuying={setIsBuying} />
      <Footer />
    </div>
  );
}
