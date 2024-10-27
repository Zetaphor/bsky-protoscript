// deno-lint-ignore-file no-window
// Add this object to store the code strings
const codeStorage = {};

// Add this line at the top of the file, outside any function
let editor;

const defaultEditorContent = `// Helper functions:

// Clear all body content
function clearBody() {
  document.body.innerHTML = '';
}

// Inject a script from a URL
function injectScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Inject a stylesheet from a URL
function injectStyle(url) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

// Example usage:
// clearBody();

// AnimeJS: https://animejs.com/
// await injectScript('https://unpkg.com/animejs@2.2.0/anime.min.js');

// SNES.css: https://snes-css.sadlative.com/
// await injectStyle('https://unpkg.com/snes.css@1.0.1/dist/snes.min.css');

// Your code here:

`;

function _openTab(evt, tabName) {
  const tabcontent = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  const tablinks = document.getElementsByClassName("tablinks");
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className
      .replace(" active", "")
      .replace(" bg-gray-100", "")
      .replace(" dark:bg-gray-400", "")
      .replace(" font-semibold", "");
    // Set the inactive tab color
    tablinks[i].classList.add("bg-white", "dark:bg-gray-700");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active bg-gray-100 dark:bg-gray-400 font-semibold";
  // Remove the inactive tab color from the active tab
  evt.currentTarget.classList.remove("bg-white", "dark:bg-gray-700");

  // Hide the code execution result and submit result when switching tabs
  hideCodeExecutionResult();
  hideResult();
}

require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.30.1/min/vs' } });
require(['vs/editor/editor.main'], function () {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Remove the 'const' keyword to use the global editor variable
  editor = monaco.editor.create(document.getElementById('editor-container'), {
    value: defaultEditorContent,
    language: 'javascript',
    theme: isDarkMode ? 'vs-dark' : 'vs-light',
    automaticLayout: true
  });

  // Add event listener for dark mode changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    const newTheme = event.matches ? 'vs-dark' : 'vs-light';
    monaco.editor.setTheme(newTheme);
  });

  // Modify this part to show a simple success or failure message
  document.getElementById('publish-form').addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent the default form submission

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const filename = document.getElementById('filename').value.trim();
    const description = document.getElementById('description').value.trim();
    const content = editor.getValue().trim();

    if (!username || !password || !filename || !content) {
      showResult('Error: Please fill in all required fields (username, password, filename, and content).', 'error');
      return;
    }

    try {
      const response = await fetch('/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, filename, content, description })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      showResult('Script published successfully!', 'success');
    } catch (error) {
      console.error('Error publishing file:', error);
      showResult('An error occurred while publishing the file. Please try again.', 'error');
    }
  });

  document.getElementById('getRecordsButton').addEventListener('click', async () => {
    const username = document.getElementById('getRecordsUsername').value.trim();

    if (!username) {
      document.getElementById('recordsList').textContent = 'Error: Please enter a username.';
      return;
    }

    try {
      const response = await fetch(`/getRecords?username=${encodeURIComponent(username)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const records = await response.json();
      const recordsList = document.getElementById('recordsList');
      recordsList.innerHTML = '<h3 class="text-lg font-semibold mb-4">Records:</h3>';
      records.forEach(record => {
        const recordDiv = document.createElement('div');
        recordDiv.className = 'record-item mb-4 p-4 bg-gray-50 dark:bg-gray-600 rounded-md';
        // Store the code and description in the codeStorage object
        codeStorage[record.value.filename] = {
          content: record.value.content,
          description: record.value.description || ''
        };
        recordDiv.innerHTML = `
          <span class="record-filename text-lg text-blue-500 dark:text-blue-300 font-semibold">${record.value.filename.trim()}</span>
          <br>
          <span class="text-gray-600 dark:text-gray-300">${record.value.description ? record.value.description.trim() : 'N/A'}</span>
          <div class="mt-2">
            <button class="execute-btn px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 mr-2">Execute</button>
            <button class="edit-btn px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600">Edit</button>
          </div>
        `;
        recordsList.appendChild(recordDiv);

        // Add event listeners to the buttons
        recordDiv.querySelector('.execute-btn').addEventListener('click', () => _executeCode(record.value.filename));
        recordDiv.querySelector('.edit-btn').addEventListener('click', () => _copyToEditor(record.value.filename));
      });
    } catch (error) {
      console.error('Error retrieving records:', error);
      document.getElementById('recordsList').textContent = 'An error occurred while retrieving records. Please try again.';
    }
  });
});

function _executeCode(filename) {
  const resultDiv = document.getElementById('codeExecutionResult');
  resultDiv.style.display = 'block'; // Show the result div
  resultDiv.innerHTML = `<h4>Executing ${filename}...</h4>`;

  const code = codeStorage[filename];

  try {
    // Create a new Function from the code string and execute it
    const executedCode = new Function(code.content);
    const result = executedCode();

    // If the function returns a value, display it
    if (result !== undefined) {
      resultDiv.innerHTML += `<pre>${JSON.stringify(result, null, 2)}</pre>`;
    } else {
      resultDiv.innerHTML = `<h4>Executing ${filename}...</h4><p>Code executed successfully, but produced no output.</p>`;
    }
  } catch (error) {
    resultDiv.innerHTML = `<h4>Executing ${filename}...</h4><p style="color: red;">Error: ${error.message}</p>`;
  }
}

function hideCodeExecutionResult() {
  const resultDiv = document.getElementById('codeExecutionResult');
  resultDiv.style.display = 'none';
}

function showResult(message, type) {
  const resultDiv = document.getElementById('result');
  resultDiv.textContent = message;
  resultDiv.className = 'mt-4 p-4 rounded-md';

  if (type === 'success') {
    resultDiv.classList.add('bg-green-100', 'text-green-700', 'dark:bg-green-800', 'dark:text-green-100');
  } else if (type === 'error') {
    resultDiv.classList.add('bg-red-100', 'text-red-700', 'dark:bg-red-800', 'dark:text-red-100');
  }

  resultDiv.style.display = 'block';
}

function hideResult() {
  const resultDiv = document.getElementById('result');
  resultDiv.style.display = 'none';
  resultDiv.className = 'mt-4 p-4 rounded-md'; // Reset classes
}

function _copyToEditor(filename) {
  const { content, description } = codeStorage[filename];
  editor.setValue(content);
  document.getElementById('filename').value = filename;
  document.getElementById('description').value = description;

  _openTab({ currentTarget: document.querySelector('.tablinks:nth-child(3)') }, 'PublishFile');
}

document.addEventListener('DOMContentLoaded', () => {
  hideCodeExecutionResult();
  hideResult();
  // Open the About tab by default
  document.querySelector('.tablinks').click();

  // Add event listener for the Enter key in the getRecordsUsername input
  const getRecordsUsernameInput = document.getElementById('getRecordsUsername');
  getRecordsUsernameInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission if it's in a form
      document.getElementById('getRecordsButton').click(); // Trigger the button click
    }
  });
});
