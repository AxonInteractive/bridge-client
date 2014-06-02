( {

  baseUrl: 'src',
  cjsTranslate: true,
  include: [ 'index', 'include/almond' ],
  optimize: 'none',
  out: 'lib/bridge-client.js',
  wrap: {
    startFile: 'build-start.frag.js',
    endFile: 'build-end.frag.js'
  }

} )