import { handleSttRequest } from './stt-handler.js';

export default async function handler(req, res) {
  return handleSttRequest(req, res);
}

