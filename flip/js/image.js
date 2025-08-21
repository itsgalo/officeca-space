//unicode ref
// a = [
//     "◆☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼",
//     " !\"#$%&'()*+,-./0123456789:;<=>?",
//     "@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_",
//     "`abcdefghijklmnopqrstuvwxyz{|}~⌂",
//     "Çüéâäàåçêëèïîì╱╲╳æÆôöòûùÿÖÜ¢£¥₧ƒ",
//     "áíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐",
//     "└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀",
//     "αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■□",
// ]
//     .join("")
//     .split("");

function load (url, callback) {

    const img = new Image()
    img.src = url

    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d', {alpha: true});
    canvas.style.imageRendering = "pixelated";
    canvas.style.display = 'none';
    //canvas.imageSmoothingEnabled = false;

    img.onload = function() {
        canvas.width = 256
        canvas.height = 8
        //ctx.drawImage(img, 0, 0)
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 256, 8);
        //ctx.fillStyle = '#0000ff';
        for(let c = 0; c < 32; c++) {
            let t = Math.round(Math.random())*255;
            //let t = (c / 8) * 128;
            //ctx.fillStyle = `rgb(${t}, ${t}, ${t})`;
            ctx.fillStyle = `rgb(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)})`;
            //ctx.fillStyle = `rgb(255, 0, 0)`;
            //ctx.fillRect(c * 8, 0, 8, 8);
        }
        ctx.fillStyle = '#ff0000';
        //ctx.fillStyle = `rgb(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)})`;
        ctx.font = "8px ibm";
        ctx.textBaseline = "top";
        ctx.textRendering = "geometricPrecision";

        //ctx.fillText(" .'`^\",:;Il!i~+*#MW&8%B@$%8&WM#*+~i!lI;:,\"^`'. ", 0, 0);
        //ctx.fillText(" .'`:!~?_}{|/jrxnucYUQ0mwqkao#M&%@", 0, 0);
        //ctx.fillText(" _.:-=+*oO#█▓▒░▀▄▌▐■□▲▼◆◣◤◼◾◼▉▊▇▆▅▄", 0, 0);
        //ctx.fillText("☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼", 0, 0);
        //ctx.fillText(".!\"#$%&'()*+,-./0123456789:;<=>?", 0, 0);//♥♦♣♠•◘○◙♂♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼!"#$%
        //ctx.fillText('♥♦♣♠•◘○◙♂♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼', 0, 0);
        //ctx.fillText('▌▀▐▌▄▐▌▀▐▌▄▐▌▀▐▌▄▐▌▀▐▌▄▐▌▀▐', 0, 0);
        //ctx.fillText('█████████████              ', 0, 0);
        ctx.fillText('█▇▆▅▄▅▆▇█▇▆▅▄▅▆▇█▇▆▅▄▅▆▇█▇▆', 0, 0);
        //ctx.fillText('.-:_,^=;><+!rcAKNCX8#$Bg0MNWQ%&@', 0, 0);
        //ctx.fillText('áíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐', 0, 0);
        //ctx.fillText('└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀', 0, 0);
        //ctx.fillStyle = '#ff0000';
        //ctx.fillRect(0, 0, 8, 8);

        //load all pixels into an array
        let imageData  = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;

        //rewrite all pixels
        for(let i = 0; i < data.length; i+=4) {
            
            //round all colors to nearest 255
            data[i]   = Math.round(data[i] / 255) * 255;
            data[i+1] = Math.round(data[i+1] / 255) * 255;
            data[i+2] = Math.round(data[i+2] / 255) * 255;
            
            //round transparency to nearest 255
            //data[i+3] = Math.floor(data[i+3] / 255) * 255;
        }    
        ctx.putImageData(imageData,0,0);

        if ( typeof callback === 'function'){
            callback()
        }
    }

    img.onerror = function(e){
        console.log("Problem loading image: " + url)
    }

    function getColor(x, y) {
        const pixel = ctx.getImageData(x, y, 1, 1)
        const data = pixel.data

        return {
            r : data[0],
            g : data[1],
            b : data[2],
            a : data[3]
        }
    }

    function getCSS(x, y){
        const color = getColor(x, y)
        return 'rgba(' + color.r + ', ' + color.g + ', ' + color.b + ', ' + (color.a / 255) + ')';
    }

    return {
        img,
        ctx,
        canvas,
        getColor,
        getCSS
    }
}

export default {
    load
}