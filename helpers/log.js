const fetch = require("node-fetch");
const config = require("../config");
const colors = require("colors");
const util = require("util");

function sendToSlack(message) {
  const data = { text: message };

  fetch(config.slackWebHookURL, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-type": "application/json"
    }
  });
}

function log(...args) {
  const message = util.format(...args);
  console.log("LOG: ".grey, message);
  sendToSlack(`*LOG:* ${message}`);
}

function error(...args) {
  const message = util.format(...args);
  console.error("ERROR: ".red, message);
  sendToSlack(`*ERROR:* ${message}`);
}

module.exports = {
  log,
  error
};
