import jwt from "jsonwebtoken";

export const authorization = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    console.log("authorization middleware: unknown token");
    return res.sendStatus(401);
  }
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.data_token = { userId: data.id, username: data.email };
    return next();
  } catch (error) {
    console.log("authorization middleware: invalid user", error);
    return res.sendStatus(401);
  }
};
