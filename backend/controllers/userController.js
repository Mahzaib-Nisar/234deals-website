/**
 * User controller
 * - Implements REST actions using Sequelize models
 * - All handlers are async and forward errors to centralized error middleware
 */
const User = require('../models/userModel');

// POST /api/users/create
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const user = await User.create({ name, email, phone: phone || null, password });
    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
};

// GET /api/users
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({ order: [['id', 'ASC']] });
    return res.json({ success: true, data: users });
  } catch (err) {
    return next(err);
  }
};

// GET /api/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await user.destroy();
    return res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    return next(err);
  }
};

// GET /api/user/profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'phone', 'createdAt', 'updatedAt'],
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
};

// PUT /api/user/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (typeof name === 'string') user.name = name;
    if (typeof phone === 'string' || phone === null) user.phone = phone || null;
    await user.save();
    return res.json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (err) {
    return next(err);
  }
};
