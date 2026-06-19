import { useEffect, useMemo, useRef, useState } from "react";
import { safetyLabData } from "./safetyLabData.js";

const quizzes = safetyLabData.quizzes;
const totalQuestions = quizzes.reduce((total, quiz) => total + quiz.questions.length, 0);

export default function TrainingQuizApp({ routePath, navigateTo }) {
  const routeQuizId = routePath.startsWith("/training-quiz/")
    ? routePath.replace("/training-quiz/", "")
    : "";
  const initialQuiz = quizById(routeQuizId) || quizzes[0];
  const [query, setQuery] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState(initialQuiz?.id || "");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const topicSearchRef = useRef(null);

  const selectedQuiz = quizById(selectedQuizId) || quizzes[0];
  const currentQuestion = selectedQuiz.questions[currentIndex];
  const selectedAnswer = answers[currentQuestion.number] || "";
  const answeredCount = Object.keys(answers).length;
  const score = selectedQuiz.questions.filter(
    (question) => answers[question.number] === question.answer,
  ).length;
  const complete = answeredCount === selectedQuiz.questions.length;
  const missedQuestions = selectedQuiz.questions.filter(
    (question) => answers[question.number] && answers[question.number] !== question.answer,
  );

  const filteredQuizzes = useMemo(() => {
    const normalizedQuery = normalize(query);
    return quizzes.filter((quiz) =>
      normalize([quiz.title, quiz.reviewFlag, quiz.sourceReviewNote.join(" ")].join(" ")).includes(
        normalizedQuery,
      ),
    );
  }, [query]);

  useEffect(() => {
    document.title = "Training Quiz";
  }, []);

  useEffect(() => {
    const routedQuiz = quizById(routeQuizId);
    if (routedQuiz && routedQuiz.id !== selectedQuizId) {
      setSelectedQuizId(routedQuiz.id);
      resetProgress();
    }
  }, [routeQuizId, selectedQuizId]);

  const chooseQuiz = (quizId) => {
    setSelectedQuizId(quizId);
    resetProgress();
    navigateTo(`/training-quiz/${quizId}`);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const selectAnswer = (letter) => {
    setAnswers((current) => ({
      ...current,
      [currentQuestion.number]: letter,
    }));
  };

  const resetProgress = () => {
    setCurrentIndex(0);
    setAnswers({});
  };

  const focusTopicPicker = () => {
    topicSearchRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="quiz-root">
      <header className="quiz-hero">
        <div>
          <p className="quiz-kicker">Practice only</p>
          <h1>Training Pop Flash Quiz</h1>
          <p>
            Fast construction safety refreshers from the draft quiz library. Not
            proof of training, certification, or competency.
          </p>
        </div>
        <div className="quiz-stats" aria-label="Quiz library stats">
          <div>
            <strong>{quizzes.length}</strong>
            <span>quizzes</span>
          </div>
          <div>
            <strong>{totalQuestions}</strong>
            <span>questions</span>
          </div>
        </div>
      </header>

      <main className="quiz-main">
        <aside className="quiz-sidebar">
          <label className="quiz-search">
            <span>Find a topic</span>
            <input
              ref={topicSearchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search fall, silica, mobile..."
            />
          </label>

          <div className="quiz-topic-list" aria-label="Quiz topics">
            {filteredQuizzes.map((quiz) => (
              <button
                className={quiz.id === selectedQuiz.id ? "active" : ""}
                type="button"
                key={quiz.id}
                onClick={() => chooseQuiz(quiz.id)}
              >
                <strong>{cleanQuizTitle(quiz.title)}</strong>
                <span>{quiz.questions.length} questions</span>
              </button>
            ))}
            {!filteredQuizzes.length ? <p>No matching quizzes.</p> : null}
          </div>
        </aside>

        <section className="quiz-workspace">
          <div className="quiz-notice">
            Practice tool only. Not proof of training or competency. Content needs
            human safety/source review before official use.
          </div>

          <article className="quiz-card">
            <div className="quiz-card-header">
              <div>
                <p>{selectedQuiz.reviewFlag}</p>
                <h2>{cleanQuizTitle(selectedQuiz.title)}</h2>
              </div>
              <button type="button" onClick={resetProgress}>
                Restart quiz
              </button>
            </div>

            <div className="quiz-progress-row">
              <span>
                Question {currentIndex + 1} of {selectedQuiz.questions.length}
              </span>
              <span>
                Score {score}/{answeredCount || 0}
              </span>
            </div>
            <progress value={currentIndex + 1} max={selectedQuiz.questions.length} />

            <section className="quiz-question">
              <h3>{currentQuestion.prompt}</h3>
              <div className="quiz-choice-grid">
                {currentQuestion.choices.map((choice) => {
                  const hasAnswered = Boolean(selectedAnswer);
                  const isSelected = selectedAnswer === choice.letter;
                  const isCorrect = hasAnswered && choice.letter === currentQuestion.answer;
                  const isWrong = isSelected && choice.letter !== currentQuestion.answer;
                  return (
                    <button
                      className={[
                        isSelected ? "selected" : "",
                        isCorrect ? "correct" : "",
                        isWrong ? "wrong" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      type="button"
                      key={choice.letter}
                      onClick={() => selectAnswer(choice.letter)}
                    >
                      <b>{choice.letter}.</b>
                      <span>{choice.text}</span>
                    </button>
                  );
                })}
              </div>

              {selectedAnswer ? (
                <div className="quiz-explanation">
                  <strong>
                    {selectedAnswer === currentQuestion.answer
                      ? "Correct"
                      : `Correct answer: ${currentQuestion.answer}`}
                  </strong>
                  <p>{currentQuestion.explanation}</p>
                </div>
              ) : null}
            </section>

            <div className="quiz-actions">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentIndex === selectedQuiz.questions.length - 1}
                onClick={() =>
                  setCurrentIndex((index) =>
                    Math.min(selectedQuiz.questions.length - 1, index + 1),
                  )
                }
              >
                Next
              </button>
              <button type="button" onClick={() => window.print()}>
                Print study summary
              </button>
            </div>
          </article>

          {complete ? (
            <QuizSummary
              quiz={selectedQuiz}
              score={score}
              missedQuestions={missedQuestions}
              answers={answers}
              resetProgress={resetProgress}
              focusTopicPicker={focusTopicPicker}
            />
          ) : null}

          <section className="quiz-review-note">
            <h3>Sources / review needed</h3>
            <ul>
              {selectedQuiz.sourceReviewNote.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </section>
      </main>
    </div>
  );
}

function QuizSummary({ quiz, score, missedQuestions, answers, resetProgress, focusTopicPicker }) {
  const passed = score >= 8;
  return (
    <article className="quiz-summary">
      <div className="quiz-summary-score">
        <strong>
          {score}/{quiz.questions.length}
        </strong>
        <span>{passed ? "Suggested threshold met" : "Review recommended"}</span>
      </div>
      <div>
        <h2>Quiz complete</h2>
        <p>
          Suggested threshold: {quiz.passThreshold}. This result is practice-only
          and is not saved as training evidence.
        </p>
      </div>
      <button type="button" onClick={resetProgress}>
        Restart same quiz
      </button>
      <button type="button" onClick={focusTopicPicker}>
        Choose another topic
      </button>

      <section>
        <h3>Missed-question review</h3>
        {missedQuestions.length ? (
          <div className="quiz-missed-list">
            {missedQuestions.map((question) => (
              <div className="quiz-missed-item" key={question.number}>
                <strong>{question.prompt}</strong>
                <span>
                  Your answer: {answers[question.number]} | Correct answer: {question.answer}
                </span>
                <p>{question.explanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No missed questions.</p>
        )}
      </section>
    </article>
  );
}

function quizById(id) {
  return quizzes.find((quiz) => quiz.id === id);
}

function cleanQuizTitle(title) {
  return title.replace(/ Quiz$/, "");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}
