'use strict';

function toLegacyQuizQuestion(question) {
  if (question.type === 'tf') {
    return {
      ...question,
      q: question.question,
      options: ['Adevărat', 'Fals'],
      correct: question.correct ? 0 : 1,
    };
  }

  return {
    ...question,
    q: question.question,
  };
}

function chatResponse(content) {
  return {
    content,
    response: content,
  };
}

function quizResponse(questions) {
  return {
    questions: questions.map(toLegacyQuizQuestion),
  };
}

function flashcardsResponse(flashcards) {
  return {
    flashcards,
    cards: flashcards,
  };
}

function examResponse(questions, minutes) {
  return {
    questions,
    minutes,
  };
}

function summaryResponse(summary) {
  return { summary };
}

function uploadResponse({ text, filename, size }) {
  return {
    text,
    filename,
    size,
    chars: text.length,
    extractedChars: text.length,
  };
}

module.exports = {
  chatResponse,
  quizResponse,
  flashcardsResponse,
  examResponse,
  summaryResponse,
  uploadResponse,
};
