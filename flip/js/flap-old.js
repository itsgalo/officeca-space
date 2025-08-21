//flappy class for cycling through number values

class Flap{
	constructor(index, maxNum){
		this.index = index; //display number
		//this.chars = shuffle(chars);
    this.maxNum = maxNum; //max number
		this.target = 0;
    this.current = 0; //target number
        //index counter for cycling
		this.counter = 0;
    this.delay = index;
    this.frame = 0;//Array.from(Array(sequence.length).keys());
    this.out = 0;
	}
    //sets the target character
	setTarget(e) {
    //const idx = this.chars.indexOf(e) //gets the index of the element in the character set sequence
    this.target = e;//this.chars[idx] //set the target to the element in the string
	}
  setDelay(n) {
    this.delay = n;
  }
	setRandom() {
    this.current = Math.floor(Math.random() * this.maxNum); //this.chars[Math.floor(Math.random()*this.chars.length)]
	}
	flip() {
    //if the delay is the current frame run the counter
    if (this.delay > 0) {
      this.delay -= 1.0; //if 5, then the flip speed is 5 at a time

      //this.counter = (this.counter + 1) % this.maxNum;
      // if (this.counter > this.maxNum) {
      //     this.counter = 0;
      // } else {
      //     this.counter++;
      // }
    } else {
      //
      //this.counter = (this.counter + 1) % this.maxNum;
      if (this.current != this.target) {
        //this.current = this.counter;
        this.current = (this.current + 4) % this.maxNum;
      }  
    }

	}
	update() {
        // if (this.delay == this.frame) {
        //     //this.targetElt.setAttribute('paused', 'false');
        // }
        // if (this.current != this.target) {
        //     //this.targetElt.style.color = "#fff";
        //     this.targetElt.style.border = "1px dashed #000"
        //     //this.targetElt.style.backgroundColor = "#000";
        // } else {
        //     //this.targetElt.style.color = "#000"
        //     this.targetElt.style.border = "1px solid #fff"
        //     //this.targetElt.style.backgroundColor = "#fff";
        // }
		this.out = this.current;
    this.frame += 1;
	}
}

function shuffle(array) {
    let m = array.length, t, i;
    // While there remain elements to shuffle…
    while (m) {
      // Pick a remaining element…
      i = Math.floor(Math.random() * m--);
      // And swap it with the current element.
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
    return array;
  }

  export default Flap;