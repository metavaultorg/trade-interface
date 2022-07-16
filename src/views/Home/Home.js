import React, { useCallback ,useEffect} from "react";
import Footer from "../../Footer";
import { Link, NavLink } from "react-router-dom";

import "./Home.css";

import liquidityIcon from "../../img/ic_liq.svg";
import costIcon from "../../img/ic_costnew.svg";
import simpleSwapIcon from "../../img/ic_simplenew.svg";

import polygonIcon from "../../img/lg_polygon.svg";
//import nearIcon from "../../img/lg_near.svg";

import tradingIcon from "../../img/totalvolume.png";
import statsIcon from "../../img/openinterest.svg";
import totaluserIcon from "../../img/totalusers.svg";




import useSWR from "swr";

import {
  formatAmount,
  bigNumberify,
  numberWithCommas,
  getServerUrl,
  USD_DECIMALS,
  useChainId,
  POLYGON,
  switchNetwork,
} from "../../Helpers";

import { useWeb3React } from "@web3-react/core";

import { useUserStat,useTotalVolume } from "../../Api";

import TokenCard from "../../components/TokenCard/TokenCard";

export default function Home() {

  const { chainId } = useChainId();
  const { active } = useWeb3React();

  // POLYGON

  const polygonPositionStatsUrl = getServerUrl(POLYGON, "/position_stats");
  const { data: polygonPositionStats } = useSWR([polygonPositionStatsUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const totalVolumeSum = useTotalVolume();





  // Open Interest

  let openInterest = bigNumberify(0);
  if (
    polygonPositionStats &&
    polygonPositionStats.totalLongPositionSizes &&
    polygonPositionStats.totalShortPositionSizes
  ) {
    openInterest = openInterest.add(polygonPositionStats.totalLongPositionSizes);
    openInterest = openInterest.add(polygonPositionStats.totalShortPositionSizes);
  }



  // user stat
  const polygonUserStats = useUserStat(POLYGON);

  let totalUsers = 0;

  if (polygonUserStats && polygonUserStats.uniqueCount) {
    totalUsers += polygonUserStats.uniqueCount;
  }



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
    <div className="Home">
      <div className="Home-top">
        {/* <div className="Home-top-image"></div> */}
        <div className="Home-title-section-container default-container">
          <div className="Home-title-section">
            <div className="Home-title">
            <span className="titletextcolor">Metavault.Trade</span>
            <br />
              <h1>Decentralised<br></br>Perpetual<br></br>Exchange</h1>
            </div>
            <div className="Home-description">
            Trade top cryptocurrencies with up to 30x leverage directly from your private wallet.
            </div>
            <NavLink activeClassName="active" to="/trade" className="default-btn2">
              LAUNCH EXCHANGE
            </NavLink>
          </div>
        </div>
        <div className="Home-latest-info-container default-container">
          <div className="Home-latest-info-block" style={{borderRadius:'15px'}}>
            <img src={tradingIcon} alt="trading" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">Total Trading Volume</div>
              <div className="Home-latest-info__value">${formatAmount(totalVolumeSum, USD_DECIMALS, 0, true)}</div>
            </div>
          </div>
          <div className="Home-latest-info-block" style={{borderRadius:'15px'}}>
            <img src={statsIcon} alt="trading" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">Open Interest</div>
              <div className="Home-latest-info__value">${formatAmount(openInterest, USD_DECIMALS, 0, true)}</div>
            </div>
          </div>
          <div className="Home-latest-info-block" style={{borderRadius:'15px'}}>
            <img src={totaluserIcon} alt="trading" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">Total Users</div>
              <div className="Home-latest-info__value">{numberWithCommas(totalUsers.toFixed(0))}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="Home-benefits-section">
        <div className="Home-benefits default-container">
          <div className="Home-benefit">
            <div className="Home-benefit-icon">
              <img src={liquidityIcon} alt="liquidity" className="Home-benefit-icon-symbol" width={70} />
              <div className="Home-benefit-title">Reduce Liquidation Risks</div>
            </div>
            <div className="Home-benefit-description">
              An aggregate of high-quality price feeds determine when liquidations occur. This keeps positions safe from
              temporary wicks.
            </div>
          </div>
          <div className="Home-benefit">
            <div className="Home-benefit-icon">
              <img src={costIcon} alt="cost" className="Home-benefit-icon-symbol" width={70} />
              <div className="Home-benefit-title">Save on Costs</div>
            </div>
            <div className="Home-benefit-description">
              Enter and exit positions with minimal spread and zero price impact. Get the optimal price without
              incurring additional costs.
            </div>
          </div>
          <div className="Home-benefit">
            <div className="Home-benefit-icon">
              <img src={simpleSwapIcon} alt="simpleswap" className="Home-benefit-icon-symbol" width={70} />
              <div className="Home-benefit-title">Simple Swaps</div>
            </div>
            <div className="Home-benefit-description">
              Open positions through a simple swap interface. Conveniently swap from any supported asset into the
              position of your choice.
            </div>
          </div>
        </div>
      </div>
      <div className="Home-cta-section">
        <div className="Home-cta-container default-container">
          <div className="Home-cta-info">
            <div className="Home-cta-info__title">Available on the following networks</div>
            <div className="Home-cta-info__description">Metavault.Trade is currently only deployed to Polygon Network.</div>
          </div>
          <div className="Home-cta-options homepage-container-pd">
            <div className="Home-cta-option Home-cta-option-polygon">
              <div className="Home-cta-option-icon">
                <img src={polygonIcon} alt="polygon" className="imagescreem" />
              </div>
              <div className="Home-cta-option-info">
                <div className="Home-cta-option-title">Polygon<br></br><small style={{fontSize:15,fontWeight:300}}>Metavault.Trade</small></div>
               
                <div className="Home-cta-option-action">
                   <Link to="/trade" className="default-btnhome availablebtnbg" onClick={() => changeNetwork(POLYGON)}>
                    LAUNCH EXCHANGE
                  </Link> 
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="Home-token-card-section mb-5">
        <div className="Home-token-card-container default-container">
          <div className="Home-token-card-info">
            <div className="Home-token-card-info__title">Two tokens create our ecosystem</div>
          </div>
          <TokenCard />
        </div>
      </div>

      <Footer />
    </div>
  );
}
