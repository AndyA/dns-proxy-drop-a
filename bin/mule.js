"use strict";

const axios = require("axios");

(async () => {
  try {
    const res = await axios.get("https://registry.npmjs.org/uglify-js");
    console.log(res);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
