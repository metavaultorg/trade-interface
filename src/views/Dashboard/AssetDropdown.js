import { Menu } from "@headlessui/react";
import { FiChevronDown } from "react-icons/fi";
import "./AssetDropdown.css";
import coingeckoIcon from "../../img/ic_coingecko_hover_16.svg";
import maticIcon from "../../img/ic_polygon_16.svg";
import metamaskIcon from "../../img/ic_metamask_hover_16.svg";
import { addTokenToMetamask, ICONLINKS, platformTokens, useChainId } from "../../Helpers";
import { useWeb3React } from "@web3-react/core";

function AssetDropdown({ assetSymbol, assetInfo }) {
  const { active } = useWeb3React();
  const { chainId } = useChainId();
  let { coingecko, polygon } = ICONLINKS[chainId][assetSymbol];
  const unavailableTokenSymbols = {
    137: ["MATIC"],
  };

  return (
    <Menu>
      <Menu.Button as="div" className="dropdown-arrow">
        <FiChevronDown size={20} />
      </Menu.Button>
      <Menu.Items as="div" className="asset-menu-items">
        <Menu.Item>
          <>
            {coingecko && (
              <a href={coingecko} className="asset-item" target="_blank" rel="noopener noreferrer">
                <img src={coingeckoIcon} alt="Show on Coingecko" />
                <p>Show on Coingecko</p>
              </a>
            )}
          </>
        </Menu.Item>
        <Menu.Item>
          <>
            {polygon && (
              <a href={polygon} className="asset-item" target="_blank" rel="noopener noreferrer">
                <img src={maticIcon} alt="Show in explorer" />
                <p>Show in Explorer</p>
              </a>
            )}
          </>
        </Menu.Item>
        <Menu.Item>
          <>
            {active && unavailableTokenSymbols[chainId].indexOf(assetSymbol) < 0 && (
              <div
                onClick={() => {
                  let token = assetInfo
                    ? { ...assetInfo, image: assetInfo.imageUrl }
                    : platformTokens[chainId][assetSymbol];
                  addTokenToMetamask(token);
                }}
                className="asset-item"
              >
                <img src={metamaskIcon} alt="Add to Metamask" />
                <p>Add to Metamask</p>
              </div>
            )}
          </>
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}

export default AssetDropdown;
