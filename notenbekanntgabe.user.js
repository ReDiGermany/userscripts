// ==UserScript==
// @name         Notenbekanntgabe
// @namespace    https://github.com/ReDiGermany/userscripts
// @version      3.4
// @description  Refreshes the "Notenbekanntgabe" and adds a quick summery including the weighted average grade in the title.
// @author       Max 'ReDiGermany' Kruggel
// @match        https://www3.primuss.de/cgi-bin/pg_Notenbekanntgabe/index.pl
// @icon         https://www3.primuss.de/favicon.ico
// @grant        none
// @updateURL    https://github.com/ReDiGermany/userscripts/raw/main/notenbekanntgabe.user.js
// ==/UserScript==

HTMLElement.prototype.numberIfy = function(){
    try{
        return parseFloat(this.innerText.replace(/,/,"."))
    }catch(e){}
    return 0;
}

class PrimussNotenbekanntgabe {
    ects={}

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

    // Parses the HTML table to a object of ects {name:ects}
    parseECTS(html){
        let ret = {};
        const table = html.querySelectorAll("table")[5];
        const rows = table.querySelectorAll("tr");

        for(let i=1;i<rows.length;i++){
            const td = rows[i].querySelectorAll("td,th");
            try{
                const grade = td[td.length-2].numberIfy();
                const ects = td[td.length-1].numberIfy();
                if(isNaN(grade) && !isNaN(ects)){
                    ret[td[0].innerText] = ects;
                }
            }catch(e){}
        }
        return ret;
    }

    // Gets the ETCS for weighted grades
    getECTS(callback){
        this.postData('/cgi-bin/Notenblatt/index.pl',{
            User: this.getInputValueByName("User"),
            Session: this.getInputValueByName("Session"),
            Language: "de",
            FH: this.getInputValueByName("FH"),
            Portal: 1
        }, html => {
            console.log("before",this.ects)
            this.ects = this.parseECTS(html);
            console.log("after",this.ects)
            callback();
        })
    }

    getSubjectECTS(subjectName,gradeable){
        let manual = false;
        let ectsItem = 1;
        const localECTS = localStorage.getItem(subjectName);
        if(this.ects.hasOwnProperty(subjectName)){
            ectsItem = this.ects[subjectName]
        }else{
            if(localECTS!=null){
                ectsItem = parseFloat(localECTS.replace(/,/,'.'))
            }else{
                if(gradeable){
                    this.notFound.push(subjectName);
                    this.weightedPossible = false;
                }
            }
            manual = true;
        }
        return [ectsItem,manual,localECTS]
    }

    weightedPossible = true;
    notFound = [];
    html = {
        weighted_grade: (grade,ectsItem)=>{
            return ` <small class='redi_weighted_grade' style='opacity: .5'>(gewichtet: ${grade*ectsItem} | ects: ${ectsItem})</small>`
        },
        manual_box: (subjectName,localECTS)=>{
            return `<input
            onchange='(function(t){ localStorage.setItem(\"${subjectName}\",t.value); })(this);return false;'
            name='${subjectName}'
            class='redi_input'
            placeholder='ects'
            style='width: 30px'
            type='text'
            value='${localECTS==null?"":localECTS}' />`
        },
        table_sum: (d)=>{
            return `<tr>
                <td colspan="5">
                    Last Check: ${d}
                </td>
                <td>
                    Ungewichtet: ${this.unweigted_total_grades/this.number_found_grades}
                    <b class="redi_weighted_grade"><br />Gewichtet: ${this.weighted_grade/this.ects_total}</b>
                </td>
                <td></td>
            </tr>`
        }
    };

    number_found_grades = 0;
    weighted_grade = 0;
    ects_total = 0;
    unweigted_total_grades = 0;
    number_total_grades=0;

    gradeIfy(gradeable,grade,manual,localECTS,ectsItem){
        if(gradeable){
            try{
                const grd = grade.numberIfy();
                this.unweigted_total_grades += grd;
                this.ects_total += ectsItem;
                this.weighted_grade += grd*ectsItem;
                grade.innerHTML += this.html.weighted_grade(grd,ectsItem);
            }catch(e){}
            this.number_found_grades++;
            if(manual){
                td[td.length-2].innerHTML += this.html.manual_box(subjectName,localECTS);
            }
        } else grade.setAttribute("style","opacity: 0");
    }

    checkAdmission(grade,td){
        if(grade.innerHTML=="erfolgreich"){
            this.number_total_grades--;
            for(let j=0;j<td.length;j++){
                td[j].setAttribute("style","background: rgba(0,0,0,.1)");
            }
        }
    }

    addHooks(){
        const inputs = document.querySelectorAll(".redi_input");
        for(let inpi = 0;inpi<inputs.length;inpi++){
            inputs[inpi].addEventListener("change",function(){ console.log("change") },false);
        }
    }

    // Parses the current grade board and calculates the weighted average grade
    parseData(){
        //console.log(ects)

        // (Re)Set data
        this.number_found_grades = 0;
        this.weighted_grade = 0;
        this.ects_total = 0;
        this.unweigted_total_grades = 0;
        const table_rows = document.querySelectorAll(".table2 tbody:last-of-type tr");
        this.number_total_grades=table_rows.length;
        this.weightedPossible = true;
        this.notFound = [];

        for(let i=0;i<table_rows.length;i++){
            const td = table_rows[i].querySelectorAll("td");
            const subjectName = td[2].innerHTML;
            const grade = td[td.length-2].getElementsByTagName("b")[0];
            const gradeable = grade.innerHTML!="Korrektur noch nicht abgeschlossen" && grade.innerHTML!="erfolgreich";

            const [ectsItem,manual,localECTS] = this.getSubjectECTS(subjectName,gradeable);

            // Outline admission requirements
            this.checkAdmission(grade,td);

            // Adding graded info to HTML and calculating average grades
            this.gradeIfy(gradeable,grade,manual,localECTS,ectsItem)

            this.addHooks();
        }

        this.hideIfUnweighted();
        this.showSummery();
    }

    showSummery(){
        const date = new Date().toLocaleTimeString();
        document.querySelectorAll(".table2 tbody:last-of-type")[0].innerHTML += this.html.table_sum(date);

        // Adding meta info
        let grade = (this.weighted_grade/this.ects_total);
        if(!this.weightedPossible) grade = (this-unweigted_total_grades/this.number_found_grades);
        document.title = `${this.number_found_grades}/${this.number_total_grades} (${date}) (${grade}) :: Primuss`;
    }

    hideIfUnweighted(){
        if(!this.weightedPossible){
            const d1 = document.getElementsByClassName("redi_weighted_grade");
            for(let i1=0;i1<d1.length;i1++){
                d1[i1].style.display="none";
            }
        }

    }

    show(){
        var L = document.getElementById("Notenspiegel");
        if(L==null || (L!=null && (L.innerHTML=='' || L.style.display=="none"))){
            shownoten();
            setTimeout(()=>{ this.parseData() },1000)
        }
    }

    constructor() {
        this.getECTS(()=>{
            this.show()
            setInterval(()=>{ this.show() },15*1000);
        })
    }
}

(function() {
    new PrimussNotenbekanntgabe();
})();