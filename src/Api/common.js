import { ApolloClient, InMemoryCache } from "@apollo/client";

export const chainlinkClient = createClient(process.env.REACT_APP_CHAINLINK_SUBGRAPH);

export const polygonGraphClient = createClient(process.env.REACT_APP_MVX_CORE_SUBGRAPH);

// All Positions
export const positionsGraphClient = createClient(process.env.REACT_APP_MVX_POSITIONS_SUBGRAPH);

export const polygonReferralsGraphClient = createClient(process.env.REACT_APP_MVX_REFERRAL_SUBGRAPH);


function createClient(uri) {
  return new ApolloClient({
    uri,
    cache: new InMemoryCache(),
  });
}
