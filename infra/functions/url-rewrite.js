// CloudFront Function (viewer-request) for www.leok87x.com.
// - /posts/foo/  -> /posts/foo/index.html (served from S3)
// - /posts/foo   -> 301 /posts/foo/       (keeps relative links working)
// - /file.ext    -> unchanged
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
    return request;
  }

  var last = uri.substring(uri.lastIndexOf("/") + 1);
  if (last.indexOf(".") === -1) {
    var qs = buildQueryString(request.querystring);
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { location: { value: uri + "/" + qs } },
    };
  }

  return request;
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
