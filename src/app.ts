import express from 'express';
import formidable from 'formidable';
import reload from 'reload';
import http from 'http';
import path from 'path';
import { downloadImage, uploadImage, analyzeImage } from './services/imageService';

const app = express();
const port = 3000;


app.get('/', (req, res) => {
  res.sendFile('reloadHtml.html', { root: __dirname });
});

// Gets all image metadata OR images that have the provided labels
app.get('/images', (req, res) => {
  const labelSearch: boolean = !!req.query?.objects;
  
});

app.get('/images/:imageId', (req, res) => {
  
});

app.post('/images', (req, res) => {
  const form = formidable({ multiples: true });
  form.parse(req, async (err, fields: any, files: any) => {
    if (err) {
      res.write(err);
      res.end();
      return;
    }

    try {
      const url = fields?.url;
      const analyze = fields?.analyze;
      let filePath, fileKey;
      
      if (url) {
        filePath = await downloadImage(url);
        fileKey = path.basename(filePath);
      } else {
        filePath = files.image.filepath;
        fileKey = files.image.originalFilename;
      }

      const uploadResponse = await uploadImage(filePath, fileKey);

      if (analyze == 'true') {
        await analyzeImage(uploadResponse.fileKey);
      }
      
      res.write('File uploaded and moved!');
    } catch (err) {
      res.write(err);
    }

    res.end();
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