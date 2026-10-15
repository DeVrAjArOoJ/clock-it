import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Task } from './models.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.warn('WARNING: JWT_SECRET is missing. Set it in backend/.env before use.');
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '30kb' }));
app.use(morgan('dev'));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));

const safeUser = user => ({ id: user._id, name: user.name, email: user.email });
const signToken = user => jwt.sign({ sub: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ message: 'Please log in to continue.' });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub).select('_id name email');
    if (!user) return res.status(401).json({ message: 'Account not found.' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ message: 'Your session is invalid or expired. Please log in again.' }); }
};

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Clock It API' }));
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2) return res.status(400).json({ message: 'Name must be at least 2 characters.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: signToken(user), user: safeUser(user) });
  } catch (error) { next(error); }
});
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    res.json({ token: signToken(user), user: safeUser(user) });
  } catch (error) { next(error); }
});
app.get('/api/auth/me', auth, (req, res) => res.json({ user: safeUser(req.user) }));

const validTaskInput = body => {
  const fields = {};
  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title || title.length > 140) throw new Error('Task title is required and must be 140 characters or fewer.');
    fields.title = title;
  }
  if (body.description !== undefined) fields.description = String(body.description).trim().slice(0, 2000);
  if (body.status !== undefined) {
    if (!['todo', 'in-progress', 'completed'].includes(body.status)) throw new Error('Choose a valid task status.');
    fields.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!['low', 'medium', 'high'].includes(body.priority)) throw new Error('Choose a valid priority.');
    fields.priority = body.priority;
  }
  if (body.dueDate !== undefined) {
    if (!body.dueDate) fields.dueDate = null;
    else { const date = new Date(body.dueDate); if (Number.isNaN(date.getTime())) throw new Error('Enter a valid due date.'); fields.dueDate = date; }
  }
  return fields;
};
app.get('/api/tasks', auth, async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    if (['todo', 'in-progress', 'completed'].includes(req.query.status)) filter.status = req.query.status;
    const search = String(req.query.search || '').trim().slice(0, 100);
    if (search) filter.$or = [{ title: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { description: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }];
    res.json({ tasks: await Task.find(filter).sort({ createdAt: -1 }).lean() });
  } catch (error) { next(error); }
});
app.post('/api/tasks', auth, async (req, res, next) => {
  try { const fields = validTaskInput(req.body); if (!fields.title) return res.status(400).json({ message: 'Task title is required.' }); res.status(201).json({ task: await Task.create({ ...fields, user: req.user._id }) }); }
  catch (error) { if (error.message.startsWith('Task ') || error.message.startsWith('Choose') || error.message.startsWith('Enter')) return res.status(400).json({ message: error.message }); next(error); }
});
app.get('/api/tasks/:id', auth, async (req, res, next) => {
  try { const task = await Task.findOne({ _id: req.params.id, user: req.user._id }); if (!task) return res.status(404).json({ message: 'Task not found.' }); res.json({ task }); }
  catch (error) { if (error.name === 'CastError') return res.status(404).json({ message: 'Task not found.' }); next(error); }
});
app.patch('/api/tasks/:id', auth, async (req, res, next) => {
  try { const fields = validTaskInput(req.body); const task = await Task.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: fields }, { new: true, runValidators: true }); if (!task) return res.status(404).json({ message: 'Task not found.' }); res.json({ task }); }
  catch (error) { if (error.name === 'CastError') return res.status(404).json({ message: 'Task not found.' }); if (error.message.startsWith('Task ') || error.message.startsWith('Choose') || error.message.startsWith('Enter')) return res.status(400).json({ message: error.message }); next(error); }
});
app.delete('/api/tasks/:id', auth, async (req, res, next) => {
  try { const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id }); if (!task) return res.status(404).json({ message: 'Task not found.' }); res.json({ message: 'Task deleted.' }); }
  catch (error) { if (error.name === 'CastError') return res.status(404).json({ message: 'Task not found.' }); next(error); }
});
app.use((err, _req, res, _next) => { console.error(err); if (err.code === 11000) return res.status(409).json({ message: 'That value is already in use.' }); res.status(500).json({ message: 'Something went wrong. Please try again.' }); });

try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clock-it');
  app.listen(PORT, () => console.log(`Clock It API running at http://localhost:${PORT}`));
} catch (error) { console.error('Could not connect to MongoDB:', error.message); process.exit(1); }
