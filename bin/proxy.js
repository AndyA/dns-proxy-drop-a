"use strict";

const dns = require("native-dns-multisocket");
const _ = require("lodash");
const Promise = require("bluebird");
const config = require("config");

const { A } = dns.consts.NAME_TO_QTYPE;
const { IN } = dns.consts.NAME_TO_QCLASS;

function getPort() {
  const args = process.argv.slice(2);
  if (!args.length) return config.port;
  if (args.length !== 1 || isNaN(args[0]))
    throw new Error("Syntax: proxy.js [<port>]");
  return Number(args[0]);
}

async function lookup(question, server, timeout) {
  if (_.isArray(server))
    return Promise.any(server.map((s) => lookup(question, s)));

  return new Promise((resolve, reject) => {
    console.log(`  proxying via ${server.address}`, question);

    const answer = [];

    dns
      .Request({ question, server, timeout })
      .on("message", (err, msg) => {
        if (err) reject(err);
        answer.push(...msg.answer);
      })
      .on("end", () => resolve(answer))
      .send();
  });
}

async function handleRequest(request, response) {
  console.log("question", request.question);

  const { upstream, timeout } = config;

  // Filter out the IN A questions.
  const keepers = request.question.filter(
    (q) => !(q.type === A && q.class === IN)
  );

  try {
    const answers = _.flatten(
      await Promise.all(keepers.map((q) => lookup(q, upstream, timeout)))
    );

    response.answer.push(...answers);
  } catch (e) {
    console.error(e);
  } finally {
    console.log("answering", request.question);
    response.send();
  }
}

const port = getPort();

dns
  .createServer()
  .on("listening", () => console.log(`server listening on ${port}`))
  .on("close", () => console.log("server closed"))
  .on("error", (err, buff, req, res) => console.error(err.stack))
  .on("socketError", (err, socket) => console.error(err))
  .on("request", handleRequest)
  .serve(port);
