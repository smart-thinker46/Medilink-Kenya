const appJson = require("./app.json");

const expoConfig = appJson.expo || {};

module.exports = () => expoConfig;
