// script.js

let currentQuizQuestions = [];
let questionIndex = 0;
let score = 0;
let timerInterval;
let startTime;
let correctQuestionsTracker = {}; // Stores correctly answered questions by unique ID

// HTML Element references
const selectElement = document.getElementById('quizDatabases');
const quizSelectorForm = document.getElementById('quizSelectorForm');
const quizContainer = document.getElementById('quizContainer');
const resultContainer = document.getElementById('resultContainer');
const timerDisplay = document.getElementById('timer');
const questionNumberDisplay = document.getElementById('questionNumber');
const questionTextDisplay = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const correctCountSpan = document.getElementById('correctCount');
const wrongCountSpan = document.getElementById('wrongCount');
const totalCountSpan = document.getElementById('totalCount');
const timeTakenSpan = document.getElementById('timeTaken');
const restartQuizBtn = document.getElementById('restartQuizBtn');
const resetLearningBtn = document.getElementById('resetLearningBtn');
const remainingQuestionsSpan = document.getElementById('remainingQuestions');

// --- Utility Functions ---

// Fetches and parses the quiz_databases.csv file
async function getQuizDatabaseList() {
    try {
        const response = await fetch('quiz_databases.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const databaseNames = text.split('\n')
                                  .map(name => name.trim())
                                  .filter(name => name !== '');
        return databaseNames;
    } catch (error) {
        console.error("Error fetching quiz_databases.csv:", error);
        alert("Could not load quiz database list. Please check quiz_databases.csv.");
        return [];
    }
}

// Fetches and parses a single question CSV file
async function fetchQuestions(csvFileName) {
    try {
        const response = await fetch(csvFileName);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const questions = lines.map(line => {
            const parts = line.split(',');
            if (parts.length < 6) {
                console.warn(`Skipping malformed line in ${csvFileName}: ${line}`);
                return null;
            }
            return {
                questionText: parts[0].trim(),
                options: [parts[1].trim(), parts[2].trim(), parts[3].trim(), parts[4].trim()],
                correctAnswer: parts[5].trim()
            };
        }).filter(q => q !== null); // Filter out any null entries from malformed lines
        return questions;
    } catch (error) {
        console.error(`Error fetching ${csvFileName}:`, error);
        alert(`Could not load questions from ${csvFileName}. Please check the file format.`);
        return [];
    }
}

// Loads all questions from the selected CSV databases
async function loadAllSelectedQuestions(selectedDatabases) {
    let allQuestions = [];
    for (const db of selectedDatabases) {
        const questions = await fetchQuestions(db);
        allQuestions = allQuestions.concat(questions);
    }
    return allQuestions;
}

// Shuffles an array randomly (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Starts the quiz timer
function startTimer() {
    clearInterval(timerInterval); // Clear any existing timer
    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        timerDisplay.textContent = `Time: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

// Stops the quiz timer
function stopTimer() {
    clearInterval(timerInterval);
}

// Loads the correctly answered questions tracker from localStorage
function loadCorrectQuestionsTracker() {
    const storedData = localStorage.getItem('correctlyAnsweredQuestions');
    if (storedData) {
        try {
            correctQuestionsTracker = JSON.parse(storedData);
        } catch (e) {
            console.error("Error parsing stored tracker, resetting:", e);
            correctQuestionsTracker = {}; // Reset if corrupted
            localStorage.removeItem('correctlyAnsweredQuestions');
        }
    } else {
        correctQuestionsTracker = {};
    }
}

// Saves the correctly answered questions tracker to localStorage
function saveCorrectQuestionsTracker() {
    localStorage.setItem('correctlyAnsweredQuestions', JSON.stringify(correctQuestionsTracker));
}

// Calculates and displays the count of questions remaining (not answered correctly)
async function displayRemainingQuestionsCount(selectedDatabases) {
    if (selectedDatabases.length === 0) {
        remainingQuestionsSpan.textContent = 'Select quizzes to see remaining questions.';
        return;
    }
    const allQuestionsInSelectedDBs = await loadAllSelectedQuestions(selectedDatabases);
    let correctlyAnsweredCount = 0;
    allQuestionsInSelectedDBs.forEach(q => {
        const questionId = `${q.questionText}-${q.correctAnswer}`; // Unique ID for question
        if (correctQuestionsTracker[questionId] === true) { // Explicitly check for true
            correctlyAnsweredCount++;
        }
    });

    const remainingCount = allQuestionsInSelectedDBs.length - correctlyAnsweredCount;
    remainingQuestionsSpan.textContent = `Questions remaining: ${remainingCount} out of ${allQuestionsInSelectedDBs.length}`;
}

// --- Quiz Logic Functions ---

// Displays the current question and its options
function displayQuestion() {
    if (questionIndex < currentQuizQuestions.length) {
        const question = currentQuizQuestions[questionIndex];
        questionNumberDisplay.textContent = `Question ${questionIndex + 1}/${currentQuizQuestions.length}`;
        questionTextDisplay.textContent = question.questionText;
        optionsContainer.innerHTML = ''; // Clear previous options

        const shuffledOptions = shuffleArray([...question.options]); // Shuffle a copy
        shuffledOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.classList.add('option-button');
            button.onclick = () => checkAnswer(option, question, button); // Pass button reference
            optionsContainer.appendChild(button);
        });

        nextQuestionBtn.style.display = 'none'; // Hide next button until answer is selected
        Array.from(optionsContainer.children).forEach(btn => btn.disabled = false); // Enable all option buttons
    } else {
        showResults();
    }
}

// Checks the selected answer against the correct answer
function checkAnswer(selectedOption, question, selectedButton) {
    // Disable all option buttons after selection
    Array.from(optionsContainer.children).forEach(btn => btn.disabled = true);

    const questionId = `${question.questionText}-${question.correctAnswer}`;

    if (selectedOption === question.correctAnswer) {
        score++;
        correctQuestionsTracker[questionId] = true; // Mark as correct
        selectedButton.style.backgroundColor = 'lightgreen';
        selectedButton.style.color = '#333'; // Adjust text color for visibility
    } else {
        correctQuestionsTracker[questionId] = false; // Mark as incorrect
        selectedButton.style.backgroundColor = 'lightcoral';
        selectedButton.style.color = '#333'; // Adjust text color for visibility
        // Highlight the correct answer
        const correctOptionButton = Array.from(optionsContainer.children).find(btn => btn.textContent === question.correctAnswer);
        if (correctOptionButton) {
            correctOptionButton.style.backgroundColor = 'lightgreen';
            correctOptionButton.style.color = '#333';
        }
    }
    saveCorrectQuestionsTracker(); // Persist the updated tracker

    nextQuestionBtn.style.display = 'block'; // Show next button
}

// Starts the quiz with selected databases
async function startQuiz(selectedDatabases) {
    const allQuestions = await loadAllSelectedQuestions(selectedDatabases);

    // Filter out questions previously answered correctly
    const unansweredQuestions = allQuestions.filter(q => {
        const questionId = `${q.questionText}-${q.correctAnswer}`;
        return correctQuestionsTracker[questionId] !== true; // Only include if NOT true
    });

    // Shuffle and select up to 10 questions
    const questionsToUse = unansweredQuestions.length >= 10
        ? shuffleArray(unansweredQuestions).slice(0, 10)
        : shuffleArray(unansweredQuestions);

    if (questionsToUse.length === 0) {
        alert("No new questions available in the selected databases! Try resetting your learning progress or selecting more quizzes.");
        resetQuiz(); // Go back to selector
        return;
    }

    currentQuizQuestions = questionsToUse;
    questionIndex = 0;
    score = 0;
    startTime = Date.now();
    startTimer();

    quizSelectorForm.style.display = 'none';
    quizContainer.style.display = 'block';
    resultContainer.style.display = 'none'; // Ensure results are hidden

    displayQuestion();
}

// Shows the quiz results
function showResults() {
    stopTimer();
    const endTime = Date.now();
    const totalTimeTaken = endTime - startTime;
    const minutes = Math.floor(totalTimeTaken / 60000);
    const seconds = Math.floor((totalTimeTaken % 60000) / 1000);

    quizContainer.style.display = 'none';
    resultContainer.style.display = 'block';

    correctCountSpan.textContent = score;
    wrongCountSpan.textContent = currentQuizQuestions.length - score;
    totalCountSpan.textContent = currentQuizQuestions.length;
    timeTakenSpan.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Update remaining questions count after quiz, based on currently selected databases
    const selectedDatabasesForDisplay = Array.from(selectElement.selectedOptions).map(option => option.value);
    displayRemainingQuestionsCount(selectedDatabasesForDisplay);
}

// Resets the quiz state and returns to the selector screen
function resetQuiz() {
    quizSelectorForm.style.display = 'block';
    quizContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    stopTimer(); // Clear any active timer

    // Update remaining questions count on selector page based on current selection
    const selectedDatabasesForDisplay = Array.from(selectElement.selectedOptions).map(option => option.value);
    displayRemainingQuestionsCount(selectedDatabasesForDisplay);
}

// --- Event Listeners and Initial Setup ---

// Event listener for the "Next Question" button
nextQuestionBtn.addEventListener('click', () => {
    questionIndex++;
    displayQuestion();
});

// Event listener for the "Start New Quiz" button in results
restartQuizBtn.addEventListener('click', () => {
    resetQuiz();
});

// Event listener for the "Reset Learning Progress" button in results
resetLearningBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to reset your learning progress? This cannot be undone.")) {
        localStorage.removeItem('correctlyAnsweredQuestions');
        correctQuestionsTracker = {}; // Clear in-memory tracker
        alert("Learning progress has been reset!");
        resetQuiz();
    }
});

// Initial setup when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    loadCorrectQuestionsTracker(); // Load tracker at start

    // Populate the quiz database selector
    const databaseNames = await getQuizDatabaseList();
    databaseNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name.replace('.csv', '').replace(/_/g, ' '); // Nicer display name
        selectElement.appendChild(option);
    });

    // Handle form submission to start the quiz
    quizSelectorForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const selectedOptions = Array.from(selectElement.selectedOptions);
        const selectedDatabases = selectedOptions.map(option => option.value);

        if (selectedDatabases.length > 0) {
            startQuiz(selectedDatabases);
        } else {
            alert('Please select at least one quiz database.');
        }
    });

    // Update remaining questions count when selection changes
    selectElement.addEventListener('change', () => {
        const selectedDatabases = Array.from(selectElement.selectedOptions).map(option => option.value);
        if (selectedDatabases.length > 0) {
             displayRemainingQuestionsCount(selectedDatabases);
        } else {
            remainingQuestionsSpan.textContent = 'Select quizzes to see remaining questions.';
        }
    });

    // Initial display of remaining questions based on no selection (or default)
    remainingQuestionsSpan.textContent = 'Select quizzes to see remaining questions.';
});
