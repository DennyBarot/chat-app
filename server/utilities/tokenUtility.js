import jwt from 'jsonwebtoken';

export const sendToken = (res, user, statusCode, message) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined.');
  }
  if (!process.env.COOKIE_EXPIRES) {
    throw new Error('COOKIE_EXPIRES environment variable is not defined.');
  }

  const tokenData = {
    _id: user?._id,
  };

  const token = jwt.sign(tokenData, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });

  res.status(statusCode)
    .cookie("token", token, {
      expires: new Date(Date.now() + process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "None",
    })
    .json({
      success: true,
      message,
      responseData: {
        user,
        token,
      },
    });
};