import { Router } from "express";
import db from "../config/db.js";

const router = Router();

router.post(
  "/admin/driver-location",
  (req, res) => {
    const { route_id, lat, lng } = req.body;
    if (!route_id || lat == null || lng == null) {
      return res.status(400).json({ error: "Mangler route_id, lat kordinat eller lng kordinat" });
    }
    const sql = `
      UPDATE driver_route
      SET current_lat = ?, current_lng = ?
      WHERE route_id = ?
    `;
    db.query(sql, [lat, lng, route_id], (err) => {
      if (err) return res.status(500).json({ error: "database feil" });
      res.json({ message: "Posisjon oppdatert" });
    });
  }
);

export default router;
