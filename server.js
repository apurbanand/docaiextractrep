const http = require('http');
const { processDocument } = require('./index');

const PORT = process.env.PORT || 9000;

http.createServer(async (req, res) => {
  console.log('New connection');

  if (req.method === 'POST') {
    if (req.url === '/processDocument') {
      try {
        const entities = await processDocument(req, res);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(entities);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  } else {
    res.writeHead(405);
    res.end();
  }
}).listen(PORT, () => console.log('Listening on', PORT));
