import { Router } from "express";
import db from "../config/db.js";
import authAdminMiddleWare from "../authMidWareAdmin.js";

const router = Router();

router.get("/orders-stats", (req, res) => {
  const sql = `
    SELECT 
      DATE_FORMAT(start_time, '%Y-%m') AS month, 
      COUNT(*) AS orderCount
    FROM driver_route
    WHERE start_time >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY month
    ORDER BY month;
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error i fetching:", err);
      return res.status(500).json({ error: "Kunne ikke hente data" });
    }
    res.json(results);
  });
});

router.get("/sessions-worked", authAdminMiddleWare, (req, res) => {
  const sql = `
    SELECT
      ds.driver_id,
      CONCAT(d.first_name,' ',d.last_name) AS driver_name,
      YEAR(ds.start_time)  AS year,
      MONTH(ds.start_time) AS month,
      FLOOR(SUM(TIMESTAMPDIFF(MINUTE, ds.start_time, IFNULL(ds.end_time,NOW()))) / 60)   AS hours,
      MOD(SUM(TIMESTAMPDIFF(MINUTE, ds.start_time, IFNULL(ds.end_time,NOW()))), 60)       AS minutes
    FROM driver_sessions ds
    JOIN driver d ON ds.driver_id = d.driver_id
    GROUP BY ds.driver_id, year, month
    ORDER BY year DESC, month DESC;
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "DB error", details: err });
    res.json(results);
  });
});

router.get("/my-sessions-worked", authAdminMiddleWare, (req, res) => {
  const driverId = req.admin.id;
  const sql = `
      SELECT
        YEAR(start_time)  AS year,
        MONTH(start_time) AS month,
        FLOOR(SUM(TIMESTAMPDIFF(
          MINUTE,
          ds.start_time,
          IFNULL(ds.end_time, NOW())
        )) / 60) AS hours,
        MOD(SUM(TIMESTAMPDIFF(
          MINUTE,
          ds.start_time,
          IFNULL(ds.end_time, NOW())
        )), 60) AS minutes
      FROM driver_sessions ds
      WHERE ds.driver_id = ?
      GROUP BY year, month
      ORDER BY year DESC, month DESC;
    `;
  db.query(sql, [driverId], (err, rows) => {
    if (err) {
      console.error("Error fetching my work stats:", err);
      return res.status(500).json({ error: "DB error", details: err });
    }
    res.json(rows);
  });
});

router.get(
  "/my-sessions/:year/:month",
  authAdminMiddleWare,
  (req, res) => {
    const driverId = req.admin.id;
    const { year, month } = req.params;

    const sql = `
      SELECT
        session_id,
        start_time,
        end_time,
        FLOOR(TIMESTAMPDIFF(MINUTE, start_time, IFNULL(end_time, NOW()))/60) AS hours,
        MOD(TIMESTAMPDIFF(MINUTE, start_time, IFNULL(end_time, NOW())), 60) AS minutes
      FROM driver_sessions
      WHERE driver_id = ?
        AND YEAR(start_time) = ?
        AND MONTH(start_time) = ?
      ORDER BY start_time ASC
    `;

    db.query(sql, [driverId, year, month], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error", details: err });
      }
      res.json(results);
    });
  }
);
router.get(
  "/driver/:driver_id/sessions/:year/:month",
  authAdminMiddleWare,
  async (req, res) => {
    const { driver_id, year, month } = req.params;
    const sql = `
      SELECT
        session_id,
        start_time,
        end_time,
        FLOOR(TIMESTAMPDIFF(MINUTE, start_time, IFNULL(end_time, NOW()))/60) AS hours,
        MOD(TIMESTAMPDIFF(MINUTE, start_time, IFNULL(end_time, NOW())),60)    AS minutes
      FROM driver_sessions
      WHERE driver_id=? AND YEAR(start_time)=? AND MONTH(start_time)=?
      ORDER BY start_time DESC;
    `;
    try {
      const [rows] = await db.promise().query(sql, [
        driver_id,
        year,
        month,
      ]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err });
    }
  }
  )


export default router;
