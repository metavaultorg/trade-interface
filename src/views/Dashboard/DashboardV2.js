import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import TooltipComponent from "../../components/Tooltip/Tooltip";
import statsBigIcon from "../../img/ic_stats_big.svg";
import tokensBigIcon from "../../img/ic_tokens.svg";
import hexToRgba from "hex-to-rgba";
import { ethers } from "ethers";

import { getWhitelistedTokens, getTokenBySymbol } from "../../data/Tokens";
import { getFeeHistory } from "../../data/Fees";

import {
  fetcher,
  formatAmount,
  formatKeyAmount,
  expandDecimals,
  bigNumberify,
  numberWithCommas,
  formatDate,
  getServerUrl,
  getChainName,
  useChainId,
  USD_DECIMALS,
  MVXMVLP_DISPLAY_DECIMALS,
  MVX_DECIMALS,
  MVLP_DECIMALS,
  BASIS_POINTS_DIVISOR,
  POLYGON,
  getTotalVolumeSum,
  MVLPPOOLCOLORS,
  getPageTitle,
} from "../../Helpers";
import {
  useTotalMvxInLiquidity,
  useMvxPrice,
  useTotalMvxStaked,
  useTotalMvxSupply,
  useInfoTokens,
  useMvdMvxTreasuryHoldings,
  useMvdMvlpTreasuryHoldings,
  useMvxMultisigHoldings,
  useProtocolOwnLiquidity,
} from "../../Api";
import { getContract } from "../../Addresses";

import Vault from "../../abis/Vault.json";
import Reader from "../../abis/Reader.json";
import MvlpManager from "../../abis/MvlpManager.json";
import Footer from "../../Footer";

import "./DashboardV2.css";

import mvx40Icon from "../../img/ic_mvx_40.svg";
import mvlp40Icon from "../../img/ic_mvlp_40.svg";

import polygon16Icon from "../../img/ic_polygon_16.svg";
import polygon24Icon from "../../img/ic_polygon_24.svg";

import AssetDropdown from "./AssetDropdown";
import SEO from "../../components/Common/SEO";

import { useTotalVolume,useHourlyVolume,useTotalFees } from "../../Api";


const { AddressZero } = ethers.constants;

function getVolumeInfo(hourlyVolume) {
  if (!hourlyVolume || hourlyVolume.length === 0) {
    return {};
  }

  const secondsPerHour = 60 * 60;
  const minTime = parseInt(Date.now() / 1000 / secondsPerHour) * secondsPerHour - 24 * secondsPerHour;

  const info = {};
  let totalVolume = bigNumberify(0);
  for (let i = 0; i < hourlyVolume.length; i++) {
    const item = hourlyVolume[i].data;
    if (parseInt(item.timestamp) < minTime) {
      break;
    }

    if (!info[item.token]) {
      info[item.token] = bigNumberify(0);
    }

    info[item.token] = info[item.token].add(item.volume);
    totalVolume = totalVolume.add(item.volume);
  }

  info.totalVolume = totalVolume;

  return info;
}

function getCurrentFeesUsd(tokenAddresses, fees, infoTokens) {
  if (!fees || !infoTokens) {
    return bigNumberify(0);
  }

  let currentFeesUsd = bigNumberify(0);
  for (let i = 0; i < tokenAddresses.length; i++) {
    const tokenAddress = tokenAddresses[i];
    const tokenInfo = infoTokens[tokenAddress];
    if (!tokenInfo || !tokenInfo.contractMinPrice) {
      continue;
    }

    const feeUsd = fees[i].mul(tokenInfo.contractMinPrice).div(expandDecimals(1, tokenInfo.decimals));
    currentFeesUsd = currentFeesUsd.add(feeUsd);
  }

  return currentFeesUsd;
}

export default function DashboardV2() {
  const { active, library } = useWeb3React();
  const { chainId } = useChainId();

  const chainName = getChainName(chainId);

  const positionStatsUrl = getServerUrl(chainId, "/position_stats");
  const { data: positionStats } = useSWR([positionStatsUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });
  

  const volumeInfo = useHourlyVolume();


  // const hourlyVolumeUrl = getServerUrl(chainId, "/hourly_volume");
  // const { data: hourlyVolume } = useSWR([hourlyVolumeUrl], {
  //   fetcher: (...args) => fetch(...args).then((res) => res.json()),
  // });

  const totalVolumeSum = useTotalVolume();



  // const totalVolumeUrl = getServerUrl(chainId, "/total_volume");
  // const { data: totalVolume } = useSWR([totalVolumeUrl], {
  //   fetcher: (...args) => fetch(...args).then((res) => res.json()),
  // });

  // const totalVolumeSum = getTotalVolumeSum(totalVolume);


  const totalFees = useTotalFees();



  let { total: totalMvxSupply } = useTotalMvxSupply();

  const { data: mvdMvxTreasuryHoldings, mutate: updateMvdMvxTreasuryHoldings } = useMvdMvxTreasuryHoldings(
    chainId,
    active
  );
  const { data: mvdMvlpTreasuryHoldings, mutate: updateMvdMvlpTreasuryHoldings } = useMvdMvlpTreasuryHoldings(
    chainId,
    active
  );
  const { data: mvxTreasuryHoldings, mutate: updateMvxTreasuryHoldings } = useMvxMultisigHoldings(chainId, active);

  const { data: protocolOwnLiquidity, mutate: updateProtocolOwnLiquidity } = useProtocolOwnLiquidity(chainId, active);

  let totalLongPositionSizes;
  let totalShortPositionSizes;
  if (positionStats && positionStats.totalLongPositionSizes && positionStats.totalShortPositionSizes) {
    totalLongPositionSizes = bigNumberify(positionStats.totalLongPositionSizes);
    totalShortPositionSizes = bigNumberify(positionStats.totalShortPositionSizes);
  }

  //const volumeInfo = getVolumeInfo(hourlyVolume);

  const whitelistedTokens = getWhitelistedTokens(chainId);
  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);

  const readerAddress = getContract(chainId, "Reader");
  const vaultAddress = getContract(chainId, "Vault");
  const mvlpManagerAddress = getContract(chainId, "MvlpManager");

  const mvxAddress = getContract(chainId, "MVX");
  const mvlpAddress = getContract(chainId, "MVLP");
  const usdmAddress = getContract(chainId, "USDM");

  const tokensForSupplyQuery = [mvxAddress, mvlpAddress, usdmAddress];

  const { data: aums } = useSWR([`Dashboard:getAums:${active}`, chainId, mvlpManagerAddress, "getAums"], {
    fetcher: fetcher(library, MvlpManager),
  });

  const { data: fees } = useSWR([`Dashboard:fees:${active}`, chainId, readerAddress, "getFees", vaultAddress], {
    fetcher: fetcher(library, Reader, [whitelistedTokenAddresses]),
  });

  const { data: totalSupplies } = useSWR(
    [`Dashboard:totalSupplies:${active}`, chainId, readerAddress, "getTokenBalancesWithSupplies", AddressZero],
    {
      fetcher: fetcher(library, Reader, [tokensForSupplyQuery]),
    }
  );

  const { data: totalTokenWeights } = useSWR(
    [`MvlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: fetcher(library, Vault),
    }
  );

  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, undefined);

  const eth = infoTokens[getTokenBySymbol(chainId, "ETH").address];
  const currentFeesUsd = getCurrentFeesUsd(whitelistedTokenAddresses, fees, infoTokens);

  const feeHistory = getFeeHistory(chainId);
  // const shouldIncludeCurrrentFees = feeHistory.length && parseInt(Date.now() / 1000) - feeHistory[0].to > 60 * 60;
  const shouldIncludeCurrrentFees = true;
  let totalFeesDistributed = shouldIncludeCurrrentFees
    ? parseFloat(bigNumberify(formatAmount(currentFeesUsd, USD_DECIMALS - 2, 0, false)).toNumber()) / 100
    : 0;
  for (let i = 0; i < feeHistory.length; i++) {
    totalFeesDistributed += parseFloat(feeHistory[i].feeUsd);
  }

  const { mvxPrice } = useMvxPrice(chainId, { polygon: chainId === POLYGON ? library : undefined }, active);

  let { total: totalMvxInLiquidity } = useTotalMvxInLiquidity(chainId, active);

  let { polygon: polygonStakedMvx, total: totalStakedMvx } = useTotalMvxStaked();

  let mvxMarketCap;
  if (mvxPrice && totalMvxSupply) {
    mvxMarketCap = mvxPrice.mul(totalMvxSupply).div(expandDecimals(1, MVX_DECIMALS));
  }

  let stakedMvxSupplyUsd;
  if (mvxPrice && totalStakedMvx) {
    stakedMvxSupplyUsd = totalStakedMvx.mul(mvxPrice).div(expandDecimals(1, MVX_DECIMALS));
  }

  let aum;
  if (aums && aums.length > 0) {
    aum = aums[0].add(aums[1]).div(2);
  }

  let mvlpPrice;
  let mvlpSupply;
  let mvlpMarketCap;
  if (aum && totalSupplies && totalSupplies[3]) {
    mvlpSupply = totalSupplies[3];
    mvlpPrice =
      aum && aum.gt(0) && mvlpSupply.gt(0)
        ? aum.mul(expandDecimals(1, MVLP_DECIMALS)).div(mvlpSupply)
        : expandDecimals(1, USD_DECIMALS);
    mvlpMarketCap = mvlpPrice.mul(mvlpSupply).div(expandDecimals(1, MVLP_DECIMALS));
  }

  let tvl;
  if (mvlpMarketCap && mvxPrice && totalStakedMvx) {
    tvl = mvlpMarketCap.add(mvxPrice.mul(totalStakedMvx).div(expandDecimals(1, MVX_DECIMALS)));
  }

  let mvdMvxTreasuryHoldingsUsd;
  if (mvxPrice && mvdMvxTreasuryHoldings) {
    mvdMvxTreasuryHoldingsUsd = mvxPrice.mul(mvdMvxTreasuryHoldings).div(expandDecimals(1, MVX_DECIMALS));
  }

  let mvdMvlpTreasuryHoldingsUsd;
  if (mvlpPrice && mvdMvlpTreasuryHoldings) {
    mvdMvlpTreasuryHoldingsUsd = mvlpPrice.mul(mvdMvlpTreasuryHoldings).div(expandDecimals(1, MVX_DECIMALS));
  }

  let protocolOwnLiquidityUsd;
  if (mvlpPrice && protocolOwnLiquidity) {
    protocolOwnLiquidityUsd = mvlpPrice.mul(protocolOwnLiquidity).div(expandDecimals(1, MVX_DECIMALS));
  }

  let adjustedUsdmSupply = bigNumberify(0);

  for (let i = 0; i < tokenList.length; i++) {
    const token = tokenList[i];
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo && tokenInfo.usdmAmount) {
      adjustedUsdmSupply = adjustedUsdmSupply.add(tokenInfo.usdmAmount);
    }
  }

  const getWeightText = (tokenInfo) => {
    if (
      !tokenInfo.weight ||
      !tokenInfo.usdmAmount ||
      !adjustedUsdmSupply ||
      adjustedUsdmSupply.eq(0) ||
      !totalTokenWeights
    ) {
      return "...";
    }

    const currentWeightBps = tokenInfo.usdmAmount.mul(BASIS_POINTS_DIVISOR).div(adjustedUsdmSupply);
    const targetWeightBps = tokenInfo.weight.mul(BASIS_POINTS_DIVISOR).div(totalTokenWeights);

    const weightText = `${formatAmount(currentWeightBps, 2, 2, false)}% / ${formatAmount(
      targetWeightBps,
      2,
      2,
      false
    )}%`;

    return (
      <TooltipComponent
        handle={weightText}
        position="right-bottom"
        renderContent={() => {
          return (
            <>
              Current Weight: {formatAmount(currentWeightBps, 2, 2, false)}%<br />
              Target Weight: {formatAmount(targetWeightBps, 2, 2, false)}%<br />
              <br />
              {currentWeightBps.lt(targetWeightBps) && (
                <div>
                  {tokenInfo.symbol} is below its target weight.
                  <br />
                  <br />
                  Get lower fees to{" "}
                  <Link to="/buy_mvlp" target="_blank" rel="noopener noreferrer">
                    + liq.
                  </Link>{" "}
                  with {tokenInfo.symbol},&nbsp; and to{" "}
                  <Link to="/trade" target="_blank" rel="noopener noreferrer">
                    swap
                  </Link>{" "}
                  {tokenInfo.symbol} for other tokens.
                </div>
              )}
              {currentWeightBps.gt(targetWeightBps) && (
                <div>
                  {tokenInfo.symbol} is above its target weight.
                  <br />
                  <br />
                  Get lower fees to{" "}
                  <Link to="/trade" target="_blank" rel="noopener noreferrer">
                    swap
                  </Link>{" "}
                  tokens for {tokenInfo.symbol}.
                </div>
              )}
              <br />
              <div>
                <a href="https://docs.metavault.trade/mvlp" target="_blank" rel="noopener noreferrer">
                  More Info
                </a>
              </div>
            </>
          );
        }}
      />
    );
  };

  let stakedPercent = 0;

  if (totalMvxSupply && !totalMvxSupply.isZero() && !totalStakedMvx.isZero()) {
    stakedPercent = totalStakedMvx.mul(100).div(totalMvxSupply).toNumber();
  }

  let liquidityPercent = 0;

  if (totalMvxSupply && !totalMvxSupply.isZero() && totalMvxInLiquidity) {
    liquidityPercent = totalMvxInLiquidity.mul(100).div(totalMvxSupply).toNumber();
  }

  let mvdMvxTreasuryHoldingsPercent = 0;

  if (totalMvxSupply && !totalMvxSupply.isZero() && mvdMvxTreasuryHoldings) {
    mvdMvxTreasuryHoldingsPercent = mvdMvxTreasuryHoldings.mul(100).div(totalMvxSupply).toNumber();
  }

  let mvxTreasuryHoldingsPercent = 0;
  if (totalMvxSupply && !totalMvxSupply.isZero() && mvxTreasuryHoldings) {
    mvxTreasuryHoldingsPercent = mvxTreasuryHoldings.mul(100).div(totalMvxSupply).toNumber();
  }

  let notStakedPercent = 100 - stakedPercent - liquidityPercent - mvdMvxTreasuryHoldingsPercent - mvxTreasuryHoldingsPercent;

  let mvxDistributionData = [
    {
      name: "staked",
      value: stakedPercent,
      color: "#b39a31",
    },
    {
      name: "in liquidity",
      value: liquidityPercent,
      color: "#e5bf29",
    },
    {
      name: "not staked",
      value: notStakedPercent,
      color: "#7e7e7b",
    },
    {
      name: "mvx multisig wallet",
      value: mvxTreasuryHoldingsPercent,
      color: "#000000",
    },
    {
      name: "mvx multisig wallet",
      value: mvdMvxTreasuryHoldingsPercent,
      color: "#c90064",
    },
  ];
  const totalStatsStartDate = "01 June 2022";

  let stableMvlp = 0;
  let totalMvlp = 0;

  let mvlpPool = tokenList.map((token) => {
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo.usdmAmount && adjustedUsdmSupply && adjustedUsdmSupply > 0) {
      const currentWeightBps = tokenInfo.usdmAmount.mul(BASIS_POINTS_DIVISOR).div(adjustedUsdmSupply);
      if (tokenInfo.isStable) {
        stableMvlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
      }
      totalMvlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
      return {
        fullname: token.name,
        name: token.symbol,
        value: parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`),
      };
    }
    return null;
  });

  let stablePercentage = totalMvlp > 0 ? ((stableMvlp * 100) / totalMvlp).toFixed(2) : "0.0";

  mvlpPool = mvlpPool.filter(function (element) {
    return element !== null;
  });

  mvlpPool = mvlpPool.sort(function (a, b) {
    if (a.value < b.value) return 1;
    else return -1;
  });

  mvxDistributionData = mvxDistributionData.sort(function (a, b) {
    if (a.value < b.value) return 1;
    else return -1;
  });

  const [mvxActiveIndex, setMVXActiveIndex] = useState(null);

  const onMVXDistributionChartEnter = (_, index) => {
    setMVXActiveIndex(index);
  };

  const onMVXDistributionChartLeave = (_, index) => {
    setMVXActiveIndex(null);
  };

  const [mvlpActiveIndex, setMVLPActiveIndex] = useState(null);

  const onMVLPPoolChartEnter = (_, index) => {
    setMVLPActiveIndex(index);
  };

  const onMVLPPoolChartLeave = (_, index) => {
    setMVLPActiveIndex(null);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="stats-label">
          <div className="stats-label-color" style={{ backgroundColor: payload[0].color }}></div>
          {payload[0].value}% {payload[0].name}
        </div>
      );
    }

    return null;
  };

  return (
    <SEO title={getPageTitle("Dashboard")}>
      <div className="default-container DashboardV2 page-layout">
        <div className="section-title-block mb-3 sectionsmallscreen">
          <div className="section-title-icon section-title-iconsmall">
            <img src={statsBigIcon} alt="statsBigIcon" />
          </div>
          <div className="section-title-content">
            <div className="Page-title">
              STATS {chainId === POLYGON && <img src={polygon24Icon} alt="polygon24Icon" />}
            </div>
            <div className="Page-description">
              {chainName} Total Stats begin on {totalStatsStartDate}.<br /> In-depth statistics:{" "}
              {chainId === POLYGON && (
                <a
                  href="https://stats.metavault.trade/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ahreftextcolor"
                >
                  https://stats.metavault.trade/
                </a>
              )}
              
            </div>
          </div>
        </div>
        <div className="DashboardV2-content">
          <div className="DashboardV2-cards ">
            <div className="App-card ">
              <div className="App-card-title">Overview</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">AUM</div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(tvl, USD_DECIMALS, 0, true)}`}
                      position="right-bottom"
                      renderContent={() =>
                        `Assets Under Management: MVX staked (All chains) + MVLP pool (${chainName})`
                      }
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">MVLP Pool</div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(aum, USD_DECIMALS, 0, true)}`}
                      position="right-bottom"
                      renderContent={() => `Total value of tokens in MVLP pool (${chainName})`}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">24h Volume</div>
                  <div>${formatAmount(volumeInfo, USD_DECIMALS, 0, true)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Long Positions</div>
                  <div>${formatAmount(totalLongPositionSizes, USD_DECIMALS, 0, true)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Short Positions</div>
                  <div>${formatAmount(totalShortPositionSizes, USD_DECIMALS, 0, true)}</div>
                </div>
                {feeHistory.length ? (
                  <div className="App-card-row">
                    <div className="label">Fees since {formatDate(feeHistory[0].to)}</div>
                    <div>${formatAmount(currentFeesUsd, USD_DECIMALS, 2, true)}</div>
                  </div>
                ) : null}
                <div className="App-card-row">
                  <div className="label">Collected fees from July 15, 2022</div>
                  <div>${numberWithCommas(totalFeesDistributed.toFixed(0))}</div>
                </div>
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">Total Stats</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Total collected fees</div>
                  <div>${formatAmount(totalFees, USD_DECIMALS, 0, true)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Total Volume</div>
                  <div>${formatAmount(totalVolumeSum, USD_DECIMALS, 0, true)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Protocol own Liquidity</div>
                  <div>
                    {formatAmount(protocolOwnLiquidity, 18, 0, true)} MVLP ($
                    {formatAmount(protocolOwnLiquidityUsd, USD_DECIMALS, 0, true)})
                  </div>
                </div>

                <div className="App-card-row">
                  <div className="label">Metavault DAO Treasury owned Liquidity</div>
                  <div>
                    {formatAmount(mvdMvlpTreasuryHoldings, 18, 0, true)} MVLP ($
                    {formatAmount(mvdMvlpTreasuryHoldingsUsd, USD_DECIMALS, 0, true)})
                  </div>
                </div>
                {/* <div className="App-card-row">
                  <div className="label">Metavault DAO Treasury MVX holdings</div>
                  <div>
                    {formatAmount(mvdMvxTreasuryHoldings, 18, 0, true)} MVX ($
                    {formatAmount(mvdMvxTreasuryHoldingsUsd, USD_DECIMALS, 0, true)})
                  </div>
                </div> */}
                {/* <div className="App-card-row">
                  <div className="label">Floor Price Fund</div>
                  <div>${formatAmount(totalFloorPriceFundUsd, 30, 0, true)}</div>
                </div> */}
              </div>
            </div>
          </div>

          <div className="section-title-block  mt-5 mb-4 sectionsmallscreen">
            <div className="section-title-icon section-title-iconsmall">
              <img src={tokensBigIcon} alt="statsBigIcon" />
            </div>
            <div className="section-title-content">
              <div className="Page-title">
                TOKENS {chainId === POLYGON && <img src={polygon24Icon} alt="polygon24Icon" />}
              </div>
              <div className="Page-description">Metavault.Trade's Platform and Liquidity Token Index.</div>
            </div>
          </div>

          <div className="DashboardV2-token-cards">
            <div className="stats-wrapper stats-wrapper--mvx">
              <div className="App-card">
                <div className="stats-block">
                  <div className="App-card-title">
                    <div className="App-card-title-mark">
                      <div className="App-card-title-mark-icon">
                        <img src={mvx40Icon} alt="mvx40Icon" />
                      </div>
                      <div className="App-card-title-mark-info">
                        <div className="App-card-title-mark-title">MVX</div>
                        <div className="App-card-title-mark-subtitle">MVX</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol="MVX" />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Price</div>
                      <div>
                        {!mvxPrice && "..."}
                        {mvxPrice && (
                          <TooltipComponent
                            position="right-bottom"
                            className="nowrap"
                            handle={"$" + formatAmount(mvxPrice, USD_DECIMALS, MVXMVLP_DISPLAY_DECIMALS, true)}
                            renderContent={() => (
                              <>Price on Polygon: ${formatAmount(mvxPrice, USD_DECIMALS, MVXMVLP_DISPLAY_DECIMALS, true)}</>
                            )}
                          />
                        )}
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Supply</div>
                      <div>{formatAmount(totalMvxSupply, MVX_DECIMALS, 0, true)} MVX</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Total Staked</div>
                      <div>
                        {
                          <TooltipComponent
                            position="right-bottom"
                            className="nowrap"
                            handle={`$${formatAmount(stakedMvxSupplyUsd, USD_DECIMALS, 0, true)}`}
                            renderContent={() => (
                              <>Staked on Polygon: {formatAmount(polygonStakedMvx, MVX_DECIMALS, 0, true)} MVX</>
                            )}
                          />
                        }
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Market Cap</div>
                      <div>${formatAmount(mvxMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                  </div>
                </div>
                <div className="stats-piechart" onMouseLeave={onMVXDistributionChartLeave}>
                  {mvxDistributionData.length > 0 && (
                    <PieChart width={210} height={210}>
                      <Pie
                        data={mvxDistributionData}
                        cx={100}
                        cy={100}
                        innerRadius={73}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={2}
                        onMouseEnter={onMVXDistributionChartEnter}
                        onMouseOut={onMVXDistributionChartLeave}
                        onMouseLeave={onMVXDistributionChartLeave}
                      >
                        {mvxDistributionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            style={{
                              filter:
                                mvxActiveIndex === index
                                  ? `drop-shadow(0px 0px 6px ${hexToRgba(entry.color, 0.7)})`
                                  : "none",
                              cursor: "pointer",
                            }}
                            stroke={entry.color}
                            strokeWidth={mvxActiveIndex === index ? 1 : 1}
                          />
                        ))}
                      </Pie>
                      <text x={"50%"} y={"50%"} fill="white" textAnchor="middle" dominantBaseline="middle">
                        Distribution
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  )}
                </div>
              </div>
              <div className="App-card">
                <div className="stats-block">
                  <div className="App-card-title">
                    <div className="App-card-title-mark">
                      <div className="App-card-title-mark-icon">
                        <img src={mvlp40Icon} alt="mvlp40Icon" />
                      </div>
                      <div className="App-card-title-mark-info">
                        <div className="App-card-title-mark-title">MVLP</div>
                        <div className="App-card-title-mark-subtitle">MVLP</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol="MVLP" />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Price</div>
                      <div>${formatAmount(mvlpPrice, USD_DECIMALS, MVXMVLP_DISPLAY_DECIMALS, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Supply</div>
                      <div>{formatAmount(mvlpSupply, MVLP_DECIMALS, 0, true)} MVLP</div>
                    </div>
                {/*     <div className="App-card-row">
                      <div className="label">Total Staked</div>
                      <div>${formatAmount(mvlpMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div> */}
                    <div className="App-card-row">
                      <div className="label">Market Cap</div>
                      <div>${formatAmount(mvlpMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Stablecoin Percentage</div>
                      <div>{stablePercentage}%</div>
                    </div>
                  </div>
                </div>
                <div className="stats-piechart" onMouseOut={onMVLPPoolChartLeave}>
                  {mvlpPool.length > 0 && (
                    <PieChart width={210} height={210}>
                      <Pie
                        data={mvlpPool}
                        cx={100}
                        cy={100}
                        innerRadius={73}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        onMouseEnter={onMVLPPoolChartEnter}
                        onMouseOut={onMVLPPoolChartLeave}
                        onMouseLeave={onMVLPPoolChartLeave}
                        paddingAngle={2}
                      >
                        {mvlpPool.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={MVLPPOOLCOLORS[entry.name]}
                            style={{
                              filter:
                                mvlpActiveIndex === index
                                  ? `drop-shadow(0px 0px 6px ${hexToRgba(MVLPPOOLCOLORS[entry.name], 0.7)})`
                                  : "none",
                              cursor: "pointer",
                            }}
                            stroke={MVLPPOOLCOLORS[entry.name]}
                            strokeWidth={mvlpActiveIndex === index ? 1 : 1}
                          />
                        ))}
                      </Pie>
                      <text x={"50%"} y={"50%"} fill="white" textAnchor="middle" dominantBaseline="middle">
                        MVLP Pool
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  )}
                </div>
              </div>
            </div>
            <div className="token-table-wrapper App-card">
              <div className="App-card-title">
                  Metavault.Trade Liquidity Pool {chainId === POLYGON && <img src={polygon16Icon} alt="polygon16Icon" />}
              </div>
              <div className="App-card-divider"></div>
              <table className="token-table">
                <thead>
                  <tr>
                    <th>TOKEN</th>
                    <th>PRICE</th>
                    <th>POOL</th>
                    <th>WEIGHT</th>
                    <th>UTILIZATION</th>
                  </tr>
                </thead>
                <tbody>
                  {tokenList.map((token) => {
                    const tokenInfo = infoTokens[token.address];
                    let utilization = bigNumberify(0);
                    if (tokenInfo && tokenInfo.reservedAmount && tokenInfo.poolAmount && tokenInfo.poolAmount.gt(0)) {
                      utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount);
                    }
                    const maxUsdmAmount = tokenInfo.maxUsdmAmount;

                    var tokenImage = null;

                    try {
                      tokenImage = require("../../img/ic_" + token.symbol.toLowerCase() + "_40.svg");
                    } catch (error) {
                      console.error(error);
                    }

                    return (
                      <tr key={token.symbol}>
                        <td>
                          <div className="token-symbol-wrapper">
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
                          </div>
                        </td>
                        <td>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, tokenInfo.displayDecimals, true)}</td>
                        <td>
                          <TooltipComponent
                            handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                            position="right-bottom"
                            renderContent={() => {
                              return (
                                <>
                                  Pool Amount: {formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 2, true)}{" "}
                                  {token.symbol}
                                  <br />
                                  <br />
                                  Max {tokenInfo.symbol} Capacity: ${formatAmount(maxUsdmAmount, 18, 0, true)}
                                </>
                              );
                            }}
                          />
                        </td>
                        <td>{getWeightText(tokenInfo)}</td>
                        <td>{formatAmount(utilization, 2, 2, false)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="token-grid">
              {tokenList.map((token) => {
                const tokenInfo = infoTokens[token.address];
                let utilization = bigNumberify(0);
                if (tokenInfo && tokenInfo.reservedAmount && tokenInfo.poolAmount && tokenInfo.poolAmount.gt(0)) {
                  utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount);
                }
                const maxUsdmAmount = tokenInfo.maxUsdmAmount;
                var tokenImage = null;

                try {
                  tokenImage = require("../../img/ic_" + token.symbol.toLowerCase() + "_40.svg");
                } catch (error) {
                  console.error(error);
                }

                return (
                  <div className="App-card" key={token.symbol}>
                    <div className="App-card-title">
                      <div style={{ display: "flex" }}>
                        <img src={tokenImage && tokenImage.default} alt={token.symbol} width="40px" />
                        <span className="mt-2 mx-1">{token.symbol}</span>
                        <div className="mt-2">
                          <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                        </div>
                      </div>
                    </div>
                    <div className="App-card-divider"></div>
                    <div className="App-card-content">
                      <div className="App-card-row">
                        <div className="label">Price</div>
                        <div>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, tokenInfo.displayDecimals, true)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Pool</div>
                        <div>
                          <TooltipComponent
                            handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                            position="right-bottom"
                            renderContent={() => {
                              return (
                                <>
                                  Pool Amount: {formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 2, true)}{" "}
                                  {token.symbol}
                                  <br />
                                  <br />
                                  Max {tokenInfo.symbol} Capacity: ${formatAmount(maxUsdmAmount, 18, 0, true)}
                                </>
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Weight</div>
                        <div>{getWeightText(tokenInfo)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Utilization</div>
                        <div>{formatAmount(utilization, 2, 2, false)}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
