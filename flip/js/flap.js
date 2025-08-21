//flappy class for cycling through number values

class Flap {
  constructor(index, maxNum, target) {
    this.index = index;          // Position in sequence of flaps
    this.maxNum = maxNum;        // Maximum number to display
    this.target = target;             // Target number to reach
    this.current = 0;            // Current displayed number
    this.delay = index;          // Initial delay before animation starts
    this.frame = 0;              // Current animation frame
    this.flipSpeed = 10;          // How many numbers to skip per flip
  }

  setTarget(newTarget) {
    // Ensure target is within valid range
    this.target = Math.max(0, Math.min(newTarget, this.maxNum - 1));
  }

  setDelay(newDelay) {
    this.delay = Math.max(0, newDelay);
  }

  setRandom() {
    this.current = Math.floor(Math.random() * this.maxNum);
  }

  flip() {
    if (this.delay > 0) {
      this.delay -= 1.0;
      return;
    }

    if (this.current !== this.target) {
      // Calculate shortest path to target considering wrap-around
      const distanceUp = (this.target - this.current + this.maxNum) % this.maxNum;
      const distanceDown = (this.current - this.target + this.maxNum) % this.maxNum;
      
      // Determine direction and calculate next value
      let nextValue;
      if (distanceUp <= distanceDown) {
        // Moving up
        nextValue = (this.current + Math.min(this.flipSpeed, distanceUp)) % this.maxNum;
      } else {
        // Moving down
        nextValue = ((this.current - Math.min(this.flipSpeed, distanceDown)) + this.maxNum) % this.maxNum;
      }

      // Only update if we haven't overshot the target
      const newDistanceUp = (this.target - nextValue + this.maxNum) % this.maxNum;
      const newDistanceDown = (nextValue - this.target + this.maxNum) % this.maxNum;
      
      // Check if the new position would be further from the target
      if (Math.min(newDistanceUp, newDistanceDown) <= Math.min(distanceUp, distanceDown)) {
        this.current = nextValue;
      } else {
        this.current = this.target; // Snap to target if we would overshoot
      }
    }
  }

  update() {
    this.frame += 1;
    return this.current;
  }
}

export default Flap;