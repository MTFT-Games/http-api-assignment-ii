// #region Imports
const http = require('http');
const fs = require('fs');
const path = require('path').posix;
const utilities = require('./utilities.js');
const responses = require('./responses.js');
// #endregion

// #region Settings
// Read and parse settings file
const settings = JSON.parse(fs.readFileSync(`${__dirname}/../settings.json`));

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// Attempt to verify and set the webdir to serve from
let webdir;
try {
  webdir = fs.realpathSync(`${__dirname}/../${process.env.NODE_WEBDIR || settings.webdir}`);
} catch (error) {
  // Log error and exit if web directory could not be established
  if (error.code === 'NOENT') {
    console.log(`ERROR: webdir directory ${error.path} not found. `
      + 'Check the webdir is set correctly in settings.json');
  } else {
    console.log(error);
  }
  process.exit(1);
}
// #endregion

// Struct to manage any cases that should be handled in a specific way
const specialCases = {
  '/': (request, response) => responses.serveFile(request, response, `${webdir}/client.html`),
  '/getUsers': responses.getUsers,
  '/addUser': (request, response) => responses.parseBody(request, response, responses.addUser),
};

function onRequest(request, response) {
  const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
  const resolvedPath = path.normalize(parsedUrl.pathname);

  // Check if the requested resource is a special case
  if (specialCases[resolvedPath]) {
    specialCases[resolvedPath](request, response, parsedUrl.searchParams);
  } else if ((request.method === 'GET' || request.method === 'HEAD') && utilities.checkValidFile(webdir + resolvedPath)) {
    // If a file exists at the requested path, get it.
    responses.serveFile(request, response, webdir + resolvedPath);
  } else {
    responses.sendCode(
      request,
      response,
      404,
      '404NotFound',
      'The page or resource you have requested does not exist.',
    );
  }
}

http.createServer(onRequest).listen(port, () => {
  console.log(`Serving files in ${webdir} on port ${port}`);
});
