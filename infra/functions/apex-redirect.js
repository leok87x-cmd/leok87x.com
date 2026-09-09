// CloudFront Function (viewer-request) for leok87x.com.
// Redirects every request to the same path on https://www.leok87x.com.
function handler(event) {
  var request = event.request;
  var qs = buildQueryString(request.querystring);
  return {
    statusCode: 301,
    statusDescription: "Moved Permanently",
    headers: {
      location: { value: "https://www.leok87x.com" + request.uri + qs },
      "cache-control": { value: "public, max-age=3600" },
    },
  };
}

function buildQueryString(querystring) {
  var parts = [];
  for (var key in querystring) {
    var entry = querystring[key];
    if (entry.multiValue) {
      for (var i = 0; i < entry.multiValue.length; i++) {
        parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(entry.multiValue[i].value));
      }
    } else {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(entry.value));
    }
  }
  return parts.length ? "?" + parts.join("&") : "";
}
