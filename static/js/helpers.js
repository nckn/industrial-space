const radians = (degrees) => {
  return degrees * Math.PI / 180;
}

const distance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
}

const map = (value, start1, stop1, start2, stop2) => {
  return (value - start1) / (stop1 - start1) * (stop2 - start2) + start2
}

const generateRandomNumber = (min, max) => {
  var highlightedNumber = Math.random() * (max - min) + min
  // console.log(highlightedNumber)
  return highlightedNumber
}

const checkIfTouch = (e) => {
  var thisX, thisY
  if (e.touches != undefined) {
    thisX = e.touches[0].pageX
    thisY = e.touches[0].pageY
  }
  else {
    thisX = e.clientX
    thisY = e.clientY
  }
  return { x: thisX, y: thisY }
}

export { 
  radians,
  distance,
  map,
  generateRandomNumber,
  checkIfTouch
};
