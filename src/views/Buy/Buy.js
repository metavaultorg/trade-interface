import React, { useEffect } from "react";
import Footer from "../../Footer";
import "./Buy.css";
import TokenCard from "../../components/TokenCard/TokenCard";
import BuyMVXIcon from "../../img/ic_buy_mvlp.svg";
import SEO from "../../components/Common/SEO";
import { getPageTitle } from "../../Helpers";

export default function BuyMVXMVLP(props) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <SEO title={getPageTitle("+ LIQ. or MVX")}>
      <div className="BuyMVXMVLP page-layout">
        <div className="BuyMVXMVLP-container default-container buypage-container-pd" >

              <div className="section-title-block2   mb-5" >
                <div className="section-title-icon"><img src={BuyMVXIcon} alt="BuyMVXIcon" /></div>
                <div className="section-title-content">
                <div className="Page-title">BUY</div>
                  <div className="Page-description">MVX or MVLP</div>
                </div>
              </div>
          <TokenCard />
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
