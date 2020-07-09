"use strict";

const dns = require("dns").promises;
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const _ = require("lodash");

(async () => {
  try {
    const doms = _.shuffle(
      (await fs.readFileAsync("dom.txt", "utf8"))
        .split(/\n/)
        .filter((n) => n.length)
    );
    let done = 0;
    for (const chunk of _.chunk(doms, 100)) {
      await Promise.all(
        chunk.map((host) =>
          dns.lookup(host).catch((e) => {
            if (e.code !== "ENOTFOUND") console.error(e);
          })
        )
      );
      done += chunk.length;
      console.log(`Done: ${done}`);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
