'use strict';

const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1beta3;
const { Storage } = require('@google-cloud/storage');

exports.processDocument = async (req, res) => {
  const { projectId, location, processorId, fileName } = req.body;

  // Instantiates a client
  const client = new DocumentProcessorServiceClient();
  const storage = new Storage();

  async function processDocument() {
    // The full resource name of the processor, e.g.:
    // projects/project-id/locations/location/processor/processor-id
    // You must create new processors in the Cloud Console first
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    // Read the file from Google Cloud Storage
    const bucketName = 'docai-upload-dropbox';
    const file = storage.bucket(bucketName).file(fileName);
    const [fileContent] = await file.download();

    // Convert the file data to a Buffer and base64 encode it.
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

    // Read fields specifically from the specialized US driver's license processor:
    // https://cloud.google.com/document-ai/docs/processors-list#processor_us-driver-license-parser
    // Retrieving data from other specialized processors follows a similar pattern.
    // For a complete list of processors, see:
    // https://cloud.google.com/document-ai/docs/processors-list
    //
    // OCR and other data are also present in the quality processor's response.
    // Please see the OCR and other samples for how to parse other data in the
    // response.
    const { document } = result;
    const entities = [];
    for (const entity of document.entities) {
      // Fields detected. For a full list of fields for each processor, see
      // the processor documentation:
      // https://cloud.google.com/document-ai/docs/processors-list
      const key = entity.type;
      // Some other value formats in addition to text are available
      // e.g. dates: `entity.normalizedValue.dateValue.year`
      const textValue =
        entity.textAnchor !== null ? entity.textAnchor.content : '';
      const conf = entity.confidence * 100;
      entities.push({
        key,
        textValue,
        confidence: conf.toFixed(2)
      });
    }

    res.status(200).json(entities);
  }

  // [END documentai_process_specialized_document]
  await processDocument().catch((err) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
  });
};
