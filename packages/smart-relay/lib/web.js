import express from 'express';
import { assert } from '@agoric/assert';

export async function startAPIServer(port, inboundHTTPRequest) {
  async function handleRequest(request, response) {
    try {
      const answer = await inboundHTTPRequest(request);
      response.json(answer);
    } catch (e) {
      response.send(`error during processing: ${e}`);
      response.end();
    }
  }
  const app = express();
  // todo but not yet: app.use(express.json())
  // I don't want to force `curl -H "content-type: application/json"` everywhere
  app.use(handleRequest);
  await app.listen(port);
  console.log(`API listening on HTTP port ${port}`);
}
