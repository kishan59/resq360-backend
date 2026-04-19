export const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in environment variables.');
  }

  return process.env.JWT_SECRET;
};
