import React, { useEffect } from "react";
import Footer from "../../Footer";
import SEO from "../../components/Common/SEO";
import { getPageTitle } from "../../Helpers";
import "./ReferralTerms.css";

export default function ReferralTerms(props) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <SEO title={getPageTitle("Referral Terms")}>
      <div className="default-container Page page-layout">
        <div>
          <div className="Page-title-section center">
            <div className="Page-title">Metavault.Trade Referral Program</div>
            <div className="Page-subtitle">Terms and Conditions</div>
            <div className="Page-description">Last modified: July 15st, 2022</div>
          </div>
          <div className="content">
            <div className="section">
              <h3 className="body-title">Referrals</h3>
              <p className="body-text">
              Get fee-cashback and fee-commissions through the Metavault.Trade referral program.
              </p>
            </div>
            <div className="section">
              <h3 className="body-title">How it works</h3>
              <p className="body-text">
              First, get your referral code:
              </p>
              <p className="body-text">
              <ul>
                <li>Go to (site)</li>
                <li>Click on the ‘Affiliates’ tab</li>
                <li>Create your own unique referral code using any combination of letters, numbers and underscores</li>
              </ul>
              </p>
              <p className="body-text">
                Once you've created your code, click on the ‘copy’ icon next to it to get your referral link. It should look a little like this:
              </p>
              <p className="body-text">
                You can share your referral link on any social media or communication platform. When a trader clicks on your link, your referral code will be connected to their account. After the trader executes a trade on Metavault.Trade, a portion of the associated fees is split between the trader, who will receive a cashback payment and you, who will receive a commission.
              </p>
              <p className="body-text">
                Even if the traders you brought to the platform switch devices, you will still earn commissions, as the code is tied to their user account.
              </p>
              <p className="body-text">
                Please note that the referral program is subject to change, as the protocol is controlled by Metavault.Trade governance token holders. Full referral terms can be found at (site).
              </p>
              <p className="body-text">
                The referral program has a tier system to prevent gaming through self-referrals, this helps to ensure that referrers get commissions for the traders they brought onto the platform.
              </p>
            </div>
            <div className="section">
              <h3 className="body-title">Tiers</h3>
              <p className="body-text">
                The Metavault.Trade referral program has a tier system to prevent gaming of the system through self-referrals. This helps to ensure that all referrals are genuine and represent real users brought to the platform.
              </p>
              <p className="body-text">
              Tier 1: 5% fee-cashback for traders / 5% fee-commission to referrer
              </p>
              <p className="body-text">
              Tier 2: 10% fee-cashback for traders / 10% fee-commission to referrer
              </p>
              <p className="body-text">
              Tier 3: 10% fee-cashback for traders / 15% fee-commission to referrer paid in MATIC and 5% fee-commission to referrer paid in esMVX
              </p>


              <p className="body-text">
              The referral code as explained above is a Tier 1 code, and anyone can create one. Here’s how to upgrade your code to Tier 2 or Tier 3:
              </p>
              <p className="body-text">
                <ul>
                  <li>Tier 2: At least 15 active traders using your referral codes per week and a combined weekly volume of more than $5 million</li>
                  <li>Tier 3: At least 30 active traders using your referral codes per week and a combined weekly volume of more than $25 million</li>
                </ul>
              </p>

              <p className="body-text">
              If you believe your account fulfils this criteria, please submit your application form at (site)
              </p>

              <p className="body-text">
              After filling in the form please contact us through (address/site/platform) so we can follow up your submission.
              </p>

              <p className="body-text">
              Commission and cashback apply to the opening and closing fees for leverage trades.
              </p>

              <p className="body-text">
              The opening and closing fees on Metavault.Trade are 0.1%. There is no price impact for trades and zero spread for tokens such as BTC and ETH. Fee-commissions are calculated before fee-cashback, so referrers earn on the full maker fee. They also earn from what would otherwise be spread on other exchanges. As a result, referrers will earn equivalent amounts of commissions per volume on Metavault.Trade when compared to referral programs on other exchanges.
              </p>

              <p className="body-text">
              Please note that there is a cap of 5,000 esMVX tokens distributed per week.
              </p>

              <p className="body-text">
              The price of esMVX will be based on the seven-day TWAP of MVX.
              </p>

              <p className="body-text">
              Tier 2 and Tier 3 rewards are open to wallet providers and other protocols as well as individuals.
              </p>

            </div>
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
