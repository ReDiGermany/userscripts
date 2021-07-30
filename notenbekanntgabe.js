// ==UserScript==
// @name         Notenbekanntgabe
// @namespace    https://redigermany.de/
// @version      2.0
// @description  Refreshes the "Notenbekanntgabe" and adds a quick summery including the weighted average grade in the title.
// @author       Max 'ReDiGermany' Kruggel
// @match        https://www3.primuss.de/cgi-bin/pg_Notenbekanntgabe/index.pl
// @icon         https://www3.primuss.de/favicon.ico
// @grant        none
// @updateURL    https://github.com/ReDiGermany/userscripts/blob/main/notenbekanntgabe.js
// ==/UserScript==

class PrimussNotenbekanntgabe {

    // Getting input value by its name
    getInputValueByName(q){
        var doc = document.querySelectorAll("input[name='"+q+"']");

        if(doc.length) return doc[0].value;
        return "";
    }

    // Using XHR Post request to request other stuff from primuss
    postData(url,data,callback){
        var http = new XMLHttpRequest();
        var params = '';
        for(var k in data) params += '&'+k+'='+data[k];

        http.open('POST', url, true);
        http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        http.onreadystatechange = function() {
            if(http.readyState == 4 && http.status == 200) {
                // Using a hacky way to htmlify the response body
                var temp = document.createElement('div');
                temp.innerHTML = http.responseText;

                if(callback!=undefined) callback(temp);
            }
        }
        http.send(params);
    }

    // Gets the ETCS for weighted grades
    getECTS(callback){
        this.postData('/cgi-bin/Notenblatt/index.pl',{
            User: this.getInputValueByName("User"),
            Session: this.getInputValueByName("Session"),
            Language: "de",
            FH: this.getInputValueByName("FH"),
            Portal: 1
        },function(html){

            var ret = {};
            var table = html.querySelectorAll("table")[5];
            var rows = table.querySelectorAll("tr");

            for(var i=1;i<rows.length;i++){
                var td = rows[i].querySelectorAll("td");
                try{
                    var ects = parseFloat(td[td.length-1].innerHTML.replace(/,/,"."));
                    if(ects!="NaN"){
                        ret[td[0].innerHTML] = ects;
                    }
                }catch(e){}
            }

            callback(ret);
        })
    }

    // Parses the current grade board and calculates the weighted average grade
    parseData(ects){
        //console.log(ects)

        var number_found_grades = 0;
        var number_total_grades=0;
        var table_rows = document.querySelectorAll(".table2 tbody:last-of-type tr");
        var weighted_grade = 0;
        var ects_total = 0;

        for(var i=0;i<table_rows.length;i++){
            var ectsItem = 1;
            var td = table_rows[i].querySelectorAll("td");
            var subjectName = td[2].innerHTML;
            //console.log(subjectName,ects.hasOwnProperty(subjectName),ects[subjectName])
            if(ects.hasOwnProperty(subjectName)) ectsItem = ects[subjectName]

            var grade = td[td.length-2].getElementsByTagName("b")[0];
            number_total_grades++;

            // Outline admission requirements
            if(grade.innerHTML=="erfolgreich"){
                number_total_grades--;
                for(var j=0;j<td.length;j++) td[j].setAttribute("style","background: rgba(0,0,0,.1)");
            }

            // Adding graded info to HTML and calculating average grades
            if(grade.innerHTML!="Korrektur noch nicht abgeschlossen" && grade.innerHTML!="erfolgreich"){
                try{
                    var grd = parseFloat(grade.innerText.replace(/,/,'.'));
                    ects_total += ectsItem;
                    weighted_grade += grd*ectsItem;
                    grade.innerHTML += " <small style='opacity: .5'>(gewichtet: "+grd*ectsItem+" | ects: "+ectsItem+")</small>";
                }catch(e){}
                number_found_grades++;
            } else grade.setAttribute("style","opacity: 0");
        }

        // Adding meta info
        var d = new Date().toLocaleTimeString();
        document.title = number_found_grades+'/'+number_total_grades+' ('+d+') ('+(weighted_grade/ects_total)+') :: Primuss';
        document.getElementById('Legende').innerHTML += d;
        document.getElementById('Legende').setAttribute("style","position: absolute;");
    }

    show(ects){
        const t = this;
        shownoten();
        setTimeout(function(){
            t.parseData(ects);
        },1000)
    }

    constructor() {
        const t = this;
        this.getECTS(function(ects){
            t.show(ects)
            setInterval(function(){ t.show(ects) },5*1000);
        })
    }
}

(function() {
    'use strict';
    new PrimussNotenbekanntgabe();
})();