// ==UserScript==
// @name         VNTT复制原文按钮
// @namespace    https://a.vntt.app/
// @version      0.2
// @description  try to take over the world!
// @author       元宵
// @match        https://a.vntt.app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vntt.app
// @grant        GM_setClipboard
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
                        // 加复制原文按钮
                        let copyBtn = document.createElement('button')
                        copyBtn.type = 'button'
                        copyBtn.className = 'btn btn-primary btn-sm'
                        copyBtn.innerHTML = '复制原文';
                        copyBtn.style = 'margin-right: 7px; background-color: #28a745; border-color: #28a745'
                        copyBtn.addEventListener('click',()=>{
                            const jpText = ToCDB(element.getElementsByClassName('original')[0].innerText)
                            element.getElementsByClassName('translation-area')[0].value = jpText
                        })
                        element.getElementsByClassName('editable-submit')[0].before(copyBtn)
                        // 加代码块按钮
                        let codes = GetCode(ToCDB(element.getElementsByClassName('original')[0].innerText))
                        alert(document.getElementsByTagName('mark')[0].innerText)
                        if (codes[0] !== "") {
                            let has = false
                            for (var i = 0; i < codes.length; i++) {
                                if ( codes[i].length <= 1 ) {
                                    continue
                                }
                                has = true
                                let codeCopyBtn = document.createElement('button')
                                codeCopyBtn.type = 'button'
                                codeCopyBtn.className = 'btn btn-primary btn-sm'
                                codeCopyBtn.innerHTML = codes[i];
                                codeCopyBtn.style = 'padding: 1px 6px; font-size: 14px; background-color: #6c757d; border-color: #6c757d; margin: 4px 4px'
                                codeCopyBtn.addEventListener('click',()=>{
                                    insertText(element.getElementsByClassName('translation-area')[0], codeCopyBtn.innerHTML)
                                })
                                element.getElementsByClassName('translation-area')[0].before(codeCopyBtn)
                            }
                            if ( has ) {
                                window.scrollBy(0, 40)
                            }
                        }
                    }
                }
            });
        });
        observer.observe(edit, {
            attributes: true, //configure it to listen to attribute changes,
            attributeFilter: ['style']
        });
    });

    function insertText(obj,str) {
        if (document.selection) {
            let sel = document.selection.createRange();
            sel.text = str;
        } else if (typeof obj.selectionStart === 'number' && typeof obj.selectionEnd === 'number') {
            let startPos = obj.selectionStart,
                endPos = obj.selectionEnd,
                cursorPos = startPos,
                tmpStr = obj.value;
            obj.value = tmpStr.substring(0, startPos) + str + tmpStr.substring(endPos, tmpStr.length);
            cursorPos += str.length;
            obj.selectionStart = obj.selectionEnd = cursorPos;
        } else {
            obj.value += str;
        }
        obj.focus()
    }

    function GetNumbers(str) {
        var tmp = "";
        let has = false
        for (var i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) >= 0x20 && str.charCodeAt(i) <= 0x7E) {
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

    function GetCode(str) {
        let arr = str.replace( /[^\x20-\x7e]+/g,'【文】').trim('【文】').split('【文】')
        return arr.filter(function(item, index, arr) {
            // 元素长度等于1 不会是代码 忽略
            if ( item.length <= 1 ) {
                return false
            }
            // 原始数组中的第一个索引==当前索引值 如果不满足则为重复元素
            return arr.indexOf(item, 0) === index;
        });
    }

    function ToCDB(str) {
        var tmp = "";
        // 个别奇葩符号
        str = str.replace(/×/g, "x")
        // 全角英数字转半角
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
})();