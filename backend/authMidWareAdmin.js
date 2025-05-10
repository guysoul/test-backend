import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const authAdminMiddleWare = (req, res, next) => {
  const authAdminHeader = req.headers["authorization"];

  // Check if the Authorization header is present and starts with "Bearer"
  if (!authAdminHeader || !authAdminHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .send("Login required to perform administration tasks!");
  }

  // Extract the token from the Authorization header
  const token = authAdminHeader.split(" ")[1]; // Gets the token after "Bearer "

  if (!token) {
    return res.status(401).json({ success: false, message: "Token Missing!" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    //if (verified.role !== "A") {
    //return res
    // .status(403)
    // .json({ sucess: false, message: "Access denied. Admins only" });
    //}

    req.admin = { id: verified.driver_id, role: verified.role };

    next();
  } catch (err) {
    res.status(400).send("Invalid Token");
  }
};

export default authAdminMiddleWare;
