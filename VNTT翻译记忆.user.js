// ==UserScript==
// @name         VNTT翻译记忆
// @namespace    https://a.vntt.app/
// @version      0.2
// @description  try to take over the world!
// @author       元宵
// @match        https://a.vntt.app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vntt.app
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
    document.querySelectorAll('tr.find-row').forEach(element => {
        let edit = element.getElementsByClassName('editable-click')[0]
        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type == "attributes") {
                    if (edit.style.display === "none") {
                        const jpText = NoNumber(element.getElementsByClassName('original')[0].innerText)
                        const jpNum = GetNumbers(element.getElementsByClassName('original')[0].innerText)
                        // edit.textContent = jpText
                        const chText = GM_getValue(jpText, '')
                        let editArea = element.getElementsByClassName('translation-area')[0]
                        let submit = element.getElementsByClassName('editable-submit')[0]
                        if (chText !== "") {
                            sleep(50).then(() => {
                                editArea.value = ToCDB(CompineText(chText, jpNum))
                                if ( edit.innerText === "Empty" ) {
                                    submit.click()
                                }
                            });
                        }
                        submit.addEventListener('click',(e)=>{
                            let tranText = editArea.value
                            GM_setValue(jpText, tranText)
                        })
                        editArea.addEventListener('keydown', function (e) {
                            if (e.key === 'Enter') {
                                let tranText = editArea.value
                                GM_setValue(jpText, tranText)
                            }
                        });
                    }
                }
            });
        });
        observer.observe(edit, {
            attributes: true, //configure it to listen to attribute changes,
            attributeFilter: ['style']
        });
    });

    // sleep time expects milliseconds
    function sleep (time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    function NoNumber(str) {
        var tmp = "";
        let has = false
        for (var i = 0; i < str.length; i++) {
            if ((str.charCodeAt(i) >= 0x20 && str.charCodeAt(i) <= 0x7E) ||
                (str.charCodeAt(i) >= 0xFF10 && str.charCodeAt(i) <= 0xFF19) ||
                (str.charCodeAt(i) >= 0xFF21 && str.charCodeAt(i) <= 0xFF3A) ||
                (str.charCodeAt(i) >= 0xFF41 && str.charCodeAt(i) <= 0xFF5A)) {
                has = true
            }
            else {
                if (has) {
                    tmp += '【数】'
                    has = false
                }
                tmp += String.fromCharCode(str.charCodeAt(i));
            }
        }
        if (has) {
            tmp += '【数】'
        }
        return tmp
    }

    function GetNumbers(str) {
        var tmp = "";
        let has = false
        for (var i = 0; i < str.length; i++) {
            if ((str.charCodeAt(i) >= 0x20 && str.charCodeAt(i) <= 0x7E) ||
                (str.charCodeAt(i) >= 0xFF10 && str.charCodeAt(i) <= 0xFF19) ||
                (str.charCodeAt(i) >= 0xFF21 && str.charCodeAt(i) <= 0xFF3A) ||
                (str.charCodeAt(i) >= 0xFF41 && str.charCodeAt(i) <= 0xFF5A)) {
                if (has) {
                    tmp += '【文】'
                    has = false
                }
                tmp += String.fromCharCode(str.charCodeAt(i));
            }
            else {
                has = true
            }
        }
        if (has) {
            tmp += '【文】'
        }
        return tmp.trim('【文】').split('【文】')
    }

    function CompineText(chText, numbers) {
        var tmp = "";
        let numbersIndex = 0
        let chTextArr = NoNumber(chText).split('【数】')
        for (var i = 0; i < chTextArr.length ; i++) {
            tmp += chTextArr[i]
            if (numbersIndex < numbers.length) {
                tmp += numbers[numbersIndex]
                numbersIndex++
            }
        }
        return tmp
    }

    function ToCDB(str) {
        var tmp = "";
        for (var i = 0; i < str.length; i++) {
            if ((str.charCodeAt(i) >= 0xFF10 && str.charCodeAt(i) <= 0xFF19) ||
                (str.charCodeAt(i) >= 0xFF21 && str.charCodeAt(i) <= 0xFF3A) ||
                (str.charCodeAt(i) >= 0xFF41 && str.charCodeAt(i) <= 0xFF5A)) {
                tmp += String.fromCharCode(str.charCodeAt(i) - 65248);
            }
            else {
                tmp += String.fromCharCode(str.charCodeAt(i));
            }
        }
        return tmp
    }

    String.prototype.trim = function (char, type) {
        if (char) {
            if (type == "left") {
                return this.replace(new RegExp("^"+char+"+", "g"), "");
            } else if (type == "right") {
                return this.replace(new RegExp(""+char+"+$", "g"), "");
            }
            return this.replace(new RegExp("^"+char+"+|"+char+"+$", "g"), "");
        }
        return this.replace(/^s+|s+$/g, "");
    };

})();