import { Router } from "express";
import db from "../config/db.js";
import multer from "multer";

const router = Router();

router.get("/vehicles", (req, res) => {
  const sql = "SELECT * FROM vehicle where inactivated_date is null";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching ", err);
      return res.status(500).json({ error: "Kunne ikke hente biler" });
    }
    res.json(results);
  });
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); //nytt fil navn
  },
});
const upload = multer({ storage });

router.post("/vehicles", upload.single("image"), (req, res) => {
  const { license_plate, brand, model, year, color, status, passengers } =
    req.body;
  if (!license_plate || !brand || !model || !year || !color || !status) {
    return res.status(400).json({ error: "Mangler info" });
  }
  const image_url = req.file ? req.file.path : null;

  const sql = `
      INSERT INTO vehicle (license_plate, brand, model, year, color, status, passengers, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?,?)
    `;
  db.query(
    sql,
    [
      license_plate,
      brand,
      model,
      year,
      color,
      status,
      passengers || 0,
      image_url,
    ],
    (err, results) => {
      if (err) {
        console.error("Error adding vehicles", err);
        return res.status(500).json({ error: "Kunne ikke legge til bil" });
      }
      res.status(201).json({
        vehicle_id: results.insertId,
        license_plate,
        brand,
        model,
        year,
        color,
        status,
        passengers: passengers || 0,
        image_url,
      });
    }
  );
});

router.delete("/vehicles/:vehicle_id", (req, res) => {
  const { vehicle_id } = req.params;
  const sql = "DELETE FROM vehicle WHERE vehicle_id = ?";
  db.query(sql, [vehicle_id], (err, results) => {
    if (err) {
      console.error("Error deleting vehicle:", err);
      return res.status(500).json({ error: "Kunne ikke slette bil" });
    }
    res.json({ message: "Bil slettet" });
  });
});

//Deactivating vehicle
router.put("/vehicles/:vehicle_id/deactivate", async (req, res) => {
  const vehicID = req.params.vehicle_id;
  const deactivateVehicleSql =
    "UPDATE vehicle SET inactivated_date = now() where vehicle_id = ?";

  try {
    const [result] = await db.promise().query(deactivateVehicleSql, [vehicID]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Vehicle not found!" });
    }

    res.status(200).json({ message: "Vehicle Deactivated!" });
  } catch (error) {
    console.error("Error when deactivating the Vehicle", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
});

router.put("/vehicles/:vehicle_id", (req, res) => {
  const { vehicle_id } = req.params;
  const { license_plate, brand, model, year, color, status, passengers } =
    req.body;
  const sql = `
      UPDATE vehicle
      SET license_plate = ?, 
      brand = ?, 
      model = ?, 
      year = ?, 
      color = ?, 
      status = ?, 
      passengers = ?
      WHERE vehicle_id = ?
    `;
  db.query(
    sql,
    [license_plate, brand, model, year, color, status, passengers, vehicle_id],
    (err, results) => {
      if (err) {
        console.error("Error updating vehicle", err);
        return res.status(500).json({ error: "Kunne ikke oppdatere bil" });
      }
      res.json({ message: "Bil oppdatert" });
    }
  );
});
export default router;
