module.exports = {

  run(timeMs, occurances, cb){
    let matrix = this.createRandomMatrix(timeMs, occurances);
    let id = 0;
    let instances = matrix.map( delay => setTimeout( () => { cb(id++); }, delay) );
    return {
      matrix,
      instances
    };
  },

  createRandomMatrix(timeMs, occurances, minTime = 1000){
    minTime = (timeMs <= minTime) ? 0 : minTime;
    let matrix = [];
    for (var i = 0; i < occurances; i++) {
      matrix.push(this.randomNumber(minTime, timeMs))
    }
    return matrix;
  },

  randomNumber(min, max){
    return Math.floor(Math.random()*(max-min+1)+min);
  }

}
