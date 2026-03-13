// middleware/adminMiddleware.js

/**
 * Middleware to allow only admins or optionally team leads
 * @param {boolean} allowTeamLead - if true, team leads are also allowed
 */
export const requireAdmin = (allowTeamLead = false) => {
  return (req, res, next) => {
    try {
      console.log("✅ requireAdmin hit");
      const user = req.session?.user;
      console.log("Session user:", user);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized: please login" });
      }

      if (user.role === "admin") {
        return next(); // admin always allowed
      }

      if (allowTeamLead && user.role === "team_lead") {
        return next(); // team lead allowed if option enabled
      }

      return res.status(403).json({ message: "Admin access only" });
    } catch (err) {
      console.error("requireAdmin error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};