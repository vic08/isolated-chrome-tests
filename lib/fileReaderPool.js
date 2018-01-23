
function FileReaderPool () {
  this.pool = []
  this.borrowedCount = 0
}

FileReaderPool.prototype.getFileReader = function () {
  this.borrowedCount++
    // console.log('Borrowed file readers ' + this.borrowedCount)
  if (this.pool.length > 0) {
    return this.pool.pop()
  } else {
    return new FileReader()
  }
}

FileReaderPool.prototype.returnFileReader = function (fileReader) {
  if (fileReader.readyState === 1) throw new Error('we dont accept file readers in this state')
  fileReader.onerror = null
  fileReader.onload = null
  fileReader.onloadend = null
  this.pool.push(fileReader)
  this.borrowedCount--
    // console.log('Total readers in the file reader pool: ' + this.pool.length)
}

module.exports = FileReaderPool
