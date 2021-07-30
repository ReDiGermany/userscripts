// ==UserScript==
// @name         WeWash Position Tracker
// @namespace    https://github.com/ReDiGermany/userscripts
// @version      0.1
// @description  Tracks the current Position in queue into the title
// @author       Max 'ReDiGermany' Kruggel
// @match        https://app.we-wash.com/n/home/overview
// @icon         https://www.google.com/s2/favicons?domain=we-wash.com
// @grant        none
// @updateURL    https://github.com/ReDiGermany/userscripts/blob/main/positiontracker.user.js
// ==/UserScript==

function check(){
    try{
        var n = document.querySelectorAll('[aria-label="CardReservationCancel"]')[0].parentElement.querySelectorAll("svg")[0].parentElement.querySelectorAll('[dir="auto"]')[0].innerText;
        document.title = "Platz "+n+" - WeWash";
    }catch(e){}
}

(function() {
    'use strict';
    check();
    setInterval(check,10*1000);
})();