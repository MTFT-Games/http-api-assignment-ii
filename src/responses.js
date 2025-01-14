const fs = require('fs');
const utilities = require('./utilities.js');

const users = {};

// Respond with an error code and object.
function sendCode(request, response, code, id, message) {
  const contentType = utilities.determineType(request, ['application/json', 'text/xml']);
  response.writeHead(code, { 'Content-Type': contentType });

  if (request.method !== 'HEAD') {
    const responseJSON = { message };
    if (id) {
      responseJSON.id = id;
    }

    let responseContent;
    if (contentType === 'text/xml') {
      responseContent = utilities.jsonToXml(responseJSON);
    } else {
      responseContent = JSON.stringify(responseJSON);
    }

    response.write(responseContent);
  }

  response.end();
}

// Respond with a file read from the file system.
function serveFile(request, response, filePath) {
  // currently only supports html and css for simplicity

  const fileExtension = filePath.substring(filePath.lastIndexOf('.'));

  // Determine available content types based on file extention.
  let contentType;
  if (fileExtension === '.html') {
    contentType = utilities.determineType(request, ['text/html', 'text/plain']);
  } else if (fileExtension === '.css') {
    contentType = utilities.determineType(request, ['text/css', 'text/plain']);
  } else {
    // 415 code, unsupported media type
    return sendCode(
      request,
      response,
      415,
      '415UnsupportedMediaType',
      'The resource you requested is of an unsupported type.',
    );
  }

  response.writeHead(200, { 'Content-Type': contentType });

  if (request.method === 'GET') {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        // The file should be checked to be sure it can be accessed before calling this function.
        // If it now cant be read, thats an unknown error.
        return sendCode(
          request,
          response,
          500,
          '500InternalServerError',
          'The server encountered an unexpected problem getting the resource.',
        );
      }

      response.write(data);
      return response.end();
    });
  } else {
    return response.end();
  }
  // Eslint is mad so heres a return
  return 1;
}

// Gets the users object
function getUsers(request, response) {
  response.writeHead(200);

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  response.write(JSON.stringify(users));
  response.end();
}

// Add or update the users object
function addUser(request, response, data) {
  if (!data.name || !data.age) {
    return sendCode(
      request,
      response,
      400,
      'addUserMissingParams',
      'Name and age are both required.',
    );
  }

  if (users[data.name]) {
    users[data.name].age = data.age;
    response.statusCode = 204;
    return response.end();
  }

  users[data.name] = { name: data.name, age: data.age };
  return sendCode(
    request,
    response,
    201,
    null,
    'Created successfully.',
  );
}

// Parse a request body to json
function parseBody(request, response, callback) {
  const body = [];

  request.on('error', () => {
    sendCode(
      request,
      response,
      400,
      '400PostBody',
      'Error when receiving post body.',
    );
  });

  request.on('data', (chunk) => {
    body.push(chunk);
  });

  request.on('end', () => {
    callback(request, response, JSON.parse(Buffer.concat(body).toString()));
  });
}

module.exports = {
  sendCode, serveFile, getUsers, addUser, parseBody,
};
