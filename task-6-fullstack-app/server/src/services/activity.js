// Activity log ("who did what"), read with JOINs on the users table.
export function createActivityService(db) {
  return {
    async log({ actorId = null, userId = null, action, details = {} }) {
      await db.query(
        "INSERT INTO activity (actor_id, user_id, action, details) VALUES ($1, $2, $3, $4)",
        [actorId, userId, action, details]
      );
    },

    // forUser: only the entries about one user (their own history)
    async list({ limit = 20, forUser } = {}) {
      const params = [Math.min(Math.max(Number(limit) || 20, 1), 100)];
      let where = "";
      if (forUser) {
        params.push(forUser);
        where = "WHERE a.user_id = $2 OR a.actor_id = $2";
      }
      const { rows } = await db.query(
        `SELECT a.id, a.action, a.details, a.created_at,
                actor.name  AS actor_name,
                target.name AS target_name
         FROM activity a
         LEFT JOIN users actor  ON actor.id  = a.actor_id
         LEFT JOIN users target ON target.id = a.user_id
         ${where}
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT $1`,
        params
      );
      return rows.map((r) => ({
        id: Number(r.id),
        action: r.action,
        details: r.details,
        actorName: r.actor_name ?? r.details.actorName ?? null,
        targetName: r.target_name ?? r.details.name ?? null,
        createdAt: r.created_at.toISOString(),
      }));
    },
  };
}
