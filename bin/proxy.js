"use strict";

// A DNS proxy which blocks lookups for IN A records. I'm using it on a Mythic
// Beasts hosted Raspberry Pi to force nodejs to use IPv6. Without this it
// prefers IPv4 addresses - which don't generally route anywhere useful in this
// environment.

const _ = require("lodash");
const config = require("config");
const DonutDNS = require("donut-dns");
const dns = require("native-dns-multisocket");

const { A, TXT } = dns.consts.NAME_TO_QTYPE;
const { IN } = dns.consts.NAME_TO_QCLASS;

function getPort() {
  const args = process.argv.slice(2);
  if (!args.length) return config.port;
  if (args.length !== 1 || isNaN(args[0]))
    throw new Error("Syntax: proxy.js [<port>]");
  return Number(args[0]);
}

const { upstream, timeout } = config;
const app = new DonutDNS({ upstream, timeout });

// Debugging
if (config.debug)
  app.use((req, res, next) => {
    console.log("question:", req.question);
    const orig = res.send.bind(res);
    res.send = () => {
      console.log("answer:", res.answer);
      orig();
    };
    next();
  });

const isA = (a) => a.class === IN && a.type === A;

app.use(async (req, res, next) => {
  await app.proxyRequest(req, res);
  res.answer = res.answer.filter((a) => !isA(a));
  res.send();
});

app.listen(getPort());
