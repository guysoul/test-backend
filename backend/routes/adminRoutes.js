import { Router } from "express";
import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const SECRET_KEY = process.env.JWT_SECRET; //This ensures that only our server can generate and verify tokens.
const REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET; // A separate key for refresh

//Login Route
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required!" });
  }

  const loginSql = "SELECT * FROM driver WHERE email = ?";
  db.query(loginSql, [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Server Error!" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Incorrect Email and Password!" });
    }

    const user = results[0];

    // Compare password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT access token and refresh token to avoid timing out in some minutes
    const access_token = jwt.sign(
      { driver_id: user.driver_id, role: user.role, email: user.email },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    const refresh_token = jwt.sign(
      { driver_id: user.driver_id, role: user.role, email: user.email },
      REFRESH_SECRET_KEY,
      { expiresIn: "1d" } // Refresh token valid for 1 day
    );

    //sends refresh token to front-end
    res.json({
      message: "Login successful",
      access_token,
      refresh_token,
      user: {
        driver_id: user.driver_id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
    });
  });
});

//Refresh token route
router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(403).json({ message: "Access Denied" });
  }

  jwt.verify(refreshToken, REFRESH_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    //Generating a new access token
    const newAccessToken = jwt.sign(
      {
        driver_id: decoded.driver_id,
        role: decoded.role,
        email: decoded.email,
      },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({ accessToken: newAccessToken });
  });
});

//Get route history
router.get("/trip-history", (req, res) => {
  const sql = `
    SELECT 
      rh.history_id,
      rh.route_id,
      d.driver_id,
      CONCAT(d.first_name, ' ', d.last_name) AS driver_name,
      rh.start_time,
      rh.end_time,
      rh.distance,
      rh.fare,
      rh.status,
      rh.passengers,
      dr.message,
      dr.name,
      dr.email,
      dr.phone,
      dr.vehicle_id,
      rh.route_line
    FROM route_history rh
    LEFT JOIN driver_route dr ON rh.route_id = dr.route_id
    LEFT JOIN driver d ON rh.driver_id = d.driver_id
    
    ORDER BY rh.end_time DESC;
  `;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Kunne ikke hente rutehistorikk" });
    }
    res.json(results);
  });
});

//Adding routes to History
router.post("/trip-history", async (req, res) => {
  const {
    route_id,
    driver_id,
    start_time,
    end_time,
    distance,
    fare,
    status,
    passengers,
    route_line,
  } = req.body;

  // Check if all required fields are provided
  if (
    !route_id ||
    !driver_id ||
    !start_time ||
    !end_time ||
    distance == null ||
    fare == null ||
    !status ||
    !passengers == null ||
    !route_line
  ) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  const insertTripHistorySql = `
    INSERT INTO route_history (route_id, driver_id,  start_time, end_time, distance, fare, status,passengers,route_line)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)`;

  try {
    // Execute the insert query
    const [result] = await db
      .promise()
      .query(insertTripHistorySql, [
        route_id,
        driver_id,
        start_time,
        end_time,
        distance,
        fare,
        status,
        passengers,
        route_line,
      ]);

    res.status(201).json({
      message: "Trip history added successfully!",
      history_id: result.insertId,
    });
  } catch (error) {
    console.error("Error when adding trip to history", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
});

//Get active trips list
router.get("/active-trips", (req, res) => {
  const sql = `
    SELECT * FROM driver_route 
    WHERE status IN ('not_started', 'in_progress')
  `;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Kunne ikke hente aktive turer" });
    }
    res.json(results);
  });
});

router.put("/active-trips/:routeId/location", (req, res) => {
  const { routeId } = req.params;
  const { current_lat, current_lng } = req.body;

  if (current_lat == null || current_lng == null) {
    return res
      .status(400)
      .json({ error: "current_lat og current_lng må sendes" });
  }

  const sql = `
    UPDATE driver_route
    SET current_lat = ?, current_lng = ?
    WHERE route_id = ?
  `;

  db.query(sql, [current_lat, current_lng, routeId], (err, result) => {
    if (err) {
      console.error("Feil ved oppdatering av lokasjon:", err);
      return res.status(500).json({ error: "Kunne ikke oppdatere lokasjon" });
    }
    res.json({ message: "Lokasjon oppdatert" });
  });
});

//Update trip status (active trip)
router.put("/active-trips/:routeId", async (req, res) => {
  const rtID = req.params.routeId;
  const { status } = req.body;
  const end_time = new Date().toISOString();

  if (!status) {
    return res.status(400).json({ message: "Status is missing!" });
  }

  const updateTripStatusSql =
    "UPDATE driver_route SET status = ?, end_time = ? where route_id = ?";

  try {
    const [result] = await db
      .promise()
      .query(updateTripStatusSql, [status, end_time, rtID]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Active trip not found!" });
    }

    res.status(200).json({ message: `Trip status updated to ${status}` });
  } catch (error) {
    console.error("Error when updating trip status", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
});

// route for testing tokens only
router.post("/test-decode", (req, res) => {
  const { accessToken, refreshToken } = req.body;

  if (!accessToken || !refreshToken) {
    return res.status(400).json({ message: "Tokens are required!" });
  }

  const decodedAccessToken = jwt.decode(accessToken);
  const decodedRefreshToken = jwt.decode(refreshToken);

  res.json({
    accessTokenData: decodedAccessToken,
    refreshTokenData: decodedRefreshToken,
  });
});

export default router;
