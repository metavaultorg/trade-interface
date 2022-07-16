const CONTRACTS = {
  137: {
    // polygon
    Vault: "0x32848E2d3aeCFA7364595609FB050A301050A6B4",
    Router: "0xCA9c89410025F2bc3BeFb07CE57529F26ad69093",
    VaultReader: "0xa1Cc67170DF03aAbD5e39406e390Ef5AA2137BBb",
    Reader: "0x01dd8B434A83cbdDFa24f2ef1fe2D6920ca03734",
    MvlpManager: "0x13E733dDD6725a8133bec31b2Fc5994FA5c26Ea9",
    RewardRouter: "0x601600bb8f5DBc109551A53700A9dF38Cb3a88Fa",
    RewardReader: "0x398cAB94DEa3b44861E7Ad7eFCD23a6A35d57C3a",
    MVLP: "0x9F4f8bc00F48663B7C204c96b932C29ccc43A2E8",
    MVX: "0x2760e46d9bb43dafcbecaad1f64b93207f9f0ed7",
    ES_MVX: "0xd1b2f8DFF8437BE57430Ee98767d512F252ead61",
    BN_MVX: "0xB6BDd10A12286401C8DfaC93Fe933c7abBD6d0aF",
    USDM: "0x533403a3346cA31D67c380917ffaF185c24e7333",
    StakedMvxTracker: "0xE8e2E78D8cA52f238CAf69f020fA961f8A7632e9",
    BonusMvxTracker: "0x295818E13208d81c40E884Cc52720c45155Fdd93",
    FeeMvxTracker: "0xaCEC858f6397Dd227dD4ed5bE91A5BB180b8c430",
    StakedMvlpTracker: "0xA6ca41Bbf555074ed4d041c1F4551eF48116D59A",
    FeeMvlpTracker: "0xaBD6c70C41FdF9261dfF15F4eB589b44a37072eB",
    StakedMvxDistributor: "0xAeFE07f369FA46026CB27fB9d09eF59E913d6119",
    StakedMvlpDistributor: "0xaf26dBF99bA3bBD758002a4BfB53762eaf1bd7F2",
    MvxVester: "0x505B0ECAc7a2709C59DF1F7E7B21dbc7fB5f7DC6",
    MvlpVester: "0x041D005Ef436c41383AD9A36BC86Aee6cc526D07",
    OrderBook: "0x178aEc588E98601287eE72d0B55BCb895268eD2c",
    PositionManager: "0xeec142780E5DC844351f00C22dF160FF9cF01131",
    OrderBookReader: "0xb1306bd367f9b85287d167492d71713A9898B40c",
    PositionRouter: "0x5e51629adcded51A8B51133d4B46d10ec5Eb5361",
    ReferralStorage: "0x2b27d228D1e6Db9b0A4dE299a0c749CA11E7f8aC",
    ReferralReader: "0x3444dF08aA9eBA2B49c7106C57aee3cb13c578fC",

    UniswapMvxUsdcPool: "0x30f5c777ab316e6878D2b71a32274e4C2842327A",
    NATIVE_TOKEN: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  },
};

const tryRequire = (path) => {
  try {
    return require(`${path}`);
  } catch (err) {
    return undefined;
  }
};
const devAddresses = tryRequire("./development.Addresses.js");

export function getContract(chainId, name) {
  const contracts = process.env.NODE_ENV === "development" && devAddresses ? devAddresses.CONTRACTS : CONTRACTS;

  if (!contracts[chainId]) {
    throw new Error(`Unknown chainId ${chainId}`);
  }
  if (!contracts[chainId][name]) {
    throw new Error(`Unknown constant "${name}" for chainId ${chainId}`);
  }
  return contracts[chainId][name];
}

export const XGMT_EXCLUDED_ACCOUNTS = [
  "0x330eef6b9b1ea6edd620c825c9919dc8b611d5d5",
  "0xd9b1c23411adbb984b1c4be515fafc47a12898b2",
  "0xa633158288520807f91ccc98aa58e0ea43acb400",
  "0xffd0a93b4362052a336a7b22494f1b77018dd34b",
];

export const MVX_MULTISIG_ADDRESS = "0x203d15f68d594060c0eae4edecbd2ab124d6450c";
export const MVD_TREASURY_ADDRESS = "0x4876e4303dad975effe107ba84598ce4a24724ed";
