// ==UserScript==
// @name         VNTT翻译辅助
// @namespace    http://tampermonkey.net/
// @version      0.64
// @description  为VNTT翻译平台集合机器翻译/术语提示/翻译记忆等常用CAT功能
// @author       元宵
// @match        https://a.vntt.app/project*
// @connect      miraitranslate.com
// @connect      fanyi.baidu.com
// @connect      translate.google.com
// @connect      fanyi.qq.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

const transdict = {
    '百度翻译': translate_baidu,
    '腾讯翻译': translate_tencent,
    '谷歌翻译': translate_gg,
    'Mirai翻译': translate_mirai,
};
const startup = {
    '百度翻译': translate_baidu_startup,
    '腾讯翻译': translate_tencent_startup,
    '谷歌翻译': translate_gg_startup,
    'Mirai翻译': translate_mirai_startup
};

let currentRow;

(function () {
    'use strict';
    console.log(`【VNTT翻译辅助】启动`);
    // 翻译时才启动
    document.querySelectorAll('tr.find-row').forEach(element => {
        const ori = element.getElementsByClassName('original')[0]
        const edit = element.getElementsByClassName('editable-click')[0]
        // 如果没有编辑框 跳过
        if (!edit) {
            return
        }
        let MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        let observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === "attributes") {
                    if (edit.style.display === "none") {
                        // 阻止编辑框 随便乱消失乱commit
                        element.classList.add("editable-container")
                        // 关闭之前的编辑框
                        if (currentRow) {
                            let cancels = currentRow.getElementsByClassName('editable-cancel')
                            if (cancels.length > 0) {
                                cancels[0].click()
                            }
                        }
                        currentRow = element
                        // 文本类
                        const jpText = ToCDB(ori.innerText)
                        const chText = GetMemText(jpText, '')
                        const editArea = element.getElementsByClassName('translation-area')[0]
                        const submit = element.getElementsByClassName('editable-submit')[0]
                        // 翻译项目的角色和术语库
                        const projectCodeName = document.getElementById("project_codename").value
                        let glossary = new Map()
                        let character = new Map()
                        const meta_glossary = sessionStorage.getItem(projectCodeName + ".zh.meta_glossary")
                        if (meta_glossary !== null) {
                            glossary = new Map(Object.entries(JSON.parse(meta_glossary)))
                        }
                        const meta_character = sessionStorage.getItem(projectCodeName + ".zh.meta_character")
                        if (meta_character !== null) {
                            character = new Map(Object.entries(JSON.parse(meta_character)))
                        }
                        let words = new Map()
                        let phrases = new Map()
                        glossary.forEach(function (value, key) {
                            if (jpText.includes(key)) {
                                words.set(key, value)
                                phrases.set(key, value)
                            }
                        })
                        character.forEach(function (value, key) {
                            if (jpText.includes(key)) {
                                words.set(key, value)
                                phrases.set(key, value)
                            }
                        })
                        // 加复制原文按钮
                        let copyBtn = document.createElement('button')
                        copyBtn.type = 'button'
                        copyBtn.className = 'btn btn-primary btn-sm'
                        copyBtn.innerHTML = '复制原文';
                        copyBtn.style.cssText = 'margin-right: 7px; background-color: #a76e28; border-color: #a76e28'
                        copyBtn.addEventListener('click', () => {
                            editArea.value = jpText
                        })
                        submit.before(copyBtn)
                        // 加复制机翻按钮
                        let copyMTBtn = document.createElement('button')
                        copyMTBtn.type = 'button'
                        copyMTBtn.className = 'btn btn-primary btn-sm'
                        copyMTBtn.innerHTML = '复制机翻';
                        copyMTBtn.style.cssText = 'margin-right: 7px; background-color: #28a745; border-color: #28a745'
                        copyMTBtn.addEventListener('click', () => {
                            editArea.value = ToCDB(element.getElementsByClassName("mt-text")[0].innerText)
                        })
                        submit.before(copyMTBtn)
                        // 加术语和代码块按钮
                        GetUniCodes(jpText).forEach(function (value) {
                            if (value !== "") {
                                words.set(value, value)
                            }
                        })
                        let has = false
                        words.forEach(function (value, key) {
                            has = true
                            let codeCopyBtn = document.createElement('button')
                            codeCopyBtn.type = 'button'
                            codeCopyBtn.className = 'btn btn-primary btn-sm'
                            codeCopyBtn.title = key
                            codeCopyBtn.innerHTML = value
                            codeCopyBtn.style.cssText = 'padding: 1px 6px; font-size: 14px; background-color: #6c757d; border-color: #6c757d; margin: 4px 4px; margin-left: 0px'
                            codeCopyBtn.addEventListener('click', () => {
                                insertText(editArea, codeCopyBtn.innerHTML)
                            })
                            editArea.before(codeCopyBtn)
                        })
                        if (has) {
                            window.scrollBy(0, 40)
                        }
                        // 查询重复语句
                        FindDuplicate(ori.innerText, submit, editArea).then()
                        // 有翻译记忆采用翻译记忆
                        // 无翻译记忆开启机翻
                        if (chText !== '') {
                            sleep(50).then(() => {
                                editArea.value = chText
                            });
                            if (GetCodes(jpText).length === GetCodes(chText).length) {
                                if (edit.innerText === "Empty") {
                                    sleep(50).then(() => {
                                        submit.click()
                                    });
                                }
                            }
                        }
                        if (chText === '' || edit.innerText !== "Empty") {
                            RequestTranslate(ori, jpText, phrases).then()
                        }
                    } else {
                        // 阻止编辑框 随便乱消失乱commit
                        element.classList.remove("editable-container")
                        // 关闭机翻显示
                        element.querySelectorAll('span.mt-split, span.mt-text').forEach(element => {
                            element.style.display = "none"
                        })
                        // 保存翻译记忆
                        SetMemText(ori.innerText, edit.innerText)
                    }
                }
            })
        })
        observer.observe(edit, {
            attributes: true, //configure it to listen to attribute changes,
            attributeFilter: ['style']
        })
    });
})();

// 共用方法
String.prototype.trim = function (char, type) {
    if (char) {
        if (type === "left") {
            return this.replace(new RegExp("^" + char + "+", "g"), "");
        } else if (type === "right") {
            return this.replace(new RegExp("" + char + "+$", "g"), "");
        }
        return this.replace(new RegExp("^" + char + "+|" + char + "+$", "g"), "");
    }
    return this.replace(/^s+|s+$/g, "");
};

// sleep time expects milliseconds
function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function insertText(obj, str) {
    if (document.selection) {
        // older versions of Internet Explorer
        let sel = document.selection.createRange();
        sel.text = str;
    } else if (typeof obj.selectionStart === 'number' && typeof obj.selectionEnd === 'number') {
        // 覆盖选择的文字
        let startPos = obj.selectionStart,
            endPos = obj.selectionEnd,
            cursorPos = startPos,
            tmpStr = obj.value;
        obj.value = tmpStr.substring(0, startPos) + str + tmpStr.substring(endPos, tmpStr.length);
        cursorPos += str.length;
        obj.selectionStart = obj.selectionEnd = cursorPos;
    } else {
        // 直接在后面追加
        obj.value += str;
    }
    obj.focus()
}


function SetMemText(jpText, chText) {
    if (chText === '' || chText === 'Empty') {
        return
    }
    const regex = /[\x20-\x7e]+/g
    jpText = ToCDB(jpText)
    chText = ToCDB(chText)
    GM_setValue(jpText, chText)
    let codes = jpText.match(regex)
    let jpTextNC = jpText.replace(regex, '')
    if (codes && jpTextNC !== '') {
        GM_setValue(jpTextNC, chText)
    }
}

function GetMemText(jpText) {
    const regex = /[\x20-\x7e]+/g
    jpText = ToCDB(jpText)
    // 有记忆直接返回
    let mmText = GM_getValue(jpText)
    if (mmText) {
        return mmText
    }
    // 去除代码块后为空 说明全是代码 返回原代码
    let jpTextNC = jpText.replace(regex, '')
    if (jpTextNC === '') {
        return jpText
    }
    // 匹配去除代码块的文本 匹配不上返回空
    mmText = GM_getValue(jpTextNC)
    if (!mmText) {
        return ''
    }
    // 能匹配上说明可以适用代码智能补全
    let codes = jpText.match(regex)
    if (!codes) {
        codes = []
    }
    let words = mmText.split(regex)
    let chText = words[0]
    for (let i = 1; i < words.length; i++) {
        if (i - 1 < codes.length) {
            chText += codes[i - 1]
        }
        chText += words[i]
    }
    return chText
}

function GetCodes(jpText) {
    const regex = /[\x20-\x7e]+/g
    let codes = jpText.match(regex)
    if (!codes) {
        return []
    }
    return codes
}

function GetUniCodes(jpText) {
    const regex = /[\x20-\x7e]+/g
    let codes = jpText.match(regex)
    if (!codes) {
        return []
    }
    return codes.filter(function (item, index, arr) {
        // 元素长度等于1 不会是代码 忽略
        if (item.length <= 1) {
            return false
        }
        // 原始数组中的第一个索引==当前索引值 如果不满足则为重复元素
        return arr.indexOf(item, 0) === index;
    });
}

function ToCDB(str) {
    let tmp = "";
    // 个别奇葩符号
    str = str.replace(/×/g, "x")
    // 全角英数字转半角
    for (let i = 0; i < str.length; i++) {
        if ((str.charCodeAt(i) >= 0xFF10 && str.charCodeAt(i) <= 0xFF19) ||
            (str.charCodeAt(i) >= 0xFF21 && str.charCodeAt(i) <= 0xFF3A) ||
            (str.charCodeAt(i) >= 0xFF41 && str.charCodeAt(i) <= 0xFF5A)) {
            tmp += String.fromCharCode(str.charCodeAt(i) - 65248);
        } else {
            tmp += String.fromCharCode(str.charCodeAt(i));
        }
    }
    return tmp
}

async function RequestTranslate(ori, jpText, phrases) {
    const choice = GM_getValue('translate_choice', '百度翻译')
    let text = sessionStorage.getItem(choice + '-' + jpText)
    if (!text) {
        await startup[choice]().then()
        await transdict[choice](jpText, phrases).then(s => {
            text = s
        })
    }
    if ((text || "").length === 0) text = '翻译异常';
    let spanNodes = ori.parentNode.querySelectorAll('span.mt-split, span.mt-text')
    if (spanNodes.length > 0) {
        spanNodes.forEach(element => {
            element.style.display = ""
            if (element.className === 'mt-text') {
                element.innerText = text
            }
        })
    } else {
        const spanNode1 = document.createElement('span');
        spanNode1.style.whiteSpace = "pre-wrap"
        spanNode1.innerText = text
        spanNode1.className = "mt-text"
        spanNode1.id = "machine-trans"
        ori.after(spanNode1)
        const spanNode2 = document.createElement('span')
        spanNode2.innerHTML = "<br>-----------　<select class='translate_select'></select>　-----------<br><br>"
        spanNode2.className = "mt-split"
        let select = spanNode2.getElementsByClassName('translate_select')[0]
        for (const transdictKey in transdict) {
            const option = document.createElement('option')
            option.value = transdictKey
            option.text = transdictKey
            select.appendChild(option)
        }
        select.value = choice
        select.addEventListener('change', e => {
            GM_setValue('translate_choice', e.target.value)
            console.log("set " + e.target.value)
            ori.parentNode.getElementsByClassName('mt-text')[0].innerText = "切换中..."
            RequestTranslate(ori, jpText, phrases)
        })
        ori.after(spanNode2)
    }
}

// 查询重复语句
async function FindDuplicate(jpText, submit, editArea) {
    const searchUrl = 'https://a.vntt.app/project/hssh-renpy-tl-v3/search/ja/zh?original=true&exact=true&q=' + jpText
    console.log(searchUrl)
    const options = {
        method: 'GET',
        url: searchUrl,
    }
    const res = await Request(options);
    const length = res.responseText.split('<div class="original">').length
    const chText = /(?<="Update translation">).+(?=<\/a>)/g.exec(res.responseText)
    if (length < 3 || !chText) {
        return
    }
    // 加提示
    const div = document.createElement("div");
    div.style.background = "#FFE4E1";
    div.style.borderRadius = "5px";
    div.style.color = "black";
    div.style.padding = "10px";
    div.style.margin = "2px 0px 8px 0px";
    const firstCatch = '同项目下已有以下翻译，是否采用？<a class="duplicate_notify" href="javascript:void(0);">采用该翻译</a> '
    const afterCatch = '同项目下有相同的原文，如需修改译文，请'
    const newWindow = '<a href="' + searchUrl + '" target="view_window">打开新窗口统一修改</a><br>'
    const splitLine = '----------------------------------------------------------<br>'
    if (editArea.value) {
        div.innerHTML = afterCatch + newWindow;
    } else {
        div.innerHTML = firstCatch + newWindow + splitLine + chText;
        // 加一个监听
        div.getElementsByClassName('duplicate_notify')[0].addEventListener('click', () => {
            editArea.value = chText
            submit.click()
        })
    }
    editArea.before(div)
}

// 百度翻译
function tk(a, b) {
    let e = [];
    let f = 0;
    let bParts = b.split(".");
    b = Number(bParts[0]) || 0;
    for (let g = 0; g < a.length; g++) {
        let k = a.charCodeAt(g);
        if (k < 128) {
            e[f++] = k;
        } else if (k < 2048) {
            e[f++] = k >> 6 | 192;
            e[f++] = k & 63 | 128;
        } else if (k >= 55296 && k <= 56319 && g + 1 < a.length) {
            let nextK = a.charCodeAt(g + 1);
            if (nextK >= 56320 && nextK <= 57343) {
                k = ((k & 1023) << 10 | nextK & 1023) + 65536;
                e[f++] = k >> 18 | 240;
                e[f++] = k >> 12 & 63 | 128;
                e[f++] = k >> 6 & 63 | 128;
                e[f++] = k & 63 | 128;
                g++;
            }
        } else {
            e[f++] = k >> 12 | 224;
            e[f++] = k >> 6 & 63 | 128;
            e[f++] = k & 63 | 128;
        }
    }
    a = b;
    for (f = 0; f < e.length; f++) a = Fo(a + e[f], "+-a^+6");
    a = Fo(a, "+-3^+b+-f");
    a ^= Number(bParts[1]) || 0;
    0 > a && (a = (a & 2147483647) + 2147483648);
    a %= 1E6;
    return a.toString() + "." + (a ^ b)
}

function Fo(a, b) {
    for (let c = 0; c < b.length - 2; c += 3) {
        let d = b.charAt(c + 2);
        d = "a" <= d ? d.charCodeAt(0) - 87 : Number(d);
        d = "+" === b.charAt(c + 1) ? a >>> d : a << d;
        a = "+" === b.charAt(c) ? a + d & 4294967295 : a ^ d
    }
    return a
}

async function translate_baidu_startup() {
    if (sessionStorage.getItem('baidu_gtk') && sessionStorage.getItem('baidu_token')) return;
    const options = {
        method: 'GET',
        url: 'https://fanyi.baidu.com',
    }
    const res = await Request(options);
    sessionStorage.setItem('baidu_token', /token: '(.*?)'/.exec(res.responseText)[1])
    sessionStorage.setItem('baidu_gtk', /window\.gtk = "(.*?)"/.exec(res.responseText)[1])
}

async function translate_baidu(raw) {
    const processed_raw = raw.length > 30 ? (raw.substr(0, 10) + raw.substr(~~(raw.length / 2) - 5, 10) + raw.substr(-10)) : raw;//process
    const tk_key = sessionStorage.getItem('baidu_gtk');
    const token = sessionStorage.getItem('baidu_token');//get token
    const options = {
        method: "POST",
        url: 'https://fanyi.baidu.com/v2transapi',
        data: 'from=auto&to=zh&query=' + encodeURIComponent(raw) + '&simple_means_flag=3&sign=' + tk(processed_raw, tk_key) + "&token=" + token + "&domain=common",
        headers: {
            "referer": 'https://fanyi.baidu.com',
            "Content-Type": 'application/x-www-form-urlencoded; charset=UTF-8',
        },
    }
    return await Translate('百度翻译', raw, options, res => JSON.parse(res).trans_result.data.map(item => item.dst).join('\n'))
}

// Mirai翻译
async function translate_mirai_startup() {
    // if(sessionStorage.getItem('mirai_tran'))return;
    const options = {
        method: 'GET',
        url: 'https://miraitranslate.com/trial',
    }
    const res = await Request(options);
    sessionStorage.setItem('mirai_tran', /tran = "(.*?)"/.exec(res.responseText)[1])
}

async function translate_mirai(raw, phrases) {
    let adaptPhrases = []
    phrases.forEach(function (value, key) {
        adaptPhrases.push({
            source: key,
            target: value
        })
    })
    const tran = sessionStorage.getItem('mirai_tran')
    const jsonData = {
        input: raw,
        source: "ja",
        target: "zh",
        profile: "inmt",
        filter_profile: "nmt",
        tran: tran,
        InmtTarget: "",
        InmtTranslateType: "gisting",
        usePrefix: false,
        adaptPhrases: adaptPhrases,
        zt: false
    }
    const options = {
        method: "POST",
        url: 'https://trial.miraitranslate.com/trial/api/translate.php',
        data: JSON.stringify(jsonData),
        headers: {
            "Content-Type": 'application/json',
        },
    }
    return await Translate('Mirai翻译', raw, options, translate_mirai_post)
}

function translate_mirai_post(res) {
    let tran = JSON.parse(res).outputs[0].output[0].translation
    tran = tran.replace(/ /g, "")
    tran = tran.replace(/!/g, "！")
    tran = tran.replace(/\?/g, "？")
    tran = tran.replace(/^“/, "「")
    tran = tran.replace(/”$/, "」")
    tran = tran.replace(/\.\.\.+/g, "……")
    return tran
}

// 谷歌翻译
async function translate_gg_startup() {
    // do nothing
}

async function translate_gg(raw) {
    const options = {
        method: "POST",
        url: "https://translate.google.com/_/TranslateWebserverUi/data/batchexecute",
        data: "f.req=" + encodeURIComponent(JSON.stringify([[["MkEWBc", JSON.stringify([[raw, "auto", "zh-CN", true], [null]]), null, "generic"]]])),
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "Host": "translate.google.com",
        },
        anonymous: true,
        nocache: true,
    }
    return await Translate('谷歌翻译', raw, options, res => JSON.parse(JSON.parse(res.slice(res.indexOf('[')))[0][2])[1][0][0][5].map(item => item[0]).join(''))
}


// 腾讯翻译
async function translate_tencent_startup() {
    // token刷新
    setTimeout(translate_tencent_startup, 10000)
    const base_options = {
        method: 'GET',
        url: 'https://fanyi.qq.com',
        anonymous: true,
        headers: {
            "User-Agent": "test",
        }
    }
    const base_res = await Request(base_options)
    const uri = /reauthuri = "(.*?)"/.exec(base_res.responseText)[1]
    const options = {
        method: 'POST',
        url: 'https://fanyi.qq.com/api/' + uri
    }
    const res = await Request(options);
    const data = JSON.parse(res.responseText);
    sessionStorage.setItem('tencent_qtv', data.qtv)
    sessionStorage.setItem('tencent_qtk', data.qtk)
}


async function translate_tencent(raw) {
    const qtk = sessionStorage.getItem('tencent_qtk'), qtv = sessionStorage.getItem('tencent_qtv');
    const options = {
        method: 'POST',
        url: 'https://fanyi.qq.com/api/translate',
        data: `source=auto&target=zh&sourceText=${encodeURIComponent(raw)}&qtv=${encodeURIComponent(qtv)}&qtk=${encodeURIComponent(qtk)}&sessionUuid=translate_uuid${Date.now()}`,
        headers: {
            "Host": "fanyi.qq.com",
            "Origin": "https://fanyi.qq.com",
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": "https://fanyi.qq.com/",
            "X-Requested-With": "XMLHttpRequest",
        }
    }
    return await Translate('腾讯翻译', raw, options, res => JSON.parse(res).translate.records.map(e => e.targetText).join(''))
}

async function Translate(name, raw, options, processor) {
    let tmp = "";
    try {
        const data = await Request(options);
        tmp = data.responseText;
        const result = await processor(tmp);
        if (result) sessionStorage.setItem(name + '-' + raw, result);
        return result
    } catch (err) {
        throw {
            responseText: tmp,
            err: err
        }
    }
}

function Request(options) {
    return new Promise((resolve, reject) => GM_xmlhttpRequest({...options, onload: resolve, onerror: reject}))
}