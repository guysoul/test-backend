import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../config/db.js";
import authAdminMiddleWare from "../authMidWareAdmin.js";
import crypto from "crypto";

const router = Router();

//Register new drivers/admin
router.post("/drivers", async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    password,
    mobile,
    registered_date,
    role,
  } = req.body;

  if (
    !first_name ||
    !last_name ||
    !email ||
    !password ||
    !mobile ||
    !registered_date ||
    !role
  ) {
    return res.status(400).json({ error: "All fields are required!" });
  }

  try {
    //Check if email already exists
    const emailCheckSql = "SELECT * FROM driver WHERE email = ?";
    const [driverExist] = await db.promise().query(emailCheckSql, [email]);

    if (driverExist.length > 0) {
      return res.status(400).json({ error: "Email already exists!" });
    }

    //Hashing the password before inserting
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);

    //Inserting new driver/admin
    const insertDriverSql =
      "INSERT INTO driver (first_name, last_name, email, password, mobile, registered_date, role) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const [insertResult] = await db
      .promise()
      .query(insertDriverSql, [
        first_name,
        last_name,
        email,
        encryptedPassword,
        mobile,
        registered_date,
        role,
      ]);

    res.status(201).json({
      message: "Driver has been successfully registered",
      driverId: insertResult.insertId,
    });
  } catch (error) {
    console.error("Error registering driver:", error);
    res.status(500).json({ error: "Failed to register driver!" });
  }
});

//List of all drivers
router.get("/drivers", authAdminMiddleWare, async (req, res) => {
  const driverSql = "SELECT * FROM driver order by driver_id";

  try {
    const [results] = await db.promise().query(driverSql);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch the driver list!" });
  }
});

//Updating driver information
router.put("/drivers/:driverId", authAdminMiddleWare, async (req, res) => {
  const drID = req.params.driverId;
  const { first_name, last_name, email, mobile, role } = req.body;

  //Checks if at least one field is provided
  if (!first_name && !last_name && !email && !mobile && !role) {
    return res.status(400).json({ error: "No fields provided for update!" });
  }

  try {
    //Creating dynamic update
    let fieldsUpdate = [];
    let values = [];

    if (first_name) {
      fieldsUpdate.push("first_name = ?");
      values.push(first_name);
    }

    if (last_name) {
      fieldsUpdate.push("last_name = ?");
      values.push(last_name);
    }

    if (email) {
      fieldsUpdate.push("email = ?");
      values.push(email);
    }

    if (mobile) {
      fieldsUpdate.push("mobile = ?");
      values.push(mobile);
    }

    if (role) {
      fieldsUpdate.push("role = ?");
      values.push(role);
    }

    values.push(drID); // Driver ID as the last parameter

    const updateDriverSql = `UPDATE driver SET ${fieldsUpdate.join(
      ", "
    )} WHERE driver_id = ?`;
    const [result] = await db.promise().query(updateDriverSql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Driver not found!" });
    }
    res.status(200).json({ message: "Driver updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update driver details!" });
  }
});

//Deactivating Driver
router.put("/drivers/:driverId/deactivate", async (req, res) => {
  const drID = req.params.driverId;
  const deactivateDriverSql =
    "UPDATE driver SET inactivated_date = now() where driver_id = ?";

  try {
    const [result] = await db.promise().query(deactivateDriverSql, [drID]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Driver not found!" });
    }

    res.status(200).json({ message: "Driver Deactivated!" });
  } catch (error) {
    console.error("Error when deactivating the driver", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
});

//Activating Driver
router.put("/drivers/:driverId/activate", async (req, res) => {
  const drID = req.params.driverId;
  const activateDriverSql =
    "UPDATE driver SET inactivated_date = null where driver_id = ?";

  try {
    const [result] = await db.promise().query(activateDriverSql, [drID]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Driver not found!" });
    }

    res.status(200).json({ message: "Driver Activated!" });
  } catch (error) {
    console.error("Error when Activating the driver", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
});

//List of all trips for a specific driver
router.get("/drivertrips/:driverId", authAdminMiddleWare, async (req, res) => {
  const drId = req.params.driverId;
  const driverSql = "SELECT * FROM driver_route where driver_id = ?";
  try {
    const [results] = await db.promise().query(driverSql, [drId]);
    res.json(results);
  } catch (error) {
    console.error("Error when fetching the driver route", error);
    res.status(500).json({ error: "Unable to fetch the driver route list!" });
  }
});

//Display my profile
router.get("/drivers/:driverId", async (req, res) => {
  const drID = req.params.driverId;
  const driverSql = "SELECT * FROM driver WHERE driver_id = ?";

  try {
    const [driver] = await db.promise().query(driverSql, [drID]);
    if (driver.length === 0) {
      return res.status(404).json({ message: "Driver not found!" });
    }
    res.json(driver[0]); // Send the driver details
  } catch (error) {
    console.error("Error fetching driver profile:", error);
    res.status(500).json({ error: "Unable to fetch driver profile!" });
  }
});

//Update password on my profile
router.put("/drivers/:driver_id/password", async (req, res) => {
  const { driver_id } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {
    // Fetch the driver from the database
    const driverSql = "SELECT * FROM driver WHERE driver_id = ?";
    const [driver] = await db.promise().query(driverSql, [driver_id]);

    if (driver.length === 0) {
      return res.status(404).json({ message: "Driver not found!" });
    }

    // Check if the current password matches the stored hashed password
    const match = await bcrypt.compare(currentPassword, driver[0].password);
    if (!match) return res.status(401).send("Incorrect current password");

    // Hash the new password before updating
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // SQL query to update the driver's password
    const updatePasswordSql =
      "UPDATE driver SET password = ? WHERE driver_id = ?";
    await db.promise().query(updatePasswordSql, [hashedPassword, driver_id]);

    res.send("Password updated successfully");
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).send("Error updating password");
  }
});

// Generate a new token and store it in the database
router.post("/forgot-password-request", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM driver WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Driver not found with this email" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 1000 * 60 * 30; // 30 min expiry

    // Store token & expiry in DB
    await db
      .promise()
      .query(
        "UPDATE driver SET reset_token = ?, reset_token_expiry = ? WHERE email = ?",
        [token, expiry, email]
      );

    // Send token to frontend to pass to PHP mailer
    const firstName = rows[0].first_name;
    res.json({ token, first_name: firstName });
  } catch (error) {
    console.error("Error generating reset token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//Resets the password based from the token generated
router.put("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email, token, and new password are required" });
  }

  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT reset_token, reset_token_expiry FROM driver WHERE email = ?",
        [email]
      );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const { reset_token, reset_token_expiry } = rows[0];

    if (
      !reset_token ||
      reset_token.trim() !== token.trim() ||
      Date.now() > reset_token_expiry
    ) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear token
    await db
      .promise()
      .query(
        "UPDATE driver SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE email = ?",
        [hashedPassword, email]
      );

    res.json({ message: "Password has been successfully reset" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
