// ==UserScript==
// @name         Lieferando Tracker
// @namespace    https://github.com/ReDiGermany/userscripts
// @version      0.1
// @description  Adds tracking metainfo to the title
// @author       Max 'ReDiGermany' Kruggel
// @match        https://www.lieferando.de/foodtracker*
// @icon         https://www.lieferando.de/favicon.ico
// @grant        none
// @updateURL    https://github.com/ReDiGermany/userscripts/blob/main/foodtracker.user.js
// ==/UserScript==

(function() {
    'use strict';
    function loadData(){
        var title = "";

        var n = document.querySelectorAll('#scoober-tracker svg tspan');
        if(n.length) title += n[0].innerHTML + "min";

        var t = document.querySelectorAll('#scoober-tracker h1');
        if(t.length){
            if(title!="") title += " - ";
            title += t[1].innerText;
        }

        if(title!="") document.title = title;
    }
    setInterval(loadData,10*1000);
    loadData();
})();