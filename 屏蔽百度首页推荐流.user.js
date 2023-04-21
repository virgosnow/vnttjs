// ==UserScript==
// @name         屏蔽百度首页推荐流
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  屏蔽百度个人首页新出的推荐流
// @author       virgosnow
// @match        https://www.baidu.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=baidu.com
// @license      MIT
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 屏蔽推荐两个字
    for (let e of document.getElementsByClassName("s-menu-item")) {
        if (e.getAttribute("data-id") != 100) {
            e.remove()
        }
    }
    // 屏蔽推荐流载体
    for (let e of document.getElementsByClassName("s-content")) {
        if (e.getAttribute("data-id") != 100) {
            e.remove()
        }
    }
    // 延时200毫秒，等待加载完毕时点击我的关注
    setTimeout(function(){document.getElementById("s_menu_mine").click()}, 200)
})();