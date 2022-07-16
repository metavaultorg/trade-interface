import React, { useCallback } from "react";
import { Link } from "react-router-dom";

import mvxBigIcon from "../../img/mvx.png";
import mvlpBigIcon from "../../img/mvlp.png";

import { POLYGON,switchNetwork, useChainId } from "../../Helpers";

import { useWeb3React } from "@web3-react/core";

import APRLabel from "../APRLabel/APRLabel";

export default function TokenCard() {
  const { chainId } = useChainId();
  const { active } = useWeb3React();

  const changeNetwork = useCallback(
    (network) => {
      if (network === chainId) {
        return;
      }
      if (!active) {
        setTimeout(() => {
          return switchNetwork(network, active);
        }, 500);
      } else {
        return switchNetwork(network, active);
      }
    },
    [chainId, active]
  );

  return (
    <div className="Home-token-card-options ">
      <div className="Home-token-card-option borderradius">
        <div className="Home-token-card-option-icon">
          <img src={mvxBigIcon} alt="mvxBigIcon" /> MVX
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
          The utility and governance token is called MVX. Acquires 30% of the earnings the platform generates.
          </div>
          <div className="Home-token-card-option-apr">
            Polygon APR: <APRLabel chainId={POLYGON} label="mvxAprTotal" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <Link to="/buy_mvx" className="default-btnhome" onClick={() => changeNetwork(POLYGON)}>
              BUY ON POLYGON
              </Link>
            </div>
            <a
              href="https://docs.metavault.trade/tokenomics"
              target="_blank"
              rel="noreferrer"
              className="default-btnhome read-more"
            >
              READ MORE
            </a>
          </div>
        </div>
      </div>
      <div className="Home-token-card-option borderradius">
        <div className="Home-token-card-option-icon ">
          <img src={mvlpBigIcon} alt="mvlpBigIcon" /> MVLP
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
          The platform's liquidity token, MVLP, receives 70% of the fees collected.
          </div>
          <div className="Home-token-card-option-apr">
            Polygon APR: <APRLabel chainId={POLYGON} label="mvlpAprTotal" key="POLYGON" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <Link to="/buy_mvlp" className="default-btnhome" onClick={() => changeNetwork(POLYGON)}>
                + LIQ.
              </Link>
              <Link to="/buy_mvlp#redeem" className="default-btnhome" onClick={() => changeNetwork(POLYGON)}>
                - LIQ.
              </Link>
            </div>
            <a
              href="https://docs.metavault.trade/mvlp"
              target="_blank"
              rel="noreferrer"
              className="default-btnhome read-more"
            >
              READ MORE
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
