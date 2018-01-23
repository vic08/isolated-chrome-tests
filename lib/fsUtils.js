
const FileReaderPool = require('./fileReaderPool')
const fileReaderPool = new FileReaderPool()

// -----------------------------------------------------------------------------
// CHROME / WEB FS

let _cfs = null
function getCFS () {
  return new Promise(function (resolve, reject) {
    if (_cfs) {
      return resolve(_cfs)
    }
    let requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem
    requestFileSystem(window.PERSISTENT, 5000 * 1024 * 1024, function (cfs) {
      _cfs = cfs
      resolve(cfs)
    }, function (err) {
      console.log('unable to get filesystem', err)
      reject(err)
    })
  })
}

function getFileEntry (filename, opts) {
  return getCFS().then(function (cfs) {
    return new Promise(function (resolve, reject) {
      cfs.root.getFile(filename, opts, function (fileEntry) {
        return resolve(fileEntry)
      }, reject)
    })
  })
}

function getFile (filename, opts) {
  return getFileEntry(filename, opts).then(function (fileEntry) {
    return new Promise(function (resolve, reject) {
      fileEntry.file(function (file) {
        resolve(file)
      }, reject)
    })
  })
}

// -----------------------------------------------------------------------------
// FILE FUNCTIONS

function fsize (filename, ignoreErrors) {
  return getFile(filename, {create: false}).then(function (file) {
    return file.size
  }).catch(function (err) {
    // console.log('err checking file size', err)
    if (ignoreErrors) return -1
    else return Promise.reject(err)
  })
}

function exists (filename) {
  return getFile(filename, {create: false}).then(function (file) {
    return true
  }).catch(function (err) {
    // if we get a not found error its false, otherwise pass along err
    if (err.code == DOMException.NOT_FOUND_ERR) return false
    return Promise.reject(err)
  })
}

// -----------------------------------------------------------------------------
// DIRECTORY FUNCTIONS

function getDirectory (path) {
  return getCFS().then((cfs) => {
    return new Promise((resolve, reject) => {
      cfs.root.getDirectory(filename, {create: false}, resolve, reject)
    })
  })
}

function mkdir (path, ignoreErrors) {
  return getCFS().then((cfs) => {
    return new Promise(function (resolve, reject) {
      cfs.root.getDirectory(path, {create: true}, resolve, reject)
    })
  })
}

function readdir (path) {
  return getDirectory(path).then((dirEntry) => {
    const dirReader = dirEntry.createReader()
    return new Promise((resolve, reject) => {
      dirReader.readEntries((entries) => {
        resolve(entries.map((x) => x.name))
      }, reject)
    })
  })
}

function purgedir (path) {
  return readdir(path).then((files) => {
    const filesToDelete = []
    files.forEach(function (filename) {
      if (filename === '.' || filename === '..') return
      filesToDelete.push(filename)
    })
    const deleteUntilDone = function () {
      if (filesToDelete.length === 0) {
        return
      }
      const filename = filesToDelete.pop()
      const filepath = [path, filename].join('/')
      return getFileEntry(filepath, {}).then((entry) => {
        return new Promise((resolve, reject) => {
          entry.remove(resolve, reject)
        })
      }).then(() => {
        return deleteUntilDone()
      })
    }
    return deleteUntilDone()
  })
}

// -----------------------------------------------------------------------------
// READING / WRITING

function readFileAsArrayBuffer (file, offset, amount) {
  if (amount <= 0) return Promise.reject(new Error('amount must be > 0'))
  if (offset < 0) return Promise.reject(new Error('offset must be >= 0'))
  return new Promise((resolve, reject) => {
    const fileReader = fileReaderPool.getFileReader()
    fileReader.onload = (e) => {
      fileReaderPool.returnFileReader(fileReader)
      resolve(e.target.result)
    }
    fileReader.onerror = (err) => {
      fileReaderPool.returnFileReader(fileReader)
      reject(err)
    }
    fileReader.readAsArrayBuffer(file.slice(offset, offset + amount))
  })
}

function createFileWriter (filename, start) {
  return getFileEntry(filename, {create: true, exclusive: false}).then(function (fileEntry) {
    return new Promise(function (resolve, reject) {
      fileEntry.createWriter(function (fileWriter) {
        if (start) fileWriter.seek(start)
        resolve(fileWriter)
      }, reject)
    })
  })
}

// -----------------------------------------------------------------------------
// JSON LOAD / SAVE

function loadJSON (filename, ignoreErrors, defaultValue) {
  return getFile(filename).then(function (file) {
    return new Promise(function (resolve, reject) {
      const reader = fileReaderPool.getFileReader()
      reader.onload = function (e) {
        const text = e.target.result
        fileReaderPool.returnFileReader(reader)
        try {
          const value = JSON.parse(text)
          if (value !== undefined) {
            return resolve(value)
          } else {
            return defaultValue
          }
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = err => {
        fileReaderPool.returnFileReader(reader)
        reject(err)
      }
      reader.readAsText(file, 'utf8')
    })
  }).catch(function (err) {
    if (ignoreErrors) {
      return Promise.resolve(defaultValue || {})
    } else {
      return Promise.reject(err)
    }
  })
}

function saveJSON (filename, obj) {
  return Promise.resolve().then(function () {
    return JSON.stringify(obj)
  }).then(function (data) {
    return getFileEntry(filename, {create: true}).then(function (fileEntry) {
      return new Promise(function (resolve, reject) {
        fileEntry.createWriter(function (fileWriter) {
          const blob = new Blob([data], {type: 'text/plain'})
          fileWriter.onwriteend = function (e) {
            resolve()
          }
          fileWriter.onerror = function (e) {
            reject(err)
          }
          fileWriter.write(blob)
        })
      })
    })
  })
}

// -----------------------------------------------------------------------------

module.exports = {
  getFile: getFile, 
  fsize: fsize,
  exists: exists,
  mkdir: mkdir,
  readdir: readdir,
  purgedir: purgedir,
  readFileAsArrayBuffer: readFileAsArrayBuffer,
  createFileWriter: createFileWriter,
  loadJSON: loadJSON,
  saveJSON: saveJSON,
  getCFS
}
