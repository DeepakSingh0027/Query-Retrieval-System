require("dotenv").config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (token !== process.env.AUTH_TOKEN) {
    return res.status(403).json({ message: "Invalid token" });
  }
  next();
};

module.exports = authenticateToken;
