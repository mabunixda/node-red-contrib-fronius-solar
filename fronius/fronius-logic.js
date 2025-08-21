// Extracted business logic for Fronius node
function isValidHead(json) {
  return !!(
    json &&
    json.Head &&
    json.Head.Status &&
    json.Head.Status.Code === 0
  );
}

function extractPayload(json) {
  if (!json || !json.Body || !json.Body.Data) return {};
  return json.Body.Data;
}

module.exports = {
  isValidHead,
  extractPayload,
};
