import express from 'express';
import formidable from 'formidable';
import reload from 'reload';
import http from 'http';
import path from 'path';
import { downloadImage, uploadImage, analyzeImage, getImageUrl } from './services/imageService';
import { ImageLabel, insertImageLabels } from './models/ImageLabel';
import { Image, insertImage } from './models/Image';
import { handleError } from './utils/errors';
import { getAllImages, getImage, getImagesByLabels, ImageMetadata } from './models/ImageMetadata';
import { insertLabels } from './models/Label';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

// Gets all image metadata or images that have the provided labels
app.get('/images', async (req, res) => {
  const queryLabels = req.query?.objects as string;
  const labelSearch = !!queryLabels;

  try {
    let allImages: ImageMetadata[] = [];

    if (labelSearch) {
      const labels = queryLabels.split(',');
      allImages = await getImagesByLabels(labels);
    } else {
      allImages = await getAllImages();
    }

    res.json({
      status: 'SUCCESS',
      images: allImages
    });
  } catch (err) {
    handleError(res, err);
  }
});

app.get('/images/:id', async (req, res) => {
  try {
    const imageMetadata = await getImage(req.params.id);

    res.json({
      status: 'SUCCESS',
      ...imageMetadata
    });
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/images', (req, res) => {
  const form = formidable({ multiples: true });
  form.parse(req, async (err, fields: any, files: any) => {
    if (err) {
      handleError(res, err);
      return;
    }

    try {
      const url: string = fields?.url;
      const analyze: string = fields?.analyze;
      let imageLabel: string = fields?.label;
      let filePath, fileKey: string;
      
      if (url) {
        filePath = await downloadImage(url);
        fileKey = path.basename(filePath);
      } else {
        filePath = files.image.filepath;
        fileKey = files.image.originalFilename;
      }

      if (!imageLabel || imageLabel?.length == 0) {
        imageLabel = fileKey;
      }

      const image: Image = { name: fileKey, label: imageLabel, url: getImageUrl(fileKey) };
      const [uploadResponse, insertImageResponse] = await Promise.all([
        uploadImage(filePath, fileKey),
        insertImage(image)
      ]);

      let imageLabels;

      if (analyze == 'true') {
        const analyzeResponse = await analyzeImage(uploadResponse.fileKey);

        const labels = analyzeResponse.Labels
          ?.filter(label => label.Confidence && label.Confidence > 90)
          .map(label => ({ name: label.Name?.toLowerCase(), conf: label.Confidence }));
        imageLabels = labels?.map(label => ({imageId: insertImageResponse.id, labelId: label.name, conf: label.conf} as ImageLabel));

        await insertLabels(labels);
        await insertImageLabels(imageLabels);
      }

      const returnLabels = imageLabels?.map(imageLabel => ({label: imageLabel.labelId, conf: imageLabel.conf}));
      
      res.json({
        status: 'SUCCESS',
        image: {
          id: insertImageResponse.id,
          ...image
        },
        objects_identified: returnLabels ? returnLabels : []
      });
    } catch (err) {
      handleError(res, err);
    }
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