import fsUtils from '../../../lib/fsUtils'
import FileReaderPool from '../../../lib/fileReaderPool'
const fileReaderPool = new FileReaderPool()

const FILE_EXERCISE_NUMBER = 100000;

function createFileWithUselessBytes(filename, sizeInBytes, fileSystem) {
  return new Promise((resolve, reject) => {
    fileSystem.root.getFile(filename, {create: true, exclusive: true}, (fileEntry) => {
      fileEntry.createWriter(fileWriter => {
        let blobData = new Blob([new ArrayBuffer(sizeInBytes)])

        fileWriter.onwriteend = function(e) {
          console.log('Write completed.')
          resolve(fileEntry)
        }

        fileWriter.onerror = function(e) {
          console.log('Write failed: ' + e.toString())
          reject(e)
        }

        fileWriter.write(blobData)
      }, reject)
    }, reject)
  })
}

function deleteAllFilesFormDirectory(directoryEntry) {
  return new Promise((resolve, reject) => {
    let directoryReader = directoryEntry.createReader()
    let deleteNextEntries = () => {
      directoryReader.readEntries(entries => {
        if (entries.length === 0) {
          return resolve()
        }
        Promise.all(entries.map(entry => removeFile(entry)))
          .then(() => {
            deleteNextEntries()
          })
          .catch(reject)
      }, reject)
    }
    deleteNextEntries()
  })

}

function removeFile(fileEntry) {
  return new Promise((resolve, reject) => {
    fileEntry.remove(() => {
      resolve()
    }, reject)
  })
}

function readFromFile(fileEntry) {
  return new Promise((resolve, reject) => {
    fileEntry.file(file => {
      let fileReader = fileReaderPool.getFileReader()

      fileReader.onloadend = (e) => {
        resolve(fileReader.result)
      }

      fileReader.onerror = (err) => {
        reject(err)
      }

      fileReader.readAsArrayBuffer(file)
    })
  })
}

function exerciseFilesReading(fileEntries) {
  return new Promise((resolve, reject) => {
    let exerciseLeft = FILE_EXERCISE_NUMBER

    let runNextExercise = () => {
      if (exerciseLeft <= 0) {
        return resolve()
      }
      if (exerciseLeft % 100 === 0) {
        console.log(exerciseLeft)
      }

      return readFromFile(fileEntries[exerciseLeft % fileEntries.length])
        .then(() => {
          exerciseLeft--
          runNextExercise()
        })
        .catch(reject)
    }
    
    runNextExercise()
  })
}


chrome.app.runtime.onLaunched.addListener(function() {

  chrome.app.window.create('server.html', {
    'outerBounds': {
      'width': 400,
      'height': 500
    }
  });

  let fileNames = [
    'file1.log',
    'file2.mp4',
    'file3.jpg',
    'file4.mp4',
    'file5.jpg'
  ]

  let fileSystem

  fsUtils.getCFS()
    .then(fs => {
      fileSystem = fs
      return deleteAllFilesFormDirectory(fs.root)
    })
    .then(() => {

      let promises = fileNames.map((filename, idx) => createFileWithUselessBytes(filename, 10 * 1024 * 1027 * (idx + 1), fileSystem))

      return Promise.all(promises)
    })
    .then(fileEntries => {
      return exerciseFilesReading(fileEntries)
    })
    .then(() => {
      console.log('Finished exercise, read ' + FILE_EXERCISE_NUMBER + ' times from disk.')
    })
    .catch(err => {
      console.log('Could not finish file read exercise. Error: ' + err.message)
    })

});

chrome.runtime.onSuspend.addListener(function() {

});