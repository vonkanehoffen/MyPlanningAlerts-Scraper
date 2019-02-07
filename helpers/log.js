const fetch = require("node-fetch");
const config = require("../config");
const colors = require("colors");

const makeString = args =>
  args.reduce((acc, curr) => {
    return (
      acc + (typeof curr === "string" ? curr : JSON.stringify(curr, null, 2))
    );
  }, "");

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
  const message = makeString(args);
  console.log("LOG: ".grey, message);
  sendToSlack(message);
}

function error(...args) {
  const message = makeString(args);
  console.error(...args);
  sendToSlack(`ERROR: ${message}`);
}

module.exports = {
  log,
  error
};
