// ==UserScript==
// @name         🎌 竹島チェッカー 🎌
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  竹島の旗のピクセル割合を表示します。（Dropletで買える+30が消えます）
// @author       zenith
// @match        wplace.live
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function removeSecondDiv() {
        const container = document.querySelector('div.mt-3.grid.gap-3.sm\\:grid-cols-2');
        if (!container) return;

        const targetDivs = container.querySelectorAll('div.bg-base-300.flex.flex-col.items-center.justify-center.rounded-xl.p-6');
        if (targetDivs.length >= 2) {
            targetDivs[1].remove();
            console.log('Second bg-base-300 div removed');
        }
    }

    removeSecondDiv();

    const observer = new MutationObserver(() => {
        removeSecondDiv();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    const targetColors = {
        Yellow: [0xF9, 0xDD, 0x3B],
        White:  [0xFF, 0xFF, 0xFF],
        Black:  [0x00, 0x00, 0x00],
        Blue:   [0x28, 0x50, 0x9E],
        Red:    [0xED, 0x1C, 0x24]
    };

    const tolerance = 30;
    const url = "https://backend.wplace.live/files/s0/tiles/1774/795.png";
    const cropBox = { x: 40, y: 100, w: 360, h: 260 };

    let previousColorCounts = null;

    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '10px';
        overlay.style.right = '10px';
        overlay.style.background = 'rgba(255,255,255,0.9)';
        overlay.style.border = '1px solid #999';
        overlay.style.fontSize = '12px';
        overlay.style.padding = '8px';
        overlay.style.zIndex = 999999;
        overlay.style.cursor = 'move';
        overlay.style.maxWidth = '200px';
        overlay.style.overflow = 'auto';
        overlay.id = 'color-analysis-overlay';
        overlay.style.userSelect = 'none';

        const btn = document.createElement('button');
        btn.textContent = '−';
        btn.style.position = 'absolute';
        btn.style.top = '2px';
        btn.style.right = '2px';
        btn.style.fontSize = '10px';
        btn.style.cursor = 'pointer';
        overlay.appendChild(btn);

        const content = document.createElement('div');
        content.id = 'overlay-content';
        overlay.appendChild(content);

        btn.addEventListener('click', () => {
            if (content.style.display === 'none') {
                content.style.display = 'block';
                btn.textContent = '−';
            } else {
                content.style.display = 'none';
                btn.textContent = '+';
            }
        });

        document.body.appendChild(overlay);

        let isDragging = false;
        let offsetX, offsetY;
        overlay.addEventListener('mousedown', e => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            offsetX = e.clientX - overlay.getBoundingClientRect().left;
            offsetY = e.clientY - overlay.getBoundingClientRect().top;
        });
        document.addEventListener('mousemove', e => {
            if (isDragging) {
                overlay.style.left = e.clientX - offsetX + 'px';
                overlay.style.top = e.clientY - offsetY + 'px';
                overlay.style.right = 'auto';
            }
        });
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        return content;
    }

    async function analyze(content) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        await img.decode();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = cropBox.w;
        canvas.height = cropBox.h;
        ctx.drawImage(img, cropBox.x, cropBox.y, cropBox.w, cropBox.h, 0, 0, cropBox.w, cropBox.h);

        const data = ctx.getImageData(0, 0, cropBox.w, cropBox.h).data;
        const totalPixels = cropBox.w * cropBox.h;
        const colorCounts = Object.fromEntries(Object.keys(targetColors).map(k => [k, 0]));

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            for (const [name, target] of Object.entries(targetColors)) {
                if (
                    Math.abs(r - target[0]) <= tolerance &&
                    Math.abs(g - target[1]) <= tolerance &&
                    Math.abs(b - target[2]) <= tolerance
                ) {
                    colorCounts[name]++;
                    break;
                }
            }
        }

        previousColorCounts = { ...colorCounts };

        content.innerHTML = `<strong>解析結果</strong><br><br>
            総ピクセル数: ${totalPixels}<br><hr>` +
            Object.entries(colorCounts).map(([name, count]) => {
                const percent = ((count / totalPixels) * 100).toFixed(2);
                return `${name}: ${count} (${percent}%)`;
            }).join('<br>');

        const imgElem = document.createElement('img');
        imgElem.src = canvas.toDataURL();
        imgElem.style.width = '100%';
        imgElem.style.marginTop = '5px';
        content.appendChild(imgElem);
    }

    const content = createOverlay();
    analyze(content);
    setInterval(() => analyze(content), 1000);
})();
