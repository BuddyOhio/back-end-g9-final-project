import jwt from "jsonwebtoken";

export const authorization = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    console.log("authorization middleware: unknown token");
    return res.sendStatus(401);
  }
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.userId = data.id;
    return next();
  } catch (e) {
    console.log("authorization middleware: invalid user", e);
    return res.sendStatus(401);
  }
};
