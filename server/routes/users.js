import express from "express";
const router = express.Router();

export default function usersRoute(db) {
  router.get("/users", async (req, res) => {
    const { exclude } = req.query;
    try {
      const query = exclude
        ? `
          SELECT 
            u.id, 
            u.fname, 
            u.profile_picture_url,
            (
              SELECT m.message
              FROM messages m
              WHERE 
                (m.sender_id = u.id AND m.recipient_id = $1)
                OR (m.sender_id = $1 AND m.recipient_id = u.id)
              ORDER BY m.timestamp DESC
              LIMIT 1
            ) AS last_message
          FROM users u
          WHERE u.id != $1
        `
        : `
          SELECT 
            u.id, 
            u.fname, 
            u.profile_picture_url,
            NULL AS last_message
          FROM users u
        `;
      const values = exclude ? [exclude] : [];
      const { rows } = await db.query(query, values);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
