const hasTouch = 'ontouchstart' in document.documentElement

function init(element) {

    const pointer = {
        x  : 0,
        y  : 0,
        px : 0,
        py : 0,
        pressed : false,
        lastClick : 0,
        doubleClick: function() { console.log('double clicked!')},
        hasTouch
    }

    function press(x, y, c){
        let rect = c.getBoundingClientRect();
        pointer.pressed = true;
        pointer.x = x - rect.left;
        pointer.y = y - rect.top;

        //handle double tap/click
        let dd = new Date();
        let tt = dd.getTime();
        const tapLag = 500; // 500ms
        if (tt - pointer.lastClick < tapLag) {
          pointer.doubleClick();
        }
        pointer.lastClick = tt;
    }

    function move(x, y, c){
        let rect = c.getBoundingClientRect();
        pointer.x  = x - rect.left;
        pointer.y  = y - rect.top;
    }

    function release(x, y){
        pointer.pressed = false;
    }

    if (hasTouch) {
        element.addEventListener("touchstart", function(e) {
            e.preventDefault();
            press(e.touches[0].clientX, e.touches[0].clientY, element);
        })
        element.addEventListener("touchmove", function(e) {
            e.preventDefault();
            move(e.touches[0].clientX, e.touches[0].clientY, element);
        })
        element.addEventListener("touchend", function(e) {
            e.preventDefault();
            pointer.pressed = false;
            //release(e.touches[0].clientX, e.touches[0].clientY);
        })
    } else {
        element.addEventListener('mousedown', function(e){
            press(e.clientX, e.clientY, element);
        })
        element.addEventListener('mousemove', function(e){
            move(e.clientX, e.clientY, element);
        })
        element.addEventListener('mouseup', function(e){
            release(e.clientX, e.clientY);
        })
    }

    return pointer;
}

export default { init }