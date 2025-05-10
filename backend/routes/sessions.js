import { Router } from "express";
import db from "../config/db.js";
import authAdminMiddleWare from "../authMidWareAdmin.js";

const router = Router();

router.get("/sessions/active", authAdminMiddleWare, (req, res) => {
    db.query(
      `SELECT ds.driver_id, l.latitude  AS current_lat, l.longitude AS current_lng
         FROM driver_sessions ds
         JOIN driver_locations l ON ds.session_id = l.session_id
        WHERE ds.end_time IS NULL
        ORDER BY l.logged_at DESC`,
      (err, rows) => err ? res.status(500).json(err) : res.json(rows)
    );
  });

router.post("/sessions", async (req, res) => {
  const { driver_id, start_time } = req.body;
  try {
    const [openRows] = await db
      .promise()
      .query(
        `SELECT session_id FROM driver_sessions WHERE driver_id = ? AND end_time IS NULL`,
        [driver_id]
      );

    if (openRows.length > 0) {
      await db
        .promise()
        .query(
          `UPDATE driver_sessions SET end_time = ? WHERE session_id = ?`,
          [start_time, openRows[0].session_id]
        );
    }

    const [insertResult] = await db
      .promise()
      .query(
        `INSERT INTO driver_sessions (driver_id, start_time) VALUES (?, ?)`,
        [driver_id, start_time]
      );

    res.status(201).json({ session_id: insertResult.insertId });
  } catch (err) {
    console.error("Kunne ikke starte økt:", err);
    res.status(500).json({ error: "Server error", details: err });
  }
});

router.put("/sessions/:id/end", async (req, res) => {
  const { id } = req.params;
  const { end_time } = req.body;
  try {
    await db
      .promise()
      .query(
        `UPDATE driver_sessions SET end_time = ? WHERE session_id = ?`,
        [end_time, id]
      );
    res.json({ message: "Økt avsluttet" });
  } catch (err) {
    console.error("Kunne ikke avslutte økt:", err);
    res.status(500).json({ error: "Server error", details: err });
  }
});

router.get("/sessions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db
      .promise()
      .query(
        `SELECT * FROM driver_sessions WHERE session_id = ?`,
        [id]
      );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Økt ikke funnet" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Kunne ikke hente økt:", err);
    res.status(500).json({ error: "Server error", details: err });
  }
});

router.post("/sessions/:id/location", authAdminMiddleWare, (req, res) => {
    const { id } = req.params;
    const { current_lat, current_lng } = req.body;
    const ts = new Date().toISOString().slice(0,19).replace("T"," ");
    db.query(
      `INSERT INTO driver_locations
         (session_id, latitude, longitude, logged_at)
       VALUES (?,?,?,?)`,
      [id, current_lat, current_lng, ts],
      err => err ? res.status(500).json(err) : res.sendStatus(204)
    );
  });

  export default router;
