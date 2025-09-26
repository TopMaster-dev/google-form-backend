const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
    process.env.DB_DATABASE,     // google_form_clone
    process.env.DB_USERNAME,     // root
    process.env.DB_PASSWORD,     // root@121
    {
        host: process.env.DB_HOST,     // 127.0.0.1
        dialect: "mysql",
        port: process.env.DB_PORT,     // 3306
        logging: false,
    }
);

console.log(process.env.DB_DATABASE, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_HOST, process.env.DB_PORT); // Debug output

module.exports = sequelize;
