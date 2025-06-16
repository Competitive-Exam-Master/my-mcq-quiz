document.addEventListener('DOMContentLoaded', () => {
    const questionElement = document.getElementById('question');
    const optionsContainer = document.getElementById('options');
    const optionButtons = Array.from(document.getElementsByClassName('option-btn'));
    const feedbackElement = document.getElementById('feedback');
    const nextButton = document.getElementById('next-btn');
    const quizContainer = document.getElementById('quiz-container');
    const resultContainer = document.getElementById('result-container');
    const scoreElement = document.getElementById('score');
    const totalQuestionsElement = document.getElementById('total-questions');
    const restartButton = document.getElementById('restart-btn');

    const currentQuestionNumberElement = document.getElementById('current-question-number');
    const totalQuizQuestionsElement = document.getElementById('total-quiz-questions');

    const timeDisplayElement = document.getElementById('time-display');
    const finalTimeElement = document.getElementById('final-time');

    let allQuestions = []; // Stores all questions initially loaded from CSV
    let currentQuizQuestions = []; // Questions for the current quiz session
    let currentQuestionIndex = 0;
    let score = 0;
    const NUM_QUESTIONS_TO_DISPLAY = 10; // Fixed number of questions to display per quiz

    let timerInterval;
    let startTime;
    let elapsedTime = 0;

    const CORRECT_ANSWERS_STORAGE_KEY = 'correctlyAnsweredQuestions';

    // --- Helper Functions ---

    // Function to format time (MM:SS)
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(remainingSeconds).padStart(2, '0');
        return `${formattedMinutes}:${formattedSeconds}`;
    }

    // Function to start the timer
    function startTimer() {
        startTime = Date.now() - elapsedTime;
        timerInterval = setInterval(() => {
            elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            timeDisplayElement.textContent = formatTime(elapsedTime);
        }, 1000);
    }

    // Function to stop the timer
    function stopTimer() {
        clearInterval(timerInterval);
    }

    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        return lines.map((line, index) => { // Add index to create unique ID
            const parts = [];
            let inQuote = false;
            let currentPart = '';
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    parts.push(currentPart.trim());
                    currentPart = '';
                } else {
                    currentPart += char;
                }
            }
            parts.push(currentPart.trim()); // Add the last part

            if (parts.length < 6) {
                console.warn("Skipping malformed CSV row:", line);
                return null;
            }

            return {
                id: `q${index}`, // Assign a unique ID to each question
                question: parts[0],
                options: [parts[1], parts[2], parts[3], parts[4]],
                correctAnswer: parts[5]
            };
        }).filter(item => item !== null);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- Local Storage Functions ---

    // Get correctly answered question IDs from local storage
    function getCorrectlyAnsweredQuestionIds() {
        const storedIds = localStorage.getItem(CORRECT_ANSWERS_STORAGE_KEY);
        return storedIds ? new Set(JSON.parse(storedIds)) : new Set();
    }

    // Add a question ID to local storage as correctly answered
    function markQuestionAsCorrect(questionId) {
        const correctlyAnswered = getCorrectlyAnsweredQuestionIds();
        correctlyAnswered.add(questionId);
        localStorage.setItem(CORRECT_ANSWERS_STORAGE_KEY, JSON.stringify(Array.from(correctlyAnswered)));
    }

    // Clear all correctly answered questions from local storage
    function clearCorrectlyAnsweredQuestions() {
        localStorage.removeItem(CORRECT_ANSWERS_STORAGE_KEY);
        console.log("Correctly answered questions cleared from storage.");
    }

    // --- Quiz Logic ---

    async function fetchQuestions() {
        try {
            const response = await fetch('questions.csv');
            const csvText = await response.text();
            allQuestions = parseCSV(csvText); // Store all questions

            if (allQuestions.length === 0) {
                questionElement.textContent = "No questions loaded. Please check your questions.csv file.";
                optionsContainer.innerHTML = '';
                nextButton.style.display = 'none';
                currentQuestionNumberElement.textContent = '0';
                totalQuizQuestionsElement.textContent = '0';
                timeDisplayElement.textContent = '00:00';
                return;
            }
            prepareAndStartQuiz();
        } catch (error) {
            console.error('Error fetching or parsing CSV:', error);
            questionElement.textContent = "Failed to load quiz questions. Please check console for details.";
            optionsContainer.innerHTML = '';
            nextButton.style.display = 'none';
            currentQuestionNumberElement.textContent = '0';
            totalQuizQuestionsElement.textContent = '0';
            timeDisplayElement.textContent = '00:00';
        }
    }

    function prepareAndStartQuiz() {
        const correctlyAnsweredIds = getCorrectlyAnsweredQuestionIds();

        // Filter out questions that have been answered correctly
        const availableQuestions = allQuestions.filter(q => !correctlyAnsweredIds.has(q.id));

        if (availableQuestions.length === 0) {
            questionElement.textContent = "All questions have been answered correctly! Congratulations! Click 'Restart Quiz' to reset.";
            optionsContainer.innerHTML = '';
            nextButton.style.display = 'none';
            stopTimer();
            timeDisplayElement.textContent = '00:00';
            currentQuestionNumberElement.textContent = '0';
            totalQuizQuestionsElement.textContent = '0';
            // Show result container directly, but with 0/0 score and a special message
            quizContainer.style.display = 'none';
            resultContainer.style.display = 'block';
            scoreElement.textContent = '0';
            totalQuestionsElement.textContent = '0';
            finalTimeElement.textContent = 'N/A'; // No time taken for an empty quiz
            return; // Stop here if no questions are available
        }

        // Shuffle available questions and select the first NUM_QUESTIONS_TO_DISPLAY
        currentQuizQuestions = shuffleArray(availableQuestions).slice(0, NUM_QUESTIONS_TO_DISPLAY);
        totalQuizQuestionsElement.textContent = currentQuizQuestions.length; // Set total questions for this quiz session

        startQuiz();
    }

    function startQuiz() {
        currentQuestionIndex = 0;
        score = 0;
        elapsedTime = 0;
        timeDisplayElement.textContent = '00:00';
        stopTimer();
        startTimer();

        quizContainer.style.display = 'block';
        resultContainer.style.display = 'none';
        showQuestion();
    }

    function showQuestion() {
        resetQuizState();
        if (currentQuestionIndex < currentQuizQuestions.length) {
            const currentQuestion = currentQuizQuestions[currentQuestionIndex];
            questionElement.textContent = currentQuestion.question;

            currentQuestionNumberElement.textContent = currentQuestionIndex + 1;

            const shuffledOptions = shuffleArray([...currentQuestion.options]);

            optionButtons.forEach((button, index) => {
                button.textContent = shuffledOptions[index];
                button.onclick = () => checkAnswer(button, currentQuestion); // Pass full question object
                button.disabled = false;
                button.classList.remove('correct', 'incorrect');
            });

            nextButton.style.display = 'none';
            feedbackElement.textContent = '';
            feedbackElement.classList.remove('correct-feedback', 'incorrect-feedback');
        } else {
            showResults();
        }
    }

    // Modified checkAnswer to receive the full question object
    function checkAnswer(selectedButton, questionObj) {
        const selectedAnswer = selectedButton.textContent;
        disableOptions();

        if (selectedAnswer === questionObj.correctAnswer) {
            score++;
            feedbackElement.textContent = 'Correct!';
            feedbackElement.classList.add('correct-feedback');
            selectedButton.classList.add('correct');
            markQuestionAsCorrect(questionObj.id); // Mark this question as correct
        } else {
            feedbackElement.textContent = `Incorrect! The correct answer was: ${questionObj.correctAnswer}`;
            feedbackElement.classList.add('incorrect-feedback');
            selectedButton.classList.add('incorrect');
            optionButtons.forEach(button => {
                if (button.textContent === questionObj.correctAnswer) {
                    button.classList.add('correct');
                }
            });
        }
        nextButton.style.display = 'block';
    }

    function disableOptions() {
        optionButtons.forEach(button => {
            button.disabled = true;
        });
    }

    function resetQuizState() {
        optionButtons.forEach(button => {
            button.classList.remove('correct', 'incorrect');
            button.disabled = false;
        });
        feedbackElement.textContent = '';
        feedbackElement.classList.remove('correct-feedback', 'incorrect-feedback');
        nextButton.style.display = 'none';
    }

    function showResults() {
        stopTimer();
        quizContainer.style.display = 'none';
        resultContainer.style.display = 'block';
        scoreElement.textContent = score;
        totalQuestionsElement.textContent = currentQuizQuestions.length; // Use currentQuizQuestions length
        finalTimeElement.textContent = formatTime(elapsedTime);
    }

    nextButton.addEventListener('click', () => {
        currentQuestionIndex++;
        showQuestion();
    });

    restartButton.addEventListener('click', () => {
        // If you want "Restart Quiz" to clear all learned questions:
        // clearCorrectlyAnsweredQuestions();
        // If you want "Restart Quiz" to just start a new quiz with currently learned questions:
        prepareAndStartQuiz();
    });

    // --- Initialization ---
    fetchQuestions();

    // Optional: Add a button to clear correctly answered questions if you need to reset progress
    // For example, you could add this to your HTML:
    // <button id="clear-progress-btn">Clear Quiz Progress</button>
    // And then add the event listener here:
    // const clearProgressBtn = document.createElement('button');
    // clearProgressBtn.textContent = "Clear All Progress";
    // clearProgressBtn.addEventListener('click', () => {
    //     clearCorrectlyAnsweredQuestions();
    //     prepareAndStartQuiz(); // Restart quiz with all questions now available
    // });
    // document.querySelector('.container').appendChild(clearProgressBtn); // Or wherever you want it
});
