const jwt = require("jsonwebtoken");
require("dotenv").config();

function auth(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "トークンが提供されていません" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "無効なトークンです" });
    }
}

module.exports = auth;
