export const requireOtpVerified = (req, res, next) => {
  // 🔥 allow Swagger testing
  if (req.headers["x-swagger-test"] === "true") {
    req.session = {
      user: { id: "test", role: "admin", otpVerified: true },
    };
    return next();
  }

  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Unauthorized: please login" });
  }

  if (!req.session.user.otpVerified) {
    return res.status(403).json({ message: "OTP verification required" });
  }

  next();
};