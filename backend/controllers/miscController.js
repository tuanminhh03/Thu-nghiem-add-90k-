import PageView from '../models/PageView.js';

export async function recordVisit(req, res) {
  try {
    await PageView.create({ path: req.body?.path || '/' });
    res.json({ message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}
