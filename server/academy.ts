import { v4 as uuid } from 'uuid';
import type { DocumentPlan, QuizItem, Section } from './types.js';

const STOP_WORDS = new Set([
  'the','and','or','for','with','a','an','of','to','in','on','at','by','from','as','is','are','that','this','it','its','be','was','were','has','have','had','but','not','which','what','when','where','who','why','how','can','will','should','could'
]);

function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, ' ');
}

function buildKeywords(text: string) {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token));

  const counts = tokens.reduce<Record<string, number>>((acc, token) => {
    acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function splitIntoSections(text: string) {
  const lines = text.split(/\r?\n/);
  const sections: Section[] = [];
  let currentTitle = 'Introduction';
  let currentBody: string[] = [];

  const flushSection = () => {
    if (currentBody.length === 0) return;
    const body = normalizeText(currentBody.join(' '));
    sections.push({
      id: uuid(),
      title: currentTitle,
      body,
      keywords: buildKeywords(body),
    });
    currentBody = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^\s{0,3}#{1,3}\s+(.*)$/);
    if (headingMatch) {
      flushSection();
      currentTitle = headingMatch[1].trim() || 'Untitled section';
      continue;
    }

    if (line.trim() === '') {
      if (currentBody.length > 0) {
        currentBody.push('');
      }
      continue;
    }

    currentBody.push(line.trim());
  }

  flushSection();

  if (sections.length === 0) {
    const body = normalizeText(text);
    sections.push({ id: uuid(), title: 'Study unit', body, keywords: buildKeywords(body) });
  }

  return sections;
}

export function createLearningPlan(content: string, filename: string): DocumentPlan {
  const cleaned = normalizeText(content);
  const sections = splitIntoSections(cleaned).slice(0, 10);
  const schedule = [0, 1, 3, 7, 14];

  return {
    documentId: uuid(),
    title: filename.replace(/\.[^/.]+$/, '') || 'Uploaded document',
    sections,
    schedule,
    createdAt: new Date().toISOString(),
  };
}

export function buildQuizItems(section: Section): QuizItem[] {
  const key = section.keywords[0] || section.title.split(' ').slice(0, 3).join(' ');
  return [
    {
      id: uuid(),
      sectionId: section.id,
      prompt: `Summarize the main idea from this section in one sentence.`,
      type: 'Recall',
      answerKey: key,
    },
    {
      id: uuid(),
      sectionId: section.id,
      prompt: `Describe how this concept could be used in a real situation.`,
      type: 'Apply',
      answerKey: key,
    },
    {
      id: uuid(),
      sectionId: section.id,
      prompt: `Why is this idea important for overall understanding?`,
      type: 'Reflect',
      answerKey: key,
    },
  ];
}

export function evaluateAnswer(answer: string, quizItem: QuizItem) {
  const clean = answer.toLowerCase().trim();
  const key = quizItem.answerKey.toLowerCase();
  const includesKey = clean.includes(key);
  const enoughLength = clean.length > 30;

  if (includesKey && enoughLength) {
    return {
      correct: true,
      feedback: 'Nice work! Your answer connects to the core idea and shows thoughtful retrieval.',
    };
  }

  if (includesKey) {
    return {
      correct: false,
      feedback: 'You included the main idea, but try expanding your response with a concrete example or explanation.',
    };
  }

  return {
    correct: false,
    feedback: 'Try recalling the key concept again and connect it to the section’s main idea.',
  };
}
