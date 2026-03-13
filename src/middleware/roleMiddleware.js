// middlewares/roleMiddleware.js
export const requireRole = (roles = []) => {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
};