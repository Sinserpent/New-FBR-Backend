import jwt from "jsonwebtoken";

const userAuth = (req, res, next) => {

  const { token } = req.cookies;
  
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Please Login Or SignUp" });
  }
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "FBR-IVM",
    });
    
    req.userId = decodedToken.userId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
  }
};

export default userAuth;
