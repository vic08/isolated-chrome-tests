function forceHTTPS (url) {
  return url.replace('http://', 'https://')
}

module.exports = {
  forceHTTPS
}