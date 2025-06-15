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

    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    const NUM_QUESTIONS_TO_DISPLAY = 10; // Fixed number of questions to display

    async function fetchQuestions() {
        try {
            const response = await fetch('questions.csv');
            const csvText = await response.text();
            questions = parseCSV(csvText);
            // Shuffle questions and select the first NUM_QUESTIONS_TO_DISPLAY
            questions = shuffleArray(questions).slice(0, NUM_QUESTIONS_TO_DISPLAY);
            if (questions.length === 0) {
                questionElement.textContent = "No questions loaded. Please check your questions.csv file.";
                optionsContainer.innerHTML = '';
                nextButton.style.display = 'none';
                return;
            }
            startQuiz();
        } catch (error) {
            console.error('Error fetching or parsing CSV:', error);
            questionElement.textContent = "Failed to load quiz questions. Please check console for details.";
            optionsContainer.innerHTML = '';
            nextButton.style.display = 'none';
        }
    }

    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        return lines.map(line => {
            // Basic CSV parsing, handles commas within quotes if properly formatted
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
                question: parts[0],
                options: [parts[1], parts[2], parts[3], parts[4]],
                correctAnswer: parts[5]
            };
        }).filter(item => item !== null); // Filter out nulls from malformed rows
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function startQuiz() {
        currentQuestionIndex = 0;
        score = 0;
        quizContainer.style.display = 'block';
        resultContainer.style.display = 'none';
        showQuestion();
    }

    function showQuestion() {
        resetQuizState();
        if (currentQuestionIndex < questions.length) {
            const currentQuestion = questions[currentQuestionIndex];
            questionElement.textContent = currentQuestion.question;

            // Shuffle options for each question
            const shuffledOptions = shuffleArray([...currentQuestion.options]);

            optionButtons.forEach((button, index) => {
                button.textContent = shuffledOptions[index];
                button.onclick = () => checkAnswer(button, currentQuestion.correctAnswer);
                button.disabled = false; // Enable buttons for new question
                button.classList.remove('correct', 'incorrect'); // Remove previous feedback classes
            });

            nextButton.style.display = 'none'; // Hide next button initially
            feedbackElement.textContent = ''; // Clear feedback
            feedbackElement.classList.remove('correct-feedback', 'incorrect-feedback');
        } else {
            showResults();
        }
    }

    function checkAnswer(selectedButton, correctAnswer) {
        const selectedAnswer = selectedButton.textContent;
        disableOptions(); // Disable all options after selection

        if (selectedAnswer === correctAnswer) {
            score++;
            feedbackElement.textContent = 'Correct!';
            feedbackElement.classList.add('correct-feedback');
            selectedButton.classList.add('correct');
        } else {
            feedbackElement.textContent = `Incorrect! The correct answer was: ${correctAnswer}`;
            feedbackElement.classList.add('incorrect-feedback');
            selectedButton.classList.add('incorrect');
            // Highlight the correct answer if the user was wrong
            optionButtons.forEach(button => {
                if (button.textContent === correctAnswer) {
                    button.classList.add('correct');
                }
            });
        }
        nextButton.style.display = 'block'; // Show next button
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
        quizContainer.style.display = 'none';
        resultContainer.style.display = 'block';
        scoreElement.textContent = score;
        totalQuestionsElement.textContent = questions.length;
    }

    nextButton.addEventListener('click', () => {
        currentQuestionIndex++;
        showQuestion();
    });

    restartButton.addEventListener('click', () => {
        fetchQuestions(); // Re-fetch and re-shuffle questions for a new game
    });

    // Initial load of questions
    fetchQuestions();
});
