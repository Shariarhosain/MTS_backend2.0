const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  if (!req.headers.authorization)
    return res.status(404).send({ message: 'Forbidden access' });

  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (error, decoded) => {
    if (error) return res.status(404).send({ message: 'Forbidden access' });
    req.decoded = decoded;
    next();
  });
};
