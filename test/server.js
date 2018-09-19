const express = require('express');
let retry = true,
  app = express();

app.get('/httpServices/403', function(req, res) {
  res.status(403);
  res.send('403');
});
app.get('/httpServices/200', function(req, res) {
  res.status(200);
  res.send('200');
});
app.get('/httpServices/retry', function(req, res) {
  if (!retry) {
    res.status(403)
  } else {
    res.status(200);
  }
  retry = !retry;
  res.send('retry');
});

module.exports = app;