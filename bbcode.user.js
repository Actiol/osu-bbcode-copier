// ==UserScript==
// @name        osu! BBCode copier
// @version     1.0
// @author      Actiol
// @match       https://osu.ppy.sh/*
// @grant       GM_registerMenuCommand
// @description 11/7/2024, 12:47:18 PM
// @downloadURL https://github.com/Actiol/osu-bbcode-copier/raw/refs/heads/main/bbcode.user.js
// @updateURL   https://github.com/Actiol/osu-bbcode-copier/raw/refs/heads/main/bbcode.user.js
// ==/UserScript==


const copyClipboard =
    `<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="currentColor">
        <rect class="cls-1" x="1.5" y="6.5" width="14" height="14" rx="3" ry="3"/>
        <path class="cls-1" d="M15.5,15.5h2c1.66,0,3-1.34,3-3V4.5c0-1.66-1.34-3-3-3h-8c-1.66,0-3,1.34-3,3v2"/>
    </svg>`

var icons = Object.freeze({
    copyClipboard: copyClipboard
});

var isAppended = false

function htmlToBBCode(html) {
    const rules = [
        { pattern: /<br\s*\/?>/gi, replacement: '\n' }, // new lines
        { pattern: /<strong>(.*?)<\/strong>/gi, replacement: '[b]$1[/b]' }, // bold
        { pattern: /<em>(.*?)<\/em>/gi, replacement: '[i]$1[/i]' }, // italic
        { pattern: /<u>(.*?)<\/u>/gi, replacement: '[u]$1[/u]' }, // underline
        { pattern: /<del>(.*?)<\/del>/gi, replacement: '[strike]$1[/strike]' }, // strikeout
        { pattern: /<span style="color:(.*?);">(.*?)<\/span>/gi, replacement: '[color=$1]$2[/color]' }, // color
        { pattern: /<span style="font-size:(.*?);">(.*?)<\/span>/gi, replacement: '[size=$1]$2[/size]' }, // text size
        { pattern: /<span class="spoiler">(.*?)<\/span>/gi, replacement: '[spoiler]$1[/spoiler]' }, // spoiler
        {
            pattern: /<div class="js-spoilerbox bbcode-spoilerbox"><a class="js-spoilerbox__link bbcode-spoilerbox__link" href="#"><span class="bbcode-spoilerbox__link-icon"><\/span>SPOILER<\/a><div class="js-spoilerbox__body bbcode-spoilerbox__body">(.*?)<\/div><\/div>/gi,
            replacement: '[spoilerbox]$1[/spoilerbox]\n' // spoiler box
        },
        {
            pattern: /<div class="js-spoilerbox bbcode-spoilerbox"><a class="js-spoilerbox__link bbcode-spoilerbox__link" href="#"><span class="bbcode-spoilerbox__link-icon"><\/span>(.*?)<\/a><div class="js-spoilerbox__body bbcode-spoilerbox__body">(.*?)<\/div><\/div>/gi,
            replacement: '[box=$1]$2[/box]\n' // box
        },
        { pattern: /<blockquote><h4>(.*?) wrote:<\/h4>(.*?)<\/blockquote>/gi, replacement: '[quote="$1"]$2[/quote]\n' }, // quote
        { pattern: /<code>(.*?)<\/code>/gi, replacement: '[c]$1[/c]' }, // inline code
        { pattern: /<pre>(.*?)<\/pre>/gi, replacement: '[code]$1[/code]\n' }, // code block
        { pattern: /<center>/gi, replacement: '[centre]' }, // center
        { pattern: /<\/center>/gi, replacement: '[/centre]' }, // closing center
        { pattern: /<a rel=['"]nofollow['"] href=['"](.*?)['"](.*?)>(.*?)<\/a>/gi, replacement: '[url=$1]$3[/url]' }, // url
        { pattern: /<a class="user-name js-usercard" data-user-id="(.*?)"(.*?)>(.*?)<\/a>/gi, replacement: '[profile=$1]$3[/profile]' }, // profile
        { pattern: /<ol class="unordered">(.*?)<\/ol>/gi, replacement: '[list]\n$1[/list]\n' }, // dotted list
        { pattern: /<ol>(.*?)<\/ol>/gi, replacement: '[list=meow]\n$1[/list]\n' }, // numbered list
        { pattern: /<li>(.*?)<\/li>/gi, replacement: '[*]$1\n' }, // list points
        { pattern: /<a rel="nofollow" href="mailto:(.*?)">(.*?)<\/a>/gi, replacement: '[email=$1]$2[/email]' }, // email
        { pattern: /<img src=['"](.*?)['"](.*?)>/gi, replacement: '[img]$1[/img]' }, // image
        {
            pattern: /<span class="proportional-container js-gallery['"](.*?)data-src=['"](.*?)['"]><span class="proportional-container__height" style=(.*?)><img class="proportional-container__content" src=['"](.*?)['"](.*?)><\/span><\/span>/gi,
            replacement: '[img]$2[/img]' // also image i think but idk
        },
        { pattern: /<div class="imagemap"><img class="imagemap__image"(.*?)src=['"](.*?)['"](.*?)>(.*?)<\/div>/gi, replacement: '[imagemap]\n$2\n$4[/imagemap]\n' }, // imagemap outline
        { pattern: /<a class="imagemap__link" href=['"](.*?)['"] style="left:(.*?)%;top:(.*?)%;width:(.*?)%;height:(.*?)%;" title=['"](.*?)['"]><\/a>/gi, replacement: '$2 $3 $4 $5 $1 $6\n' }, // imagemap link
        { pattern: /<iframe class="u-embed-wide u-embed-wide--bbcode" src="https:\/\/www.youtube.com\/embed\/(.*?)\?rel=0"(.*?)><\/iframe>/gi, replacement: '[youtube]$1[/youtube]' }, // youtube iframe
        { pattern: /<button type="button" class="audio-player__button audio-player__button--play js-audio--play"><span class="fa-fw play-button"><\/span><\/button>(.*?)<div class="audio-player__timestamp audio-player__timestamp--total"><\/div>(.*?)<\/div>/gi, replacement: '' }, // remove audio garbage
        { pattern: /<div class="audio-player js-audio--player" data-audio-url=['"](.*?)['"](.*?)>(.*?)<\/div>/gi, replacement: '[audio]$1[/audio]' }, // audio
        { pattern: /<h2>(.*?)<\/h2>/gi, replacement: '[heading]$1[/heading]\n' }, // heading
        { pattern: /<div class="well">(.*?)<\/div>/gi, replacement: '[notice]$1[/notice]' } // notice
    ];

    for (const rule of rules) {
        html = html.replace(rule.pattern, rule.replacement);
    }

    // remove remaining HTML tags (there are some /span or /div left sometimes somehow)
    html = html.replace(/<.*?>/g, '');

    // i dont this can ever happen but it cant hurt (leftover from my py script)
    const outline = '<div class="bbcode bbcode--profile-page">';
    if (html.includes(outline)) {
        html = html.replace(outline, '').slice(0, -6);
    }

    return html;
}


function copyToClipboard(html){
    const textArea = document.createElement('textarea');
    bbcode = htmlToBBCode(html);
    navigator.clipboard.writeText(bbcode);
}


function injectIcon(header, bbcodeBody){
    'use strict';

    function waitForElement(selector, callback) {
        const interval = setInterval(() => {
            const targetElement = document.querySelector(selector);
            if (targetElement) {
                clearInterval(interval);
                callback(targetElement);
            }
        }, 100);
    }

    waitForElement(
        header,
        (targetElement) => {
            // abort if icon is already appended
            if (targetElement.querySelector('.copy-bbcode-icon')) {
                console.log('Icon already added.');
                return;
            }

            const textColor = getComputedStyle(targetElement).color;

            const iconWrapper = document.createElement('span');
            iconWrapper.innerHTML = icons["copyClipboard"];
            iconWrapper.style.width = '16px';
            iconWrapper.style.height = '16px';
            iconWrapper.style.marginLeft = '4px';
            iconWrapper.style.verticalAlign = '-4px';
            iconWrapper.style.display = 'inline-block';
            iconWrapper.title = 'Copy as BBCode';
            iconWrapper.classList.add('copy-bbcode-icon');

            const svg = iconWrapper.querySelector('svg');
            if (svg) {
                svg.style.cursor = 'pointer';
                svg.style.strokeWidth = '2.5';
                svg.style.color = textColor;
            } else {
                console.error('SVG not found inside the wrapper.');
            }

            // this doesnt work perfectly bc osu hides tooltips afetr clicking
            iconWrapper.addEventListener('click', () => {
                iconWrapper.title = 'Copied!';

                const bbcodeContent = document.querySelector(bbcodeBody).innerHTML.trim();
                copyToClipboard(bbcodeContent);

                const checkmark = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                checkmark.setAttribute('class', 'cls-1');
                checkmark.setAttribute('points', '5 14.27 7.75 17 12 10');
                checkmark.setAttribute('stroke-linejoin', 'round');
                checkmark.style.strokeLinecap = 'round';
                checkmark.style.stroke = 'currentColor';
                checkmark.style.strokeWidth = "2.5";
                checkmark.style.fill = 'none';
                checkmark.style.strokeDasharray = '50';
                checkmark.style.strokeDashoffset = '50';
                checkmark.style.animation = 'draw-in 2s ease-out forwards';

                svg.appendChild(checkmark);


                setTimeout(() => {
                    checkmark.style.animation = 'draw-out 2s ease-out forwards';
                }, 350);

                setTimeout(() => {
                    svg.removeChild(checkmark);
                }, 1500);

                console.log('');
            });

            iconWrapper.addEventListener('mouseover', () => {
                svg.style.animation = 'raise 3s cubic-bezier(0,.8,.55,1.0) forwards';
                svg.style.filter = 'drop-shadow(0px 1px 3px rgba(255,255,255, 0.4))';
            });

            iconWrapper.addEventListener('mouseleave', () => {
                iconWrapper.title = 'Copy as BBCode';
                svg.style.animation = 'descend 10s ease-out forwards';
                svg.style.filter = '';
            });

            targetElement.appendChild(iconWrapper);
            console.log('SVG icon added next to the Description header.');
        }
    );
}

const style = document.createElement('style');
style.textContent = `
    @keyframes draw-in {
        from {
            stroke-dashoffset: 50; /* Start fully hidden */
        }
        to {
            stroke-dashoffset: 0; /* Fully revealed */
        }
    }
    @keyframes draw-out {
        from {
            stroke-dashoffset: 0; /* Fully visible */
        }
        to {
            stroke-dashoffset: -50; /* Fully hidden again */
        }
    }
    @keyframes raise {
        from {
            filter: drop-shadow(0px 1px 6px rgba(255,255,255, 0))
        }
        to {
            transform: translateY(-1px);
            filter: drop-shadow(0px 1px 3px rgba(255,255,255, 0.5));
        }
    }
    @keyframes descend {
        to {
            transform: translateY(0px);
            filter: none;
        }
    }
`;
document.head.appendChild(style);


function insertBeatmapset(){
    // beatmap description

    var header = '.beatmapset-info__box .beatmapset-info__row.beatmapset-info__row--value-overflow .beatmapset-info__header';
    var body = '.bbcode.bbcode--normal-line-height';
    injectIcon(header, body);
}

function insertUsers(){
    // me! Section

    var header = '.js-sortable--page[data-page-id="me"] .page-extra.page-extra--userpage .u-relative h2.title.title--page-extra';
    var body ='.bbcode.bbcode--profile-page';
    injectIcon(header, body);
}


const routes = [
    {
            match: ["beatmapsets"],
            render: () => insertBeatmapset(),
    },
    {
            match: ["users"],
            render: () => insertUsers(),
    },
];

function determineSite(){
    function onReady(callback) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }
    onReady(() => {
        for (const route of routes){
            const splitURL = location.pathname.split("/");
            const matches = splitURL.some((u) => route.match.includes(u))
            if (matches){
                route.render();
                break;
            }
        }
    });
}

function main() {
    determineSite();

    (function () {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function (state, title, url) {
            originalPushState.apply(this, arguments);
            determineSite();
        };

        history.replaceState = function (state, title, url) {
            originalReplaceState.apply(this, arguments);
            determineSite();
        };
        // Listen for popstate event (back/forward browser buttons)
        window.addEventListener('popstate', determineSite);
    })();
}

main();