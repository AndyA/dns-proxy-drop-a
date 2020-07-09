"use strict";

const dns = require("native-dns-multisocket");
const Promise = require("bluebird");

const port = 53;

const authority = {
  address: "2a00:1098:0:80:1000:3b:0:1",
  port: 53,
  type: "udp",
};

function lookup(question, server) {
  return new Promise((resolve, reject) => {
    console.log("proxying", question);

    const answer = [];

    dns
      .Request({ question, server, timeout: 10000 })
      .on("message", (err, msg) => {
        if (err) reject(err); // ORLY? Not very DNS
        answer.push(...msg.answer);
      })
      .on("end", () => resolve(answer))
      .send();
  });
}

function handleRequest(request, response) {
  console.log("question", request.question);

  const ff = request.question
    .filter((question) => question.type !== dns.consts.NAME_TO_QTYPE.A)
    .map((question) =>
      lookup(question, authority).then((answer) =>
        response.answer.push(...answer)
      )
    );

  Promise.all(ff).then(() => response.send());
}

dns
  .createServer()
  .on("listening", () => console.log("server listening"))
  .on("close", () => console.log("server closed"))
  .on("error", (err, buff, req, res) => console.error(err.stack))
  .on("socketError", (err, socket) => console.error(err))
  .on("request", handleRequest)
  .serve(port);
