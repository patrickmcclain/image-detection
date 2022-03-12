const express = require('express');
const formidable = require('formidable');
const reload = require('reload');
const http = require('http');
const fs = require('fs');
const app = express();
const port = 3000;

app.get('/', (req: any, res: any) => {
  res.sendFile('reloadHtml.html', { root: __dirname });
});

app.post('/upload', (req, res, next) => {
  const form = formidable({ multiples: true });

  form.parse(req, (err, fields, files) => {
    if (err) {
      next(err);
      return;
    }

    console.log(files)
    var oldpath = files.someExpressFiles.filepath;
    console.log(oldpath)
    var newpath = '/Users/pmii/Projects/test_image_upload/' + files.someExpressFiles.originalFilename;
    fs.rename(oldpath, newpath, function (err) {
      if (err) throw err;
      res.write('File uploaded and moved!');
      res.end();
    });
  });
});

var server = http.createServer(app);

// Reload code here
reload(app).then(function (reloadReturned) {
  // Reload started, start web server
  server.listen(port, function () {
    console.log('Web server listening on port ' + port);
  })
}).catch(function (err) {
  console.error('Reload could not start, could not start server/sample app', err);
});