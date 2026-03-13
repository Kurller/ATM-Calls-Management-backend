// middleware/authMiddleware.js

export const requireOtpVerified = (req, res, next) => {
  try {
    // Make sure session exists
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Unauthorized: please login" });
    }

    // Check if OTP was verified
    if (!req.session.user.otpVerified) {
      return res.status(403).json({ message: "OTP verification required" });
    }

    // Everything ok → continue
    next();
  } catch (err) {
    console.error("requireOtpVerified error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};