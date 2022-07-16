import React from "react";

import "./Footer.css";

import logoImg from "./img/mvx.png";
import twitterIcon from "./img/ic_twitter.svg";
import discordIcon from "./img/ic_discord.svg";
import telegramIcon from "./img/ic_telegram.svg";
import githubIcon from "./img/ic_github.svg";
import mediumIcon from "./img/ic_medium.svg";
import gitbookIcon from "./img/ic_gitbook.svg";
import ChainlinkIcon from './img/chainlink.svg'
import PolygonIcon from './img/footerpolygonnew.svg'
import linktreeIcon from "./img/linktree_white.svg";
import { NavLink } from "react-router-dom";

export default function Footer() {
  return (
    <div className="Footer">
      <div className="Footer-wrapper">
        <div className="Footer-logo">
        <img src={logoImg} alt="MetaMask"/><span className="mx-2" style={{fontSize:25}}><b>MVX</b></span>
        </div>
        <div>
          <p>Born out of the <a href="https://metavault.org/" target="_blank" className="ahreftextcolorfooter">Metavault DAO</a> community!</p>
        </div>
        <div className="Footer-social-link-block smallscreensize">
          <a className="App-social-link" href="https://twitter.com/MetavaultTRADE/" target="_blank" rel="noopener noreferrer">
            <img src={twitterIcon} alt="Twitter" />
          </a>
          <a className="App-social-link" href="https://medium.com/@metavault.trade" target="_blank" rel="noopener noreferrer">
            <img src={mediumIcon} alt="Medium" />
          </a> 
          <a className="App-social-link" href="https://github.com/metavaultorg/" target="_blank" rel="noopener noreferrer">
            <img src={githubIcon} alt="Github" />
          </a>
          <a className="App-social-link" href="https://docs.metavault.trade/" target="_blank" rel="noopener noreferrer">
            <img src={gitbookIcon} alt="Gitbook" />
          </a> 
          <a className="App-social-link" href="https://t.me/MetavaultTrade/" target="_blank" rel="noopener noreferrer">
            <img src={telegramIcon} alt="Telegram" />
          </a>
          <a className="App-social-link" href="https://linktr.ee/metavaulttrade" target="_blank" rel="noopener noreferrer">
            <img src={linktreeIcon} alt="Linktree" />
          </a>
          <a className="App-social-link" href="https://discord.gg/metavault" target="_blank" rel="noopener noreferrer">
            <img src={discordIcon} alt="Discord" />
          </a>
        </div>
       <div className="row justify-content-md-center" >
         <div className="col-lg-4 col-md-6 col-sm-6 col-xs-12 mt-2  d-sm-block d-md-none d-lg-none">
            <div className="">
              <div>
                <NavLink to="/referral-terms" className="Footer-link" activeClassName="active">
                  Referral Terms
                </NavLink>
              </div>
            </div>
         </div>
         <div className="col-lg-4 col-md-6 col-sm-5 col-xs-12 d-sm-block d-md-none d-lg-none">
          <img src={ChainlinkIcon} className="poweredbyiconsize"/> <img src={PolygonIcon} className="poweredbyiconsize mx-2"/>
        </div>
        </div>  

        <div className="row justify-content-md-center">
          <div className="col-lg-3 col-md-3 d-none d-md-block d-lg-block">
              <img src={ChainlinkIcon} className="poweredbyiconsize"/> 
          </div>
          <div className="col-lg-3 col-md-4  d-none d-md-block d-lg-block">
           
                <div>
                  <NavLink to="/referral-terms" className="Footer-link" activeClassName="active">
                    Referral Terms
                  </NavLink>
                </div>
        
          </div> 
          <div className="col-lg-3 col-md-3  d-none d-md-block d-lg-block">
            <img src={PolygonIcon} className="poweredbyiconsize mx-2"/>
          </div>
        </div>


      </div>
    </div>
  );
}
