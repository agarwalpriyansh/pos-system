const User = require('../models/User');

const findById = async (id) => {
  return User.findById(id).select('-password');
};

const findByEmail = async (email) => {
  return User.findOne({ email });
};

const findByEmailOrGoogleId = async (email, googleId) => {
  return User.findOne({ $or: [{ email }, { googleId }] });
};

const findAllUsers = async () => {
  return User.find().select('-password').sort({ createdAt: -1 });
};

const save = async (userData) => {
  const user = new User(userData);
  return user.save();
};

module.exports = {
  findById,
  findByEmail,
  findByEmailOrGoogleId,
  findAllUsers,
  save
};
