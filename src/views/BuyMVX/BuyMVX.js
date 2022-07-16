import React, { useEffect } from "react";
import Footer from "../../Footer";
import { NavLink } from "react-router-dom";
import "./BuyMVX.css";

import Synapse from "../../img/Synapse.svg";
import Multichain from "../../img/Multichain.png";
import Celler from "../../img/cbridgev2.svg";
import XPol from "../../img/xpollinate.svg";
import logo from "../../img/MVX_logo.svg";
import mvlpIcon from '../../img/ic_mvlp_40.svg'

export default function BuyMVX() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="BuyMVX">
      <div className="BuyMVX-container BuyMVX-container-pdsmallscreen default-container" style={{marginBottom:200}}>
        <div className="BuyMVX-title-section">
          <div className="BuyMVX-title">Buy MVX</div>
          <div className="BuyMVXMVLP-description">
            <p>
              You can participate in the platform earnings by buying and staking
              MVX
            </p>
            To buy MVX, ensure you are connected to the Polygon Network and
            have enough MATIC for the gas fees.
            <br />
            <br />
            You can learn how to bridge MATIC to Polygon Network by following
            this:{" "}
            <a
              href="https://docs.metavault.trade/faq#bridging"
              target="_blank"
              rel="noopener noreferrer"
              className="textcolorwhite"
            >
              tutorial
            </a>
            , Check the following alternative bridges for the best rates:
          </div>
          <div className="alternative-bridges">
            <a
              href="https://synapseprotocol.com/?inputCurrency=USDC&outputCurrency=USDC&outputChain=137"
              target="_blank"
              rel="noopener noreferrer"
              className="Synapse"
            >
              <img src={Synapse} alt="Synapse" />
            </a>
            <a
              href="https://app.multichain.org/#/router"
              target="_blank"
              rel="noopener noreferrer"
              className="Multichain"
            >
              <img src={Multichain} alt="Multichain" />
            </a>
            <a
              href="https://cbridge.celer.network/#/transfer"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={Celler} alt="Celler" />
            </a>
            <a
              href="https://www.xpollinate.io/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={XPol} alt="xPollinate" />
            </a>
          </div>
          <p className="BuyMVXMVLP-description">
            Learn more at{" "}
            <a
              href="https://docs.metavault.trade/tokenomics"
              target="_blank"
              rel="noopener noreferrer" className="textcolorwhite"
            >
             docs.metavault.trade/tokenomics
            </a>
          </p>
          <a
            href="https://app.uniswap.org/#/swap?inputCurrency=0x2791bca1f2de4661ed88a30c99a7a9449aa84174&outputCurrency=0x2760e46d9bb43dafcbecaad1f64b93207f9f0ed7&chain=polygon"
            target="_blank"
            rel="noopener noreferrer"
            className="BuyMVX-purchase-block"
          >
            <div className="BuyMVX-purchase-block-icon">
              <img src={logo} alt="logo" height="53px" />
            </div>
            <div className="BuyMVX-purchase-block-info">
              <div className="BuyMVX-purchase-block-info__title">Buy MVX</div>
              <div className="BuyMVX-purchase-block-info__subtitle">
                UniswapV3 Polygon Network
              </div>
            </div>
          </a>
          <div className="BuyMVXMVLP-description">If you wish to provide liquidity for MVLP instead, you can find more info at <a href="https://docs.metavault.trade/mvlp" className="textcolorwhite" target="_blank" rel="noopener noreferrer">docs.metavault.trade/mvlp</a>.</div>
          <div className="MVLP-block-section ">
            <NavLink to="/buy_mvlp" className="MVLP-block " >
              <div className="MVLP-block-icon">
                <img src={mvlpIcon} alt="mvlpIcon" height="40px" />
              </div>
              <div className="MVLP-block-label">+ Liq.</div>
            </NavLink>
            <NavLink to="/buy_mvlp#redeem" className="MVLP-block marginbottombymvx">
              <div className="MVLP-block-icon">
                <img src={mvlpIcon} alt="mvlpIcon" height="40px" />
              </div>
              <div className="MVLP-block-label">- Liq.</div>
            </NavLink>
          </div>
        </div>
      </div>          
      <Footer />
    </div>
  );
}
