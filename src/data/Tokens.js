import { ethers } from "ethers";
import { getContract } from "../Addresses";

const TOKENS = {
  137: [
    // polygon
    {
      name: "Matic",
      symbol: "MATIC",
      decimals: 18,
      address: ethers.constants.AddressZero,
      coingeckoUrl: "https://www.coingecko.com/en/coins/polygon",
      isNative: true,
      isShortable: true,
      displayDecimals:4
    },
    {
      name: "W.Matic",
      symbol: "WMATIC",
      decimals: 18,
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      coingeckoUrl: "https://www.coingecko.com/en/coins/polygon",
      isWrapped: true,
      baseSymbol: "MATIC",
      displayDecimals:4
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
      decimals: 18,
      isShortable: true,
      displayDecimals:2
    },
    {
      name: "Bitcoin",
      symbol: "BTC",
      address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
      decimals: 8,
      isShortable: true,
      displayDecimals:2
    },
    {
      name: "Chainlink",
      symbol: "LINK",
      address: "0xb0897686c545045aFc77CF20eC7A532E3120E0F1",
      coingeckoUrl: "https://www.coingecko.com/en/coins/chainlink",
      decimals: 18,
      isStable: false,
      isShortable: true,
      displayDecimals:3
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      address: "0xb33EaAd8d922B1083446DC23f610c2567fB5180f",
      coingeckoUrl: "https://www.coingecko.com/en/coins/uniswap",
      decimals: 18,
      isStable: false,
      displayDecimals:3
    },
    {
      name: "Aave",
      symbol: "AAVE",
      address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B",
      coingeckoUrl: "https://www.coingecko.com/en/coins/aave",
      decimals: 18,
      isStable: false,
      displayDecimals:3
    },
    {
      name: "USDC",
      symbol: "USDC",
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      decimals: 6,
      isStable: true,
      displayDecimals:4
    },
    {
      name: "USDT",
      symbol: "USDT",
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
      decimals: 6,
      isStable: true,
      displayDecimals:4
    },
    {
      name: "Dai",
      symbol: "DAI",
      address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      coingeckoUrl: "https://www.coingecko.com/en/coins/dai",
      decimals: 18,
      isStable: true,
      displayDecimals:4
    },
  ],
};

export const CHAIN_FEED_IDS = {
  137: {
    MATIC_USD: "0xab594600376ec9fd91f8e885dadf0ce036862de0",
    ETH_USD: "0xf9680d99d6c9589e2a93a78a04a279e509205945",
    BTC_USD: "0xc907e116054ad103354f2d350fd2514433d57f6f",
    LINK_USD: "0xd9ffdb71ebe7496cc440152d43986aae0ab76665",
    UNI_USD: "0xdf0fb4e4f928d2dcb76f438575fdd8682386e13c",
    BNB_USD: "0x82a6c4af830caa6c97bb504425f6a66165c2c26e",
    AAVE_USD: "0x72484b12719e23115761d5da1646945632979bb6",
    USDC_USD: "0xfe4a8cc5b5b2366c1b58bea3858e81843581b2f7",
    DAI_USD: "0x4746dec9e833a82ec7c2c1356372ccf2cfcd2f3d",
    USDT_USD: "0x0a6513e40db6eb1b165753ad52e80663aea50545",
  },
};

const ADDITIONAL_TOKENS = {
  137: [
    {
      name: "MVX",
      symbol: "MVX",
      address: getContract(137, "MVX"),
      decimals: 18,
    },
    {
      name: "Escrowed MVX",
      symbol: "esMVX",
      address: getContract(137, "ES_MVX"),
      decimals: 18,
    },
    {
      name: "MVX LP",
      symbol: "MVLP",
      address: getContract(137, "MVLP"),
      decimals: 18,
    },
  ],
};

const CHAIN_IDS = [137];

const TOKENS_MAP = {};
const TOKENS_BY_SYMBOL_MAP = {};

for (let j = 0; j < CHAIN_IDS.length; j++) {
  const chainId = CHAIN_IDS[j];
  TOKENS_MAP[chainId] = {};
  TOKENS_BY_SYMBOL_MAP[chainId] = {};
  let tokens = TOKENS[chainId];
  if (ADDITIONAL_TOKENS[chainId]) {
    tokens = tokens.concat(ADDITIONAL_TOKENS[chainId]);
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    TOKENS_MAP[chainId][token.address] = token;
    TOKENS_BY_SYMBOL_MAP[chainId][token.symbol] = token;
  }
}

const WRAPPED_TOKENS_MAP = {};
const NATIVE_TOKENS_MAP = {};
for (const chainId of CHAIN_IDS) {
  for (const token of TOKENS[chainId]) {
    if (token.isWrapped) {
      WRAPPED_TOKENS_MAP[chainId] = token;
    } else if (token.isNative) {
      NATIVE_TOKENS_MAP[chainId] = token;
    }
  }
}

export function getWrappedToken(chainId) {
  return WRAPPED_TOKENS_MAP[chainId];
}

export function getNativeToken(chainId) {
  return NATIVE_TOKENS_MAP[chainId];
}

export function getTokens(chainId) {
  return TOKENS[chainId];
}

export function isValidToken(chainId, address) {
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`);
  }
  return address in TOKENS_MAP[chainId];
}

export function getToken(chainId, address) {
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`);
  }
  if (!TOKENS_MAP[chainId][address]) {
    localStorage.removeItem("Exchange-token-selection-v2");
    localStorage.removeItem("BuyMvlp-swap-token-address");
    window.location.reload();
  }
  return TOKENS_MAP[chainId][address];
}

export function getTokenBySymbol(chainId, symbol) {
  const token = TOKENS_BY_SYMBOL_MAP[chainId][symbol];
  if (!token) {
    throw new Error(`Incorrect symbol "${symbol}" for chainId ${chainId}`);
  }
  return token;
}

export function getWhitelistedTokens(chainId) {
  return TOKENS[chainId].filter((token) => token.symbol !== "USDM");
}
