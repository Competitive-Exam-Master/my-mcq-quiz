// script.js

let currentQuizQuestions = [];
let questionIndex = 0;
let score = 0;
let timerInterval;
let startTime;
let correctQuestionsTracker = {}; // Stores correctly answered questions by unique ID

// HTML Element references (for existing quiz components)
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

// NEW HTML Element references (for data management features)
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataFile = document.getElementById('importDataFile');
const importDataBtn = document.getElementById('importDataBtn');
const clearLoadedFileBtn = document.getElementById('clearLoadedFileBtn');
const dataManagementSection = document.querySelector('.data-management-section');
const exportDataSection = document.querySelector('.export-data-section'); // Add this line
const importDataSection = document.querySelector('.import-data-section'); // Add this line


// --- Utility Functions ---

// Fetches and parses the quiz_databases.csv file to get available quiz names
async function getQuizDatabaseList() {
    try {
        const response = await fetch('quiz_databases.csv');
        if (!response.ok) {
            // If the file is not found or other HTTP error occurs
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        // Split by new line, trim whitespace, and filter out empty lines
        const databaseNames = text.split('\n')
                                  .map(name => name.trim())
                                  .filter(name => name !== '');
        return databaseNames;
    } catch (error) {
        console.error("Error fetching quiz_databases.csv:", error);
        alert("Could not load quiz database list. Please ensure 'quiz_databases.csv' is in the root directory and accessible.");
        return [];
    }
}

// Fetches and parses a single question CSV file
async function fetchQuestions(csvFileName) {
    try {
       const response = await fetch(`quizzes/${notesFileName}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const questions = lines.map(line => {
            const parts = line.split(',');
            // Ensure there are enough parts for question, 4 options, and correct answer
            if (parts.length < 6) {
                console.warn(`Skipping malformed line in ${csvFileName}: ${line}`);
                return null; // Return null for malformed lines
            }
            return {
                questionText: parts[0].trim(),
                options: [parts[1].trim(), parts[2].trim(), parts[3].trim(), parts[4].trim()],
                correctAnswer: parts[5].trim()
            };
        }).filter(q => q !== null); // Filter out any null entries
        return questions;
    } catch (error) {
        console.error(`Error fetching ${csvFileName}:`, error);
        alert(`Could not load questions from ${csvFileName}. Please check the file format.`);
        return [];
    }
}

// Loads questions from all selected CSV databases
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
    clearInterval(timerInterval); // Clear any existing timer to prevent multiple timers
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
            correctQuestionsTracker = {}; // Reset if data is corrupted
            localStorage.removeItem('correctlyAnsweredQuestions'); // Clear corrupted data
        }
    } else {
        correctQuestionsTracker = {}; // Initialize as empty if no data exists
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
        const questionId = `${q.questionText}-${q.correctAnswer}`; // Create a unique ID for the question
        if (correctQuestionsTracker[questionId] === true) { // Check if this specific question was marked true (correct)
            correctlyAnsweredCount++;
        }
    });

    const remainingCount = allQuestionsInSelectedDBs.length - correctlyAnsweredCount;
    remainingQuestionsSpan.textContent = `Questions remaining: ${remainingCount} out of ${allQuestionsInSelectedDBs.length}`;
}

// --- Data Management Functions ---

// Function to download the current learning data as a JSON file
function downloadLearningData() {
    // Stringify the tracker object to JSON, with 2 spaces for pretty printing
    const dataStr = JSON.stringify(correctQuestionsTracker, null, 2);
    // Create a Blob object from the JSON string
    const blob = new Blob([dataStr], { type: 'application/json' });
    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Generate a timestamped filename (YYYY-MM-DD_HH-MM-SS)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed (0-11)
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const filename = `quiz_progress_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.json`;

    // Create a temporary anchor (<a>) element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename; // Set the download filename
    document.body.appendChild(a); // Append to body (required for Firefox)
    a.click(); // Programmatically click the anchor to start download
    document.body.removeChild(a); // Remove the temporary anchor
    URL.revokeObjectURL(url); // Release the object URL
    alert(`Your learning progress has been downloaded as "${filename}"`);
}

// Function to load learning data from an uploaded JSON file
function loadLearningDataFromFile(file) {
    const reader = new FileReader(); // Create a new FileReader object

    reader.onload = function(event) {
        try {
            // Parse the content of the file as JSON
            const loadedData = JSON.parse(event.target.result);
            // Replace the current tracker with the loaded data
            correctQuestionsTracker = loadedData;
            saveCorrectQuestionsTracker(); // Immediately save to localStorage

            alert('Learning progress successfully loaded from file! The page will reset to apply changes.');
            resetQuiz(); // Go back to the selector and update remaining question counts
        } catch (e) {
            console.error("Error parsing JSON file:", e);
            alert("Error loading file. Please make sure it's a valid JSON progress file.");
        } finally {
            // Clear the file input and hide buttons regardless of success/failure
            importDataFile.value = '';
            importDataBtn.style.display = 'none';
            clearLoadedFileBtn.style.display = 'none';
        }
    };

    reader.onerror = function() {
        alert("Failed to read the file.");
        // Clear the file input and hide buttons on error
        importDataFile.value = '';
        importDataBtn.style.display = 'none';
        clearLoadedFileBtn.style.display = 'none';
    };

    reader.readAsText(file); // Read the file content as text
}


// --- Quiz Logic Functions ---

// Displays the current question and its options
function displayQuestion() {
    // Check if there are more questions to display
    if (questionIndex < currentQuizQuestions.length) {
        const question = currentQuizQuestions[questionIndex];
        questionNumberDisplay.textContent = `Question ${questionIndex + 1}/${currentQuizQuestions.length}`;
        questionTextDisplay.textContent = question.questionText;
        optionsContainer.innerHTML = ''; // Clear previous options

        // Shuffle a copy of the options array before displaying
        const shuffledOptions = shuffleArray([...question.options]);
        shuffledOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.classList.add('option-button');
            // Attach a click handler that calls checkAnswer with the option and button reference
            button.onclick = () => checkAnswer(option, question, button);
            optionsContainer.appendChild(button);
        });

        nextQuestionBtn.style.display = 'none'; // Hide "Next Question" button until an answer is selected
        // Re-enable all option buttons for the new question
        Array.from(optionsContainer.children).forEach(btn => btn.disabled = false);
    } else {
        showResults(); // If no more questions, show results
    }
}

// Checks the selected answer against the correct answer
function checkAnswer(selectedOption, question, selectedButton) {
    // Disable all option buttons to prevent multiple selections
    Array.from(optionsContainer.children).forEach(btn => btn.disabled = true);

    const questionId = `${question.questionText}-${question.correctAnswer}`; // Unique ID for tracking

    if (selectedOption === question.correctAnswer) {
        score++;
        correctQuestionsTracker[questionId] = true; // Mark question as correctly answered
        selectedButton.style.backgroundColor = 'lightgreen'; // Highlight correct selection
        selectedButton.style.color = '#333';
    } else {
        correctQuestionsTracker[questionId] = false; // Mark question as incorrectly answered
        selectedButton.style.backgroundColor = 'lightcoral'; // Highlight incorrect selection
        selectedButton.style.color = '#333';
        // Also highlight the actual correct answer
        const correctOptionButton = Array.from(optionsContainer.children).find(btn => btn.textContent === question.correctAnswer);
        if (correctOptionButton) {
            correctOptionButton.style.backgroundColor = 'lightgreen';
            correctOptionButton.style.color = '#333';
        }
    }
    saveCorrectQuestionsTracker(); // Persist the updated tracker to localStorage

    nextQuestionBtn.style.display = 'block'; // Show "Next Question" button
}

// Initiates the quiz with selected databases
async function startQuiz(selectedDatabases) {
    const allQuestions = await loadAllSelectedQuestions(selectedDatabases);

    // Filter out questions that have been previously answered correctly
    const unansweredQuestions = allQuestions.filter(q => {
        const questionId = `${q.questionText}-${q.correctAnswer}`;
        return correctQuestionsTracker[questionId] !== true; // Only include if NOT marked as true
    });

    // Shuffle the unanswered questions and take up to 10 for the current quiz session
    const questionsToUse = unansweredQuestions.length >= 10
        ? shuffleArray(unansweredQuestions).slice(0, 10)
        : shuffleArray(unansweredQuestions);

    if (questionsToUse.length === 0) {
        alert("No new questions available in the selected quizzes! Try resetting your learning progress or selecting more quizzes.");
        resetQuiz(); // Go back to the selector
        return;
    }

    currentQuizQuestions = questionsToUse;
    questionIndex = 0;
    score = 0;
    startTime = Date.now(); // Record start time for timer
    startTimer(); // Begin the quiz timer

    // Hide the selector form, the data management section, and ensure results are hidden
    quizSelectorForm.style.display = 'none';
    dataManagementSection.style.display = 'none'; // <-- HIDE DURING QUIZ
    quizContainer.style.display = 'block';
    resultContainer.style.display = 'none';

    displayQuestion(); // Display the first question
}

// Displays the quiz results
function showResults() {
    stopTimer(); // Stop the timer when quiz ends
    const endTime = Date.now();
    const totalTimeTaken = endTime - startTime;
    const minutes = Math.floor(totalTimeTaken / 60000);
    const seconds = Math.floor((totalTimeTaken % 60000) / 1000);

    // Hide quiz container and show results container AND data management section
    quizContainer.style.display = 'none';
    resultContainer.style.display = 'block';
    dataManagementSection.style.display = 'block'; // <-- SHOW AT END OF QUIZ
    exportDataSection.style.display = 'block'; // Show export
    importDataSection.style.display = 'none';  // Hide import

    // Update result display
    correctCountSpan.textContent = score;
    wrongCountSpan.textContent = currentQuizQuestions.length - score;
    totalCountSpan.textContent = currentQuizQuestions.length;
    timeTakenSpan.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Update the "questions remaining" count on the selector page based on currently selected databases
    const selectedDatabasesForDisplay = Array.from(selectElement.selectedOptions).map(option => option.value);
    displayRemainingQuestionsCount(selectedDatabasesForDisplay);
}

// Resets the quiz state and returns to the database selection screen
function resetQuiz() {
    // Show selector and data management, hide quiz and results
    quizSelectorForm.style.display = 'block';
    dataManagementSection.style.display = 'block'; // <-- SHOW ON SELECTOR SCREEN
    exportDataSection.style.display = 'none';  // Hide export
    importDataSection.style.display = 'block'; // Show import
    quizContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    stopTimer(); // Clear any active timer

    // Update the "questions remaining" count on the selector page based on current selection
    const selectedDatabasesForDisplay = Array.from(selectElement.selectedOptions).map(option => option.value);
    displayRemainingQuestionsCount(selectedDatabasesForDisplay);
}

// --- Event Listeners and Initial Setup ---

// "Next Question" button click handler
nextQuestionBtn.addEventListener('click', () => {
    questionIndex++;
    displayQuestion();
});

// "Start New Quiz" button in results screen click handler
restartQuizBtn.addEventListener('click', () => {
    resetQuiz();
});

// "Reset Learning Progress" button click handler
resetLearningBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to reset your learning progress? This cannot be undone.")) {
        localStorage.removeItem('correctlyAnsweredQuestions'); // Clear data from localStorage
        correctQuestionsTracker = {}; // Clear in-memory tracker
        alert("Learning progress has been reset! The page will reset to apply changes.");
        resetQuiz(); // Reset UI and update counts
    }
});

// Event listener for the "Download My Progress" button
exportDataBtn.addEventListener('click', downloadLearningData);

// Event listener for when a file is selected in the import input
importDataFile.addEventListener('change', () => {
    // Show/hide the "Upload" and "Clear" buttons based on whether a file is selected
    if (importDataFile.files.length > 0) {
        importDataBtn.style.display = 'block';
        clearLoadedFileBtn.style.display = 'block';
    } else {
        importDataBtn.style.display = 'none';
        clearLoadedFileBtn.style.display = 'none';
    }
});

// Event listener for the "Upload and Load Progress" button
importDataBtn.addEventListener('click', () => {
    if (importDataFile.files.length > 0) {
        loadLearningDataFromFile(importDataFile.files[0]); // Pass the selected file
    } else {
        alert("Please select a file to upload.");
    }
});

// Event listener for the "Clear Selected File" button
clearLoadedFileBtn.addEventListener('click', () => {
    importDataFile.value = ''; // Clear the file input's value
    importDataBtn.style.display = 'none';
    clearLoadedFileBtn.style.display = 'none';
    alert("Selected file cleared from input.");
});


// Initial setup when the entire DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Ensure the data management section is visible on initial load
    dataManagementSection.style.display = 'block';
    exportDataSection.style.display = 'none';  // Hide export initially
    importDataSection.style.display = 'block'; // Show import initially

    // Load existing learning data from localStorage on startup
    loadCorrectQuestionsTracker();

    // Populate the quiz database selector dropdown
    const databaseNames = await getQuizDatabaseList();
    databaseNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        // Display a user-friendly name (e.g., "math_quiz.csv" becomes "math quiz")
        option.textContent = name.replace('.csv', '').replace(/_/g, ' ');
        selectElement.appendChild(option);
    });

    // Handle the submission of the quiz selection form
    quizSelectorForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission behavior (page reload)
        const selectedOptions = Array.from(selectElement.selectedOptions); // Get selected options
        const selectedDatabases = selectedOptions.map(option => option.value); // Extract their values (filenames)

        if (selectedDatabases.length > 0) {
            startQuiz(selectedDatabases); // Start the quiz with selected databases
        } else {
            alert('Please select at least one quiz database to start.');
        }
    });

    // Update the "questions remaining" count whenever the database selection changes
    selectElement.addEventListener('change', () => {
        const selectedDatabases = Array.from(selectElement.selectedOptions).map(option => option.value);
        if (selectedDatabases.length > 0) {
             displayRemainingQuestionsCount(selectedDatabases);
        } else {
            remainingQuestionsSpan.textContent = 'Select quizzes to see remaining questions.';
        }
    });

    // Initial message for "questions remaining" when no databases are selected yet
    remainingQuestionsSpan.textContent = 'Select quizzes to see remaining questions.';
});
