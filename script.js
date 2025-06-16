// script.js

// ... (existing global variables) ...

// NEW HTML Element references
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataFile = document.getElementById('importDataFile');
const importDataBtn = document.getElementById('importDataBtn');
const clearLoadedFileBtn = document.getElementById('clearLoadedFileBtn');


// --- Utility Functions ---
// ... (existing utility functions: getQuizDatabaseList, fetchQuestions, etc.) ...

// NEW: Function to download data as a JSON file
function downloadLearningData() {
    const dataStr = JSON.stringify(correctQuestionsTracker, null, 2); // Pretty print JSON
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz_learning_progress.json'; // Default filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up
    alert('Your learning progress has been downloaded as "quiz_learning_progress.json"');
}

// NEW: Function to load data from an uploaded JSON file
function loadLearningDataFromFile(file) {
    const reader = new FileReader();

    reader.onload = function(event) {
        try {
            const loadedData = JSON.parse(event.target.result);
            // Optionally, you could merge data instead of replacing:
            // correctQuestionsTracker = { ...correctQuestionsTracker, ...loadedData };
            correctQuestionsTracker = loadedData; // Replace existing data
            saveCorrectQuestionsTracker(); // Save to localStorage immediately
            alert('Learning progress successfully loaded from file!');
            resetQuiz(); // Return to selector and update counts
        } catch (e) {
            console.error("Error parsing JSON file:", e);
            alert("Error loading file. Please make sure it's a valid JSON progress file.");
        } finally {
            // Reset file input after processing
            importDataFile.value = '';
            importDataBtn.style.display = 'none';
            clearLoadedFileBtn.style.display = 'none';
        }
    };

    reader.onerror = function() {
        alert("Failed to read the file.");
        // Reset file input
        importDataFile.value = '';
        importDataBtn.style.display = 'none';
        clearLoadedFileBtn.style.display = 'none';
    };

    reader.readAsText(file);
}

// ... (existing quiz logic functions) ...

// --- Event Listeners and Initial Setup ---

// ... (existing event listeners for nextQuestionBtn, restartQuizBtn, resetLearningBtn) ...

// NEW: Event listener for Export Data button
exportDataBtn.addEventListener('click', downloadLearningData);

// NEW: Event listener for file selection
importDataFile.addEventListener('change', () => {
    if (importDataFile.files.length > 0) {
        importDataBtn.style.display = 'block';
        clearLoadedFileBtn.style.display = 'block';
    } else {
        importDataBtn.style.display = 'none';
        clearLoadedFileBtn.style.display = 'none';
    }
});

// NEW: Event listener for Import Data button
importDataBtn.addEventListener('click', () => {
    if (importDataFile.files.length > 0) {
        loadLearningDataFromFile(importDataFile.files[0]);
    } else {
        alert("Please select a file to upload.");
    }
});

// NEW: Event listener for Clear Loaded File button
clearLoadedFileBtn.addEventListener('click', () => {
    importDataFile.value = ''; // Clear selected file
    importDataBtn.style.display = 'none';
    clearLoadedFileBtn.style.display = 'none';
    alert("Selected file cleared.");
});


// ... (rest of existing DOMContentLoaded listener) ...

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