const constants = require('../../../lib/constants')
const FILES_NUMBER = 20000
const CONCURRENT_NUMBER = 10

function exerciseFetch() {
  return new Promise((resolve, reject) => {
    let filesLeft = FILES_NUMBER

    let makeNextStep = () => {
      if (filesLeft % 50 === 0) {
        console.log(filesLeft)
      }
      if (filesLeft <= 0) {
        return resolve()
      }

      let i = 0
      let urls = []
      while (i < CONCURRENT_NUMBER) {
        urls.push(`${constants.DUMMY_FILE_SERVER_URL}/test?size=${1024 * 1024 * (300 + Math.round(Math.random() * 20))}`)
        i++
      }

      return Promise.all(urls.map(url => fetchFile(url)))
        .then(arrayBuffers => {
          filesLeft = filesLeft - CONCURRENT_NUMBER
          makeNextStep()
        })
        .catch(reject)
    }

    makeNextStep()
  })
}

function fetchFile(fileUrl) {
  return fetch(fileUrl, {
    headers: {
      connection: 'close',
      'cache-control': 'no-cache'
    },
    cache: 'no-cache'
  })
    .then(response => {
      let reader = response.body.getReader()

      return new Promise((resolve, reject) => {
        let readTillEnd = () => {
          reader.read()
            .then(({done, value}) => {
              if (done) {
                resolve()
              } else {
                readTillEnd()
              }
            })
            .catch(reject)
        }
        readTillEnd()
      })

    })
}

chrome.app.runtime.onLaunched.addListener(function() {

  chrome.app.window.create('server.html', {
    'outerBounds': {
      'width': 400,
      'height': 500
    }
  });

  let tryExerciseFetch = () => {
    exerciseFetch()
      .then(() => {
        console.log(`Finished exercising fetch. Pulled ${FILES_NUMBER}`)
      })
      .catch(err => {
        console.log(`error happened while exercising fetch: ${err.message}. Restarting...`)
        tryExerciseFetch()
      })
  }

  tryExerciseFetch()
});

chrome.runtime.onSuspend.addListener(function() {

});