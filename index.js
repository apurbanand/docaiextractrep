'use strict';

const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1beta3;
const { Storage } = require('@google-cloud/storage');

async function processDocument() {
  const { projectId, location, processorId, fileName } = req.body;

  // Instantiates a client
  const client = new DocumentProcessorServiceClient();
  const storage = new Storage();

  // The full resource name of the processor
  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

  // Read the file from Google Cloud Storage
  const bucketName = 'docai-upload-dropbox';
  const file = storage.bucket(bucketName).file(fileName);
  const [fileContent] = await file.download();

  // Convert the file data to a Buffer and base64 encode it
  const encodedImage = Buffer.from(fileContent).toString('base64');

  const request = {
    name,
    rawDocument: {
      content: encodedImage,
      mimeType: 'application/pdf',
    },
  };

  // Recognizes text entities in the PDF document
  const [result] = await client.processDocument(request);

  console.log('Document processing complete.');

  // Read fields specifically from the specialized processor
  const { document } = result;
  const entities = [];
  for (const entity of document.entities) {
    const key = entity.type;
    const textValue = entity.textAnchor !== null ? entity.textAnchor.content : '';
    const conf = entity.confidence * 100;
    entities.push({
      key,
      textValue,
      confidence: conf.toFixed(2)
    });
  }

  return entities;
}

exports.processDocument = async (req, res) => {
  try {
    const entities = await processDocument();
    console.log('Extracted Entities:', entities);
    res.status(200).json(entities);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};
