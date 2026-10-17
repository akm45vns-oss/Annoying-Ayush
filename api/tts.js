import { handleTtsRequest } from './tts-handler.js';

export default async function handler(req, res) {
  return handleTtsRequest(req, res);
}
