import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.entry';
import { AnswerResult, buildQuizItems, createLearningPlan, evaluateAnswer, QuizItem, Section } from './academy';

type LessonPlan = {
  documentId: string;
  title: string;
  sections: Section[];
  schedule: number[];
  createdAt: string;
};

type ProgressState = {
  mastery: Record<string, number>;
  completed: string[];
};

const scienceCards = [
  {
    title: 'Direct Instruction',
    description:
      'Clear explanations and worked examples anchor new concepts before practice begins.',
  },
  {
    title: 'Spaced Retrieval',
    description:
      'Review ideas at expanding intervals to move knowledge from short-term recall into long-term mastery.',
  },
  {
    title: 'Mastery Learning',
    description:
      'Students move forward only after demonstrating strong understanding of each building block.',
  },
  {
    title: 'Bloom 2 Sigma',
    description:
      'High-quality feedback and personalized pacing replicate the effects of one-to-one tutoring.',
  },
];

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker as unknown as string;

function extractTextFromXml(xmlString: string) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, 'application/xml');
  const nodes = Array.from(xml.querySelectorAll('w\\:t, t, a\\:t'));
  return nodes.map((node) => node.textContent?.trim() || '').filter(Boolean).join(' ');
}

async function parsePdf(file: File) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => (item.str ? item.str : ''))
      .join(' ');
    pages.push(pageText);
  }

  return pages.join('\n\n');
}

async function parseDocx(file: File) {
  const data = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(data);
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) return '';
  const xml = await documentFile.async('string');
  return extractTextFromXml(xml);
}

async function parsePptx(file: File) {
  const data = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(data);
  const slides = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();

  const slideText = await Promise.all(
    slides.map(async (slidePath) => {
      const slideFile = zip.file(slidePath);
      if (!slideFile) return '';
      const xml = await slideFile.async('string');
      return extractTextFromXml(xml);
    })
  );

  return slideText.join('\n\n');
}

async function parseFileContent(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'pdf') {
    return parsePdf(file);
  }

  if (extension === 'docx') {
    return parseDocx(file);
  }

  if (extension === 'pptx') {
    return parsePptx(file);
  }

  return file.text();
}

function App() {
  const [uploading, setUploading] = useState(false);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [progress, setProgress] = useState<ProgressState>({ mastery: {}, completed: [] });
  const [message, setMessage] = useState('Upload a document to create your adaptive learning path.');

  const nextSection = useMemo(() => {
    if (!plan) return null;
    return plan.sections.find((section) => !progress.completed.includes(section.id)) || plan.sections[0];
  }, [plan, progress.completed]);

  useEffect(() => {
    if (!plan || quizItems.length) return;
    if (plan.sections.length > 0) {
      setSelectedSection(plan.sections[0]);
    }
  }, [plan, quizItems]);

  const handleUploadFiles = async (files: File[]) => {
    setUploading(true);
    setMessage('Creating your adaptive learning plan...');

    try {
      const fileContents = await Promise.all(
        files.map(async (file) => {
          const content = await parseFileContent(file);
          return `# ${file.name}\n\n${content}`;
        })
      );

      const combined = fileContents.join('\n\n');
      const learningPlan = createLearningPlan(combined, files.length > 1 ? `${files.length} files` : files[0].name);

      setPlan(learningPlan);
      setProgress({ mastery: {}, completed: [] });
      setQuizItems([]);
      setActiveQuizIndex(0);
      setAnswerText('');
      setAnswerResult(null);
      setMessage('Your learning plan is ready. Start with the first section or practice now.');
    } catch (error) {
      setMessage('Failed to parse one of the files. Please try again or use a supported format.');
    } finally {
      setUploading(false);
    }
  };

  const startQuiz = () => {
    if (!selectedSection) return;
    setMessage('Generating practice retrieval items...');
    const items = buildQuizItems(selectedSection);
    setQuizItems(items);
    setActiveQuizIndex(0);
    setAnswerResult(null);
    setMessage('Practice loaded. Answer the prompt and build mastery.');
  };

  const submitAnswer = () => {
    if (!quizItems[activeQuizIndex]) return;
    const result = evaluateAnswer(answerText, quizItems[activeQuizIndex]);
    setAnswerResult(result);

    if (result.correct && selectedSection) {
      setProgress((prev) => ({
        mastery: { ...prev.mastery, [selectedSection.id]: Math.min(100, (prev.mastery[selectedSection.id] || 0) + 34) },
        completed: prev.completed.includes(selectedSection.id) ? prev.completed : [...prev.completed, selectedSection.id],
      }));
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <span className="eyebrow">TheAcademy</span>
          <h1>Adaptive learning built for real mastery.</h1>
          <p>Upload any document and train with structured lessons, spaced retrieval, and mastery feedback.</p>
        </div>
      </header>

      <main>
        <section className="upload-panel card">
          <h2>Upload one or more documents</h2>
          <p>Supported files: .txt, .md, .pdf, .docx, .pptx. Upload multiple files and the system combines them into a single adaptive plan.</p>
          <label className="upload-box">
            <input
              type="file"
              accept=".txt,.md,.pdf,.docx,.pptx"
              multiple
              disabled={uploading}
              onChange={(event) => event.target.files?.length && handleUploadFiles(Array.from(event.target.files))}
            />
            <span>{uploading ? 'Loading...' : 'Choose files'}</span>
          </label>
          <p className="status-message">{message}</p>
        </section>

        {plan && (
          <section className="dashboard-grid">
            <div className="card">
              <h3>Lesson path</h3>
              <p>{plan.title}</p>
              <ul>
                {plan.sections.map((section) => (
                  <li key={section.id} className={progress.completed.includes(section.id) ? 'done' : ''}>
                    <button type="button" onClick={() => setSelectedSection(section)}>
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
              <button className="button secondary" type="button" onClick={startQuiz}>
                Practice current section
              </button>
            </div>

            <div className="card">
              <h3>Focus section</h3>
              {selectedSection ? (
                <>
                  <h4>{selectedSection.title}</h4>
                  <p>{selectedSection.body}</p>
                  <div className="section-meta">
                    <strong>Key ideas:</strong> {selectedSection.keywords.join(', ')}
                  </div>
                </>
              ) : (
                <p>Select a section to study.</p>
              )}
            </div>

            <div className="card stats-card">
              <h3>Progress</h3>
              <p>Sections completed: {progress.completed.length}/{plan.sections.length}</p>
              <div className="progress-list">
                {plan.sections.map((section) => (
                  <div key={section.id} className="progress-item">
                    <span>{section.title}</span>
                    <strong>{progress.mastery[section.id] || 0}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {quizItems.length > 0 && (
          <section className="card quiz-panel">
            <h2>Practice quiz</h2>
            <div className="quiz-item">
              <div className="badge">{quizItems[activeQuizIndex]?.type}</div>
              <p>{quizItems[activeQuizIndex]?.prompt}</p>
            </div>

            <textarea
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              placeholder="Type your answer here"
              rows={5}
            />
            <div className="quiz-actions">
              <button className="button" type="button" onClick={submitAnswer}>
                Submit answer
              </button>
              {activeQuizIndex < quizItems.length - 1 && (
                <button className="button secondary" type="button" onClick={() => setActiveQuizIndex((idx) => idx + 1)}>
                  Next prompt
                </button>
              )}
            </div>
            {answerResult && (
              <div className={`result-box ${answerResult.correct ? 'correct' : 'incorrect'}`}>
                <p>{answerResult.feedback}</p>
              </div>
            )}
          </section>
        )}

        <section className="science-grid">
          {scienceCards.map((card) => (
            <article key={card.title} className="card science-card">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;
