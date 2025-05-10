import express from "express";
import db from "../config/db.js";

const router = express.Router();

router.get("/prices", (req, res) => {
  const sql = "SELECT * FROM prices";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Feil ved henting av priser:", err);
      return res.status(500).json({ error: "Serverfeil" });
    }
    res.json(results);
  });
});

router.put("/prices/:price_id", (req, res) => {
  const { price_id } = req.params;
  const { price, destination } = req.body;

  if (price == null || !destination) {
    return res.status(400).json({ error: "Mangler price eller destination" });
  }

  const sql = ` UPDATE prices SET price = ?, destination = ? WHERE price_id = ?`;
  db.query(sql, [price, destination, price_id], (err, result) => {
    if (err) {
      console.error("Feil ved oppdatering av pris:", err);
      return res.status(500).json({ error: "Serverfeil" });
    }
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Fant ingen pris med den angitte price_id" });
    }
    res.json({ message: `Pris ${price_id} oppdatert` });
  });
});

router.post("/prices", (req, res) => {
  const { destination, price } = req.body;

  if (!destination || price == null) {
    return res.status(400).json({ error: "Mangler destination eller price" });
  }

  const sql = "INSERT INTO prices (destination, price) VALUES (?, ?)";
  db.query(sql, [destination, price], (err, result) => {
    if (err) {
      console.error("Feil ved lagring av ny pris:", err);
      return res.status(500).json({ error: "Serverfeil" });
    }
    res.status(201).json({ message: "Ny pris lagt til", price_id: result.insertId });
  });
});

export default router;
