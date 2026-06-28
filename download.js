// ==UserScript==
// @name         Old Reddit Gallery Downloader for RES
// @namespace    https://github.com/alexhuegel
// @version      2026-06-10
// @description  For those using the regular reddit domain but have RES replace it with old.reddit, this allows you to download galleries as zip files (including captions)
// @author       Alex Huegel
// @match        https://www.reddit.com/r/*/comments/*/*/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @require      data:application/javascript,window.setImmediate%20%3D%20window.setImmediate%20%7C%7C%20((f%2C%20...args)%20%3D%3E%20window.setTimeout(()%20%3D%3E%20f(args)%2C%200))%3B
// @require      https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// ==/UserScript==

(function() {
    const charLimit = 64;
    'use strict';
    var SIZE;


    function init(){
        if(document.getElementsByClassName("media-gallery").length === 0){
            return;
        }
        const DLButton = document.createElement("button");
        DLButton.textContent = "Download";
        let attachPoint = document.querySelector("div.top-matter").querySelector("ul.flat-list");
        if(!attachPoint){
            return;
        }
        attachPoint.appendChild(DLButton);

        var title = document.querySelector("a.title").textContent;
        const originalTitle = title;

        const illegalChars = ["<",">",":","\"","\\","/","|","?","*"];
        for (let i = 0; i < illegalChars.length; i++){
            title = title.replaceAll(illegalChars[i]," ");
        }

        title = title.substring(0, charLimit);


        SIZE = document.getElementsByClassName("gallery-preview").length;

        const gallery = [];
        gallery.length = SIZE;
        let i = 0;
        let j = 0;
        let textFile = originalTitle + "\n";
        for (let file of document.getElementsByClassName("gallery-preview")){
            let preview = file.querySelector("img.preview").src;
            let img = preview.replace("preview", "i");
            img = img.substring(0, img.indexOf("?"));
            gallery[i] = [img, formatting(i.toString(), SIZE)];
            if(file.querySelector("div.gallery-item-caption")!=null){
                let txt = file.querySelector("div.gallery-item-caption").textContent.trim();
                textFile = textFile + i + "   " + txt + "\n";
                j++;
            }
            i++;

        }

        DLButton.addEventListener("click", async () => {
            try {
                if(j==0){
                    await imgDownload(gallery, null, title);
                }
                else{
                    await imgDownload(gallery, textFile, title);
                }
            } catch (e) {
                console.error("DOWNLOAD FAILED", e);
            }
        });

        function formatting(x, y){
            if(x.length == y.toString().length){
                return x;
            }
            else{
                let tmp = "0" + x;
                return formatting(tmp, y);
            }

        }
    }

    async function imgDownload(gal, file, title) {
        const zip = new JSZip();
        const fullTitle = title + ".zip";

        for(let i = 0; i < SIZE; i++){
            const item = gal[i];
            const url = item[0];
            const name = item[1];
            const blob = await fetchAsBlob(url);


            const ext = extensionFromMime(blob.type);
            const fileName = name + "." + ext;

            if (!(blob instanceof Blob)) {
                throw new Error("Not a Blob: " + url);
            }
            zip.file(fileName, blob);

        }
        if(file!=null){
            zip.file("captions.txt", file);
        }
        const zipBlob = await zip.generateAsync({ type: "blob", useWebWorkers: false });
        const zipUrl = URL.createObjectURL(zipBlob);

        GM_download({
            url: zipUrl,
            name: fullTitle,
            onload: () => URL.revokeObjectURL(zipUrl)
        });
    }
    function fetchAsBlob(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url,
                responseType: "blob",
                onload: r => {
                    if (!r.response) {
                        reject(new Error("Empty response"));
                    } else {
                        resolve(r.response);
                    }
                },
                onerror: () => reject(new Error("Request failed"))
            });
        });
    }
    function extensionFromMime(mime){
        switch(mime){
            case "image/jpeg": return "jpg";
            case "image/png": return "png";
            case "image/webp": return "webp";
            case "image/avif": return "avif";
            default: return "bin";
        }
    }
    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", init);
    }
    else{
        init();
    }

})();

