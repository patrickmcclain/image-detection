/**
 * HEB Image Object Detection Node.js API
 * 
 * Author: Patrick McClain <p.mcclain281@gmail.com>
 */

import express from 'express';
import formidable from 'formidable';
import reload from 'reload';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { downloadImage, uploadImage, analyzeImage, getImageUrl } from './services/imageService';
import { ImageLabel, insertImageLabels } from './models/ImageLabel';
import { Image, insertImage } from './models/Image';
import { handleError } from './utils/errors';
import { getAllImages, getImage, getImagesByLabels, ImageMetadata } from './models/ImageMetadata';
import { insertLabels } from './models/Label';

const app = express();
app.use(cors());
const port = 3000;


/**
 * Serves a bare bones HTML page for interacting with the API
 * 
 * @name get/home
 * @function
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware.
 */
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});


/**
 * Route either: serves all images, or searches by labels;
 * depending on whether the '?objects' query param is set.
 * 
 * @name get/images
 * @function
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware.
 */
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


/**
 * Fetches an image's metadata by id
 * 
 * @name get/images/:id
 * @function
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware.
 */
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


/**
 * Uploads / Downloads an image, and stores and analyzes it.
 * Then returns the metadata and objects detected.
 * 
 * @name post/images
 * @function
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware.
 */
app.post('/images', (req, res) => {
  // Parse request to extract files uploaded, and fields passed
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
      
      // If url provided, download image; else use file uploaed.
      if (url) {
        filePath = await downloadImage(url);
        fileKey = path.basename(filePath);
      } else {
        filePath = files.file.filepath;
        fileKey = files.file.originalFilename;
      }

      // Use file name as label, if none provided.
      if (!imageLabel || imageLabel?.length == 0) {
        imageLabel = fileKey;
      }

      // Upload image to S3
      // Insert image data into DB
      const image: Image = { name: fileKey, label: imageLabel, url: getImageUrl(fileKey) };
      const [uploadResponse, insertImageResponse] = await Promise.all([
        uploadImage(filePath, fileKey),
        insertImage(image)
      ]);

      let imageLabels;

      // Only analyze if requested
      if (analyze == 'true') {
        const analyzeResponse = await analyzeImage(uploadResponse.fileKey);

        const labels = analyzeResponse.Labels
          ?.filter(label => label.Confidence && label.Confidence > 90)
          .map(label => ({ name: label.Name?.toLowerCase(), conf: label.Confidence }));
        imageLabels = labels?.map(label => ({imageId: insertImageResponse.id, labelId: label.name, conf: label.conf} as ImageLabel));

        // Insert Label records to DB
        // Insert ImageLabel relational data to DB
        await insertLabels(labels);
        await insertImageLabels(imageLabels);
      }

      const returnLabels = imageLabels?.map(imageLabel => ({label: imageLabel.labelId, conf: imageLabel.conf}));
      
      // return success response with image metadata
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