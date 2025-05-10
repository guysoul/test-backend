import { Router } from "express";
import db from "../config/db.js";

const router = Router();

//List of all customers
router.get("/customers", (req, res) => {
  const driverSql = "SELECT * FROM customer where inactivated_date is NULL";

  db.query(driverSql, (err, results) => {
    if (err) {
      res.status(500).json({ error: "Unable to fetch the customer list!" });
      return;
    }
    res.json(results);
  });
});

//Updating customer status
router.put("/customers/:customerId", async (req, res) => {
  const custID = req.params.customerId;
  const deactivateCustomerSql =
    "UPDATE customer SET inactivated_date = now() where customer_id = ?";

  try {
    const [result] = await db.promise().query(deactivateCustomerSql, [custID]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Customer not found!" });
    }

    res.status(200).json({ message: "Customer Deactivated!" });
  } catch (error) {
    console.error("Error when deactivating the customer", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
});

export default router;
