"use strict";

module.exports = {
  port: 53,
  timeout: 10000,
  upstream: [
    {
      address: "2a00:1098:0:80:1000:3b:0:1",
      port: 53,
      type: "udp",
    },
    {
      address: "2a00:1098:0:82:1000:3b:0:1",
      port: 53,
      type: "udp",
    },
  ],
};
