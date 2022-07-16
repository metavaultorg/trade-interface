const SECONDS_PER_WEEK = 604800;

const FEES = {
  137: []
};

export function getFeeHistory(chainId) {
  return FEES[chainId].concat([]).reverse();
}
