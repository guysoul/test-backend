import { Router } from "express";
import db from "../config/db.js"; 

const router = Router();

router.get("/", (req, res) => {
  const sql = "SELECT page, section, content FROM site_content";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "feil ved henting" });
    res.json(results);
  });
});

router.put("/:page/:section", (req, res) => {
  const { page, section } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Innhold er påkrevd" });
  
  const sql = "UPDATE site_content SET content = ? WHERE page = ? AND section = ?";
  db.query(sql, [content, page, section], (err, result) => {
    if (err) return res.status(500).json({ error: "feil ved oppdatering" });
    res.json({ message: "Innhold oppdatert" });
  });
});

export default router;
