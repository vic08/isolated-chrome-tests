const constants = require('../../../lib/constants')
const FILES_NUMBER = 20000

function getNextFileUrl() {
  return `${constants.DUMMY_FILE_SERVER_URL}/test?size=${1024 * 1024 * (300 + Math.round(Math.random() * 20))}`
}

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

      return fetchFile(getNextFileUrl())
        .then(arrayBuffer => {
          filesLeft--
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
    .then(response => response.arrayBuffer())
}

chrome.app.runtime.onLaunched.addListener(function() {

  chrome.app.window.create('server.html', {
    'outerBounds': {
      'width': 400,
      'height': 500
    }
  });

  exerciseFetch()
    .then(() => {
      console.log(`Finished exercising fetch. Pulled ${FILES_NUMBER}`)
    })
});

chrome.runtime.onSuspend.addListener(function() {

});