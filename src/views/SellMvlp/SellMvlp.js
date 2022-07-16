import { useEffect } from "react";

export default function SellMvlp(props) {
  useEffect(() => {
    window.location.href = "/buy_mvlp#redeem";
  }, []);
  return <div className="Page page-layout"></div>;
}
