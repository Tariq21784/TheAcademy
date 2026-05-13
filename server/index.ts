import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createLearningPlan, buildQuizItems, evaluateAnswer } from './academy.js';
import type { AnswerResult, DocumentPlan, QuizItem, SessionState } from './types.js';

const upload = multer({ storage: multer.memoryStorage() });
const app = express();
app.use(cors());
app.use(express.json());

let sessionState: SessionState = {
  plan: null,
  progress: {},
  completed: [],
};

const quizStore = new Map<string, QuizItem>();

app.post('/api/upload', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document uploaded.' });
  }

  const content = req.file.buffer.toString('utf8');
  const plan = createLearningPlan(content, req.file.originalname || 'Uploaded doc');

  sessionState = {
    plan,
    progress: {},
    completed: [],
  };
  quizStore.clear();

  return res.json({ plan });
});

app.get('/api/quiz', (req, res) => {
  const sectionId = String(req.query.sectionId || '');
  if (!sessionState.plan) {
    return res.status(400).json({ error: 'No learning plan available.' });
  }

  const section = sessionState.plan.sections.find((item) => item.id === sectionId);
  if (!section) {
    return res.status(404).json({ error: 'Section not found.' });
  }

  const items = buildQuizItems(section);
  items.forEach((item) => quizStore.set(item.id, item));
  return res.json({ items });
});

app.post('/api/answer', (req, res) => {
  const { itemId, response } = req.body as { itemId: string; response: string };

  if (!quizStore.has(itemId)) {
    return res.status(404).json({ error: 'Quiz item not found.' });
  }

  const item = quizStore.get(itemId)!;
  const result: AnswerResult = evaluateAnswer(response, item);

  if (result.correct && sessionState.plan) {
    const progress = sessionState.progress[item.sectionId] || 0;
    sessionState.progress[item.sectionId] = Math.min(100, progress + 34);
    if (!sessionState.completed.includes(item.sectionId)) {
      sessionState.completed.push(item.sectionId);
    }
  }

  return res.json(result);
});

app.get('/api/progress', (_, res) => {
  return res.json(sessionState);
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
