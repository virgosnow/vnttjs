// ==UserScript==
// @name         VNTT翻译辅助
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  为VNTT翻译平台集合机器翻译/术语提示/翻译记忆等常用CAT功能
// @author       元宵
// @match        https://a.vntt.app/*
// @connect      miraitranslate.com
// @connect      fanyi.baidu.com
// @connect      translate.google.com
// @connect      fanyi.qq.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

const transdict={'Mirai翻译':translate_mirai,'谷歌翻译':translate_gg,'腾讯翻译':translate_tencent,'百度翻译':translate_baidu,'关闭翻译':()=>{}};
const startup={'Mirai翻译':translate_mirai_startup,'腾讯翻译':translate_tencent_startup,'百度翻译':translate_baidu_startup};
const baseoptions = {
    'enable_pass_lang': {
        declare: '不翻译中文',
        default_value: false,
        change_func: self => {
            if (self.checked) sessionStorage.clear()
        }
    },
    'remove_url': {
        declare: '自动过滤url',
        default_value: true,
    },
    'show_info': {
        declare: '显示翻译源',
        default_value: true,
    }
};

const [enable_pass_lang,remove_url,show_info]=Object.keys(baseoptions).map(key=>GM_getValue(key,baseoptions[key].default_value));

const globalProcessingSave=[];

function initPanel(){
    let choice=GM_getValue('translate_choice','Mirai翻译');
    let select=document.createElement("select");
    select.className='js_translate';
    select.style='height:35px;width:100px;background-color:#fff;border-radius:17.5px;text-align-last:center;color:#000000;margin:5px 0'
    select.onchange=()=>{
        GM_setValue('translate_choice',select.value)
        title.innerText="控制面板（请刷新以应用）"
    };
    for(let i in transdict)select.innerHTML+='<option value="'+i+'">'+i+'</option>';
    //
    let enable_details = document.createElement('details')
    let mask=document.createElement('div'),dialog=document.createElement("div"),js_dialog=document.createElement("div"),title=document.createElement('p')
    //
    window.top.document.body.appendChild(mask);
    dialog.appendChild(js_dialog);
    mask.appendChild(dialog);
    js_dialog.appendChild(title)
    js_dialog.appendChild(document.createElement('p').appendChild(select));
    // js_dialog.appendChild(document.createElement('p').appendChild(enable_details));
    //
    mask.style="display: none;position: fixed;height: 100vh;width: 100vw;z-index: 99999;top: 0;left: 0;overflow: hidden;background-color: rgba(0,0,0,0.4);justify-content: center;align-items: center;"
    mask.addEventListener('click',event=>{if(event.target===mask)mask.style.display='none'});
    dialog.style='padding:0;border-radius:10px;background-color: #fff;box-shadow: 0 0 5px 4px rgba(0,0,0,0.3);';
    js_dialog.style="min-height:10vh;min-width:10vw;display:flex;flex-direction:column;align-items:center;padding:10px;border-radius:4px;color:#000";
    title.style='margin:5px 0;font-size:20px;';
    title.innerText="控制面板";
    for(let i in baseoptions){
        let temp=document.createElement('input'),temp_p=document.createElement('p');
        js_dialog.appendChild(temp_p);
        temp_p.appendChild(temp);
        temp.type='checkbox';
        temp.name=i;
        temp_p.style="display:flex;align-items: center;margin:5px 0"
        temp_p.innerHTML+=baseoptions[i].declare;
    }
    for(let i of js_dialog.querySelectorAll('input')){
        if(i.name&&baseoptions[i.name]){
            i.onclick=_=>{title.innerText="控制面板（请刷新以应用）";GM_setValue(i.name,i.checked);if(baseoptions[i.name].change_func)baseoptions[i.name].change_func(i)}
            i.checked=GM_getValue(i.name,baseoptions[i.name].default_value)
        }
    };
    for(let i of enable_details.querySelectorAll('input'))i.onclick=_=>{title.innerText="控制面板（请刷新以应用）";GM_setValue('enable_rule:'+i.name,i.checked)}
    let open=document.createElement('div');
    open.style=`z-index:9999;height:35px;width:35px;background-color:#fff;position:fixed;border:1px solid rgba(0,0,0,0.2);border-radius:17.5px;right:${GM_getValue('position_right','9px')};top:${GM_getValue('position_top','9px')};text-align-last:center;color:#000000;display:flex;align-items:center;justify-content:center;cursor: pointer;font-size:15px;user-select:none`;
    open.innerHTML="译";
    open.onclick=()=>{mask.style.display='flex'};
    open.draggable=true;
    open.addEventListener("dragstart",function(ev){this.tempNode=document.createElement('div');this.tempNode.style="width:1px;height:1px;opacity:0";document.body.appendChild(this.tempNode);ev.dataTransfer.setDragImage(this.tempNode,0,0);this.oldX=ev.offsetX-Number(this.style.width.replace('px',''));this.oldY=ev.offsetY});
    open.addEventListener("drag",function(ev){if(!ev.x&&!ev.y)return;this.style.right=Math.max(window.innerWidth-ev.x+this.oldX,0)+"px";this.style.top=Math.max(ev.y-this.oldY,0)+"px"});
    open.addEventListener("dragend",function(ev){GM_setValue("position_right",this.style.right);GM_setValue("position_top",this.style.top);document.body.removeChild(this.tempNode)});
    open.addEventListener("touchstart", ev=>{ev.preventDefault();ev=ev.touches[0];open._tempTouch={};const base=open.getClientRects()[0];open._tempTouch.oldX=base.x+base.width-ev.clientX;open._tempTouch.oldY=base.y-ev.clientY});
    open.addEventListener("touchmove",ev=>{ev=ev.touches[0];open.style.right=Math.max(window.innerWidth-open._tempTouch.oldX-ev.clientX,0)+'px';open.style.top=Math.max(ev.clientY+open._tempTouch.oldY,0)+'px';open._tempIsMove=true});
    open.addEventListener("touchend",()=>{GM_setValue("position_right",open.style.right);GM_setValue("position_top",open.style.top);if(!open._tempIsMove){mask.style.display='flex'};open._tempIsMove=false})
    window.top.document.body.appendChild(open);
    window.top.document.querySelector('.js_translate option[value='+choice+']').selected=true;
}

const rules={
    'vntt':[{
        name:'VNTT',
        matcher:/https:\/\/[a-zA-Z.]*?vntt\.app/,
        selector:e=>{return baseSelector(e, 'div[class="original"]')},
        textGetter:baseTextGetter,
        textSetter:baseTextSetter
    }]
};

(function() {
    'use strict';
    const GetActiveRule = ()=>Object.entries(rules).filter(([key])=>GM_getValue("enable_rule:"+key,true)).map(([_,group])=>group).flat().find(item=>item.matcher.test(document.location.href));
    let url=document.location.href;
    let rule=GetActiveRule();
    console.log(`【VNTT翻译辅助】启动`);
    let mtFunc = e=>{
        if(!rule)return;
        const choice=GM_getValue('translate_choice','Mirai翻译');
        // const temp=[...new Set(rule.selector(e))];
        let temp = rule.selector(e)
        for(let i=0;i<temp.length;i++){
            const now=temp[i];
            if(globalProcessingSave.includes(now))continue;
            globalProcessingSave.push(now);
            const text = rule.textGetter(now);
            if(text.length==0)continue;
            if(sessionStorage.getItem(choice+'-'+text)){
                rule.textSetter(now,choice,sessionStorage.getItem(choice+'-'+text));
                removeItem(globalProcessingSave,now)
            }else{
                check_lang(text).then(lang=>transdict[choice](text,lang)).then(s=>{
                    rule.textSetter(now,choice,s);
                    removeItem(globalProcessingSave,now);
                })
            }
        }
    };
    // 翻译项目的角色和术语库
    const projectCodeName = document.getElementById("project_codename").value
    // 翻译时才启动
    document.querySelectorAll('tr.find-row').forEach(element => {
        const edit = element.getElementsByClassName('editable-click')[0]
        let MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        let observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type == "attributes") {
                    if (edit.style.display === "none") {
                        const glossary = new Map(Object.entries(JSON.parse(sessionStorage.getItem(projectCodeName + ".zh.meta_glossary"))))
                        const character = new Map(Object.entries(JSON.parse(sessionStorage.getItem(projectCodeName + ".zh.meta_character"))))
                        const jpText = ToCDB(element.getElementsByClassName('original')[0].innerText)
                        const chText = GetMemText(jpText, '')
                        const editArea = element.getElementsByClassName('translation-area')[0]
                        const submit = element.getElementsByClassName('editable-submit')[0]
                        // 有翻译记忆采用翻译记忆
                        // 无翻译记忆开启机翻
                        if ( chText !== '' && edit.innerText === "Empty" ) {
                            sleep(50).then(() => {editArea.value = chText; submit.click()});
                        } else {
                            const choice = GM_getValue('translate_choice','Mirai翻译')
                            if (choice != '关闭翻译') {
                                PromiseRetryWrap(startup[choice]).then(()=>{document.js_translater=setInterval(mtFunc(element),20)});
                            }
                        }
                        // 加复制原文按钮
                        let copyBtn = document.createElement('button')
                        copyBtn.type = 'button'
                        copyBtn.className = 'btn btn-primary btn-sm'
                        copyBtn.innerHTML = '复制原文';
                        copyBtn.style = 'margin-right: 7px; background-color: #28a745; border-color: #28a745'
                        copyBtn.addEventListener('click',()=>{
                            element.getElementsByClassName('translation-area')[0].value = jpText
                        })
                        element.getElementsByClassName('editable-submit')[0].before(copyBtn)
                        // 加复制机翻按钮
                        let copyMTBtn = document.createElement('button')
                        copyMTBtn.type = 'button'
                        copyMTBtn.className = 'btn btn-primary btn-sm'
                        copyMTBtn.innerHTML = '复制机翻';
                        copyMTBtn.style = 'margin-right: 7px; background-color: #28a745; border-color: #28a745'
                        copyMTBtn.addEventListener('click',()=>{
                            const mtText = ToCDB(element.getElementsByClassName("mt-text")[0].innerText)
                            element.getElementsByClassName('translation-area')[0].value = mtText
                        })
                        element.getElementsByClassName('editable-submit')[0].before(copyMTBtn)
                        // 加术语和代码块按钮
                        let words = new Map()
                        glossary.forEach(function(value,key){
                            if (jpText.includes(key)) {
                                words.set(value, key)
                            }
                        })
                        character.forEach(function(value,key){
                            if (jpText.includes(key)) {
                                words.set(value, key)
                            }
                        })
                        GetCodes(jpText).forEach(function(value,key){
                            if (value !== "") {
                                words.set(value, "代码")
                            }
                        })
                        let has = false
                        words.forEach(function(value,key){
                            has = true
                            let codeCopyBtn = document.createElement('button')
                            codeCopyBtn.type = 'button'
                            codeCopyBtn.className = 'btn btn-primary btn-sm'
                            codeCopyBtn.title = value
                            codeCopyBtn.innerHTML = key;
                            codeCopyBtn.style = 'padding: 1px 6px; font-size: 14px; background-color: #6c757d; border-color: #6c757d; margin: 4px 4px; margin-left: 0px'
                            codeCopyBtn.addEventListener('click',()=>{
                                insertText(element.getElementsByClassName('translation-area')[0], codeCopyBtn.innerHTML)
                            })
                            element.getElementsByClassName('translation-area')[0].before(codeCopyBtn)
                        })
                        if ( has ) {
                            window.scrollBy(0, 40)
                        }
                        // 翻译记忆
                        submit.addEventListener('click',(e)=>{
                            SetMemText(jpText, editArea.value)
                        })
                        editArea.addEventListener('keydown', function (e) {
                            if (e.key === 'Enter') {
                                SetMemText(jpText, editArea.value)
                            }
                        })
                    } else {
                        element.querySelectorAll('span.mt-split, span.mt-text').forEach(element => {
                            element.style.display = "none"
                        })
                    }
                }

            })
        })
        observer.observe(edit, {
            attributes: true, //configure it to listen to attribute changes,
            attributeFilter: ['style']
        })
    });
    initPanel();
})();

//--综合工具区--start

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

// sleep time expects milliseconds
function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

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


function SetMemText(jpText,chText) {
    jpText = ToCDB(jpText).replace( /[\x20-\x7e]+/g,'【码】')
    chText = chText.replace( /[\x20-\x7e]+/g,'【码】')
    GM_setValue(jpText, chText)
}

function GetMemText(jpText) {
    jpText = ToCDB(jpText)
    let mmText = GM_getValue(jpText.replace( /[\x20-\x7e]+/g,'【码】'), '')
    if (mmText == '') {
        return ''
    }
    let chText = ''
    let words = mmText.replace( /[\x20-\x7e]+/g,'【码】').split('【码】')
    let codes = jpText.replace( /[^\x20-\x7e]+/g,'【文】').trim('【文】').split('【文】')
    for (let i = 0; i < words.length; i++) {
        chText+=words[i]
        if (i < codes.length) {
            chText+=codes[i]
        }
    }
    return chText
}

function GetCodes(str) {
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
    let tmp = "";
    // 个别奇葩符号
    str = str.replace(/×/g, "x")
    // 全角英数字转半角
    for (let i = 0; i < str.length; i++) {
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

function removeItem(arr,item){
    const index=arr.indexOf(item);
    if(index>-1)arr.splice(index,1);
}

function baseSelector(element,selector){
    return element.querySelectorAll(selector)
}

function baseTextGetter(e){
    return e.innerText;
}

function baseTextSetter(e,name,text){//change element text
    if((text||"").length==0)text='翻译异常';
    let spanNodes = e.parentNode.querySelectorAll('span.mt-split, span.mt-text')
    if ( spanNodes.length > 0 ) {
        spanNodes.forEach(element => {
            element.style.display = ""
        })
    } else {
        const spanNode1 = document.createElement('span');
        spanNode1.style.whiteSpace = "pre-wrap";
        spanNode1.innerText = text;
        spanNode1.className = "mt-text"
        spanNode1.id = "machine-trans"
        e.after(spanNode1);
        const spanNode2 = document.createElement('span');
        spanNode2.innerText = show_info?"\n-----------"+name+"-----------\n\n":"\n";
        spanNode2.className = "mt-split"
        e.after(spanNode2);
    }
}

function url_filter(text){
    return text.replace(/(https?|ftp|file):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/g,'');
}

async function check_lang(raw){
    // 短句子会被初判为中文 先直接返回jp
    return "jp"
}

//--综合工具区--end

//--Mirai翻译--start
async function translate_mirai_startup(){
    // if(sessionStorage.getItem('mirai_tran'))return;
    const options = {
        method:'GET',
        url:'https://miraitranslate.com/trial',
    }
    const res = await Request(options);
    sessionStorage.setItem('mirai_tran',/tran = "(.*?)"/.exec(res.responseText)[1])
}

async function translate_mirai(raw,lang){
    if(!lang){
        lang = await check_lang(raw)
    }
    const tran = sessionStorage.getItem('mirai_tran')
    const data = '{"input":"'+raw.replace(/\n/g,'\\n')+'","source":"ja","target":"zh","profile":"inmt","filter_profile":"nmt","tran":"'+tran+'","InmtTarget":"","InmtTranslateType":"gisting","usePrefix":false,"adaptPhrases":[],"zt":false}'
    const options = {
        method:"POST",
        url:'https://trial.miraitranslate.com/trial/api/translate.php',
        data:data,
        headers: {
            "Content-Type": 'application/json',
        },
    }
    return await BaseTranslate('Mirai翻译',raw,options,res=>JSON.parse(res).outputs[0].output[0].translation)
}
//--Mirai翻译--end

//--谷歌翻译--start
async function translate_gg(raw){
    const options = {
        method:"POST",
        url:"https://translate.google.com/_/TranslateWebserverUi/data/batchexecute",
        data: "f.req="+encodeURIComponent(JSON.stringify([[["MkEWBc",JSON.stringify([[raw,"auto","zh-CN",true],[null]]),null,"generic"]]])),
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "Host": "translate.google.com",
        },
        anonymous:true,
        nocache:true,
    }
    return await BaseTranslate('谷歌翻译',raw,options,res=>JSON.parse(JSON.parse(res.slice(res.indexOf('[')))[0][2])[1][0][0][5].map(item=>item[0]).join(''))
}

//--谷歌翻译--end

//--百度翻译--start
function tk(a,b){
    let d = b.split(".");
    b = Number(d[0]) || 0;
    for (var e = [], f = 0, g = 0; g < a.length; g++) {
        let k = a.charCodeAt(g);
        128 > k ? e[f++] = k :
        (2048 > k ? e[f++] = k >> 6 | 192 :
         (55296 == (k & 64512) && g + 1 < a.length && 56320 == (a.charCodeAt(g + 1) & 64512) ? (k = 65536 + ((k & 1023) << 10) + (a.charCodeAt(++g) & 1023), e[f++] = k >> 18 | 240, e[f++] = k >> 12 & 63 | 128) :
          e[f++] = k >> 12 | 224,
          e[f++] = k >> 6 & 63 | 128),
         e[f++] = k & 63 | 128)
    }
    a = b;
    for (f = 0; f < e.length; f++)a = Fo(a+e[f], "+-a^+6");
    a = Fo(a, "+-3^+b+-f");
    a ^= Number(d[1]) || 0;
    0 > a && (a = (a & 2147483647) + 2147483648);
    a %= 1E6;
    return a.toString() + "." + (a ^ b)
}
function Fo(a, b) {
    for (let c = 0; c < b.length - 2; c += 3) {
        let d = b.charAt(c + 2);
        d = "a" <= d ? d.charCodeAt(0) - 87 : Number(d);
        d = "+" == b.charAt(c + 1) ? a >>> d : a << d;
        a = "+" == b.charAt(c) ? a + d & 4294967295 : a ^ d
    }
    return a
}

async function translate_baidu_startup(){
    if(sessionStorage.getItem('baidu_gtk')&&sessionStorage.getItem('baidu_token'))return;
    const options = {
        method:'GET',
        url:'https://fanyi.baidu.com',
    }
    const res = await Request(options);
    sessionStorage.setItem('baidu_token',/token: '(.*?)'/.exec(res.responseText)[1])
    sessionStorage.setItem('baidu_gtk',/window\.gtk = "(.*?)"/.exec(res.responseText)[1])
}

async function translate_baidu(raw,lang){
    if(!lang){
        lang = await check_lang(raw)
    }
    const processed_raw = raw.length>30?(raw.substr(0,10)+raw.substr(~~(raw.length/2)-5,10)+raw.substr(-10)):raw;//process
    const tk_key = sessionStorage.getItem('baidu_gtk');
    const token = sessionStorage.getItem('baidu_token');//get token
    const options = {
        method:"POST",
        url:'https://fanyi.baidu.com/v2transapi',
        data:'from='+lang+'&to=zh&query='+encodeURIComponent(raw)+'&simple_means_flag=3&sign='+tk(processed_raw,tk_key)+"&token="+token+"&domain=common",
        headers: {
            "referer": 'https://fanyi.baidu.com',
            "Content-Type": 'application/x-www-form-urlencoded; charset=UTF-8',
        },
    }
    return await BaseTranslate('百度翻译',raw,options,res=>JSON.parse(res).trans_result.data.map(item=>item.dst).join('\n'))
}

//--百度翻译--end

//--腾讯翻译--start

async function translate_tencent_startup(){
    setTimeout(translate_tencent_startup,10000)//token刷新
    const base_options = {
        method: 'GET',
        url: 'http://fanyi.qq.com',
        anonymous:true,
        headers: {
            "User-Agent": "test",
        }
    }
    const base_res = await Request(base_options)
    const uri = /reauthuri = "(.*?)"/.exec(base_res.responseText)[1]
    const options = {
        method:'POST',
        url:'https://fanyi.qq.com/api/'+uri
    }
    const res = await Request(options);
    const data = JSON.parse(res.responseText);
    sessionStorage.setItem('tencent_qtv',data.qtv)
    sessionStorage.setItem('tencent_qtk',data.qtk)
}


async function translate_tencent(raw){
    const qtk=sessionStorage.getItem('tencent_qtk'),qtv=sessionStorage.getItem('tencent_qtv');
    const options = {
        method:'POST',
        url:'https://fanyi.qq.com/api/translate',
        data:`source=auto&target=zh&sourceText=${encodeURIComponent(raw)}&qtv=${encodeURIComponent(qtv)}&qtk=${encodeURIComponent(qtk)}&sessionUuid=translate_uuid${Date.now()}`,
        headers: {
            "Host":"fanyi.qq.com",
            "Origin":"https://fanyi.qq.com",
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": "https://fanyi.qq.com/",
            "X-Requested-With": "XMLHttpRequest",
        }
    }
    return await BaseTranslate('腾讯翻译',raw,options,res=>JSON.parse(res).translate.records.map(e=>e.targetText).join(''))
}

//--腾讯翻译--end

//--异步请求包装工具--start

async function PromiseRetryWrap(task,options,...values){
    const {RetryTimes,ErrProcesser} = options||{};
    let retryTimes = RetryTimes||5;
    const usedErrProcesser = ErrProcesser || (err =>{throw err});
    if(!task)return;
    while(true){
        try{
            return await task(...values);
        }catch(err){
            if(!--retryTimes){
                console.log(err);
                return usedErrProcesser(err);
            }
        }
    }
}

async function BaseTranslate(name,raw,options,processer){
    const toDo = async ()=>{
        let tmp;
        try{
            const data = await Request(options);
            tmp = data.responseText;
            const result = await processer(tmp);
            if(result)sessionStorage.setItem(name+'-'+raw,result);
            return result
        }catch(err){
            throw {
                responseText: tmp,
                err: err
            }
        }
    }
    return await PromiseRetryWrap(toDo,{RetryTimes:3,ErrProcesser:()=>"翻译出错"})
}

function Request(options){
    return new Promise((reslove,reject)=>GM_xmlhttpRequest({...options,onload:reslove,onerror:reject}))
}

//--异步请求包装工具--end//