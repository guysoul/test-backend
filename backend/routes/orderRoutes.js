import { Router } from "express";
import db from "../config/db.js";

const router = Router();
// lage ordere
router.post("/order", (req, res) => {
  const {
    start_location,
    end_location,
    start_time,
    passengers,
    message,
    name,
    email,
    phone,
    vehicle_id,
    pickup_coords,
    destination_coords,
  } = req.body;
  if (!start_location || !end_location || !start_time) {
    return res.status(400).json({ error: "Mangler info" });
  }
  const registered_date = new Date();
  const status = "pending";
  const sql = `
    INSERT INTO driver_route ( start_location, end_location, start_time, registered_date, status, passengers, message, name, email, phone, vehicle_id, pickup_coords, destination_coords)
    VALUES (?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?,?)
  `;
  db.query(
    sql,
    [
      start_location,
      end_location,
      start_time,
      registered_date,
      status,
      passengers || 1,
      message || "",
      name || "",
      email || "",
      phone || null,
      vehicle_id || null,
      pickup_coords || null,
      destination_coords || null,
    ],
    (err, results) => {
      if (err) {
        console.error("Error i å lage order:", err);
        return res.status(500).json({ error: "Kunne ikke lage bestilling" });
      }
      res.status(201).json({
        route_id: results.insertId,

        driver_id: null,
        start_location,
        end_location,
        start_time,
        registered_date,
        status,
        passengers: passengers,
        message: message || "",
        name: name || "",
        email: email || "",
        phone: phone || null,
        vehicle_id: vehicle_id || null,
        pickup_coords,
        destination_coords,
      });
    }
  );
});

//hente ordere
router.get("/admin/order", (req, res) => {
  const sql =
    "SELECT * FROM driver_route WHERE status IN ('pending', 'cancelled')";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Kunne ikke hente turer" });
    }
    res.json(results);
  });
});
// endre status
router.put("/admin/order/:route_id", (req, res) => {
  const { route_id } = req.params;
  const { status, driver_id } = req.body;
  const sql = `UPDATE driver_route SET status = ?, driver_id = ? WHERE route_id = ?`;
  db.query(sql, [status, driver_id, route_id], (err, results) => {
    if (err) {
      console.error("Error i å oppdatere order:", err);
      return res.status(500).json({ error: "Kunne ikke oppdatere bestilling" });
    }
    res.json({ message: "Bestilling oppdatert" });
  });
});
export default router;
