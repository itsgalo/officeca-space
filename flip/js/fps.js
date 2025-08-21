//generic FPS handler

export default class FPS {
	constructor(targetFPS, totalFrames) {
        //settings
        this.targetFPS = targetFPS;
        this.now;
        this.then = Date.now();
        this.interval = 1000 / this.targetFPS;
        this.delta;
        this.totalFrames = totalFrames;

        //external
        this.frameStep = 0;
        this.loopTime = 0;
        this.totalTime = 0;
        this.cycle = 0;

        //internal
		this.frames = 0;
		this.ptime = 0;
		this.fps = 0;
	}

	calcFPS(time) {
        //update FPS
		this.frames++;

		if (time >= this.ptime + 1000) {
			this.fps = this.frames * 1000 / (time - this.ptime);
			this.ptime = time;
			this.frames = 0;
		}
		return this.fps
	}

    updateFPS(newFPS) {
        this.interval = 1e3 / newFPS;
    }

    stepTime(time) {
        //step time
        this.now = Date.now();
        this.delta = this.now - this.then;
        this.totalTime++;
    }

    updateTime(time) {
        //update time
        this.then = this.now - (this.delta % this.interval);

        //reset frame
        if (this.frameStep > this.totalFrames - 1) {
            this.frameStep = 0;
            this.cycle += 1;
        }

        this.loopTime = (this.frameStep / this.totalFrames) * (Math.PI * 2.0);
    }
}
