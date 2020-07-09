"use strict";

const dns = require("native-dns-multisocket");
const _ = require("lodash");
const Promise = require("bluebird");
const config = require("config");

const { A, TXT } = dns.consts.NAME_TO_QTYPE;
const { IN } = dns.consts.NAME_TO_QCLASS;

const txtRec = (name, data) => ({ name, type: TXT, class: IN, ttl: 60, data });
const dpdaRec = (name, suffix, message) =>
  txtRec(name, [`x-dpda-${suffix}: ${message}`]);

function getPort() {
  const args = process.argv.slice(2);
  if (args.length === 1) return Number(args[0]);
  return config.port;
}

async function lookup(question, server) {
  if (_.isArray(server))
    return Promise.any(server.map((s) => lookup(question, s)));

  return new Promise((resolve, reject) => {
    console.log(`  proxying via ${server.address}`, question);

    const answer = [];

    const via = dpdaRec(question.name, "via", server.address);

    dns
      .Request({ question, server, timeout: 10000 })
      .on("message", (err, msg) => {
        if (err) reject(err); // ORLY? Not very DNS
        answer.push(...msg.answer);
      })
      .on("end", () => resolve([...answer, via]))
      .send();
  });
}

async function handleRequest(request, response) {
  console.log("question", request.question);

  const { upstream } = config;

  const [a, other] = _.partition(
    request.question,
    (q) => q.type === A && q.class === IN
  );

  const info = a.map((q) =>
    dpdaRec(q.name, "dropped", "IN A dropped to force IPv6")
  );

  try {
    const answers = _.flatten(
      await Promise.all(other.map((q) => lookup(q, upstream)))
    );

    response.answer.push(...answers, ...info);
  } catch (e) {
    console.error(e);
  } finally {
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
