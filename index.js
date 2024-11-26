document.addEventListener('DOMContentLoaded', () => {
    // Loading example demonstration
    const loadingConsole = document.getElementById('loadingConsole');
    const startLoadingDemo = document.getElementById('startLoadingDemo');

    // Simulate an async operation
    const simulateOperation = () => new Promise(resolve => setTimeout(resolve, 5000));

    startLoadingDemo.addEventListener('click', () => {
        loadingConsole.logWaiting('Waiting for data...', simulateOperation)
            .then(() => loadingConsole.log('Operation completed successfully!'))
            .catch(err => loadingConsole.log('Operation failed: ' + err, 'error'));
    });

    // Initialize examples
    const markdownConsole = document.getElementById('markdownConsole');
    markdownConsole.logHTML('<span style="color: #22c55e">✨ This is an HTML formatted message with <strong>bold</strong> text</span>');
    markdownConsole.log('Regular info message with some text <code>');
    markdownConsole.log('Warning: Resource usage high', 'warning');
    markdownConsole.log('Error: Connection failed', 'error');
    markdownConsole.logMD('# Hello Markdown\nThis is a **bold** text with `code` and *italic* text');
    markdownConsole.logCollapsedMD(
        'Python code example (click arrow to expand)',
        '```python\nprint("Hello, World!")\n```'
    );

    const collapsibleConsole = document.getElementById('collapsibleConsole');
    collapsibleConsole.logCollapsed('Title', 'This is a collapsible message');

    collapsibleConsole.logCollapsed(
        'TypeError: object is not subscriptable',
        `Traceback (most recent call last):
  File "app.py", line 42, in process_data
    result = data['key']
  File "processor.py", line 156, in get_item
    return self._process_item(key)
  File "processor.py", line 89, in _process_item
    value = None['invalid']
TypeError: 'NoneType' object is not subscriptable`
    );

    // Command handler example
    const commandConsole = document.getElementById('commandConsole');
    commandConsole.addEventListener('input-submit', (e) => {
        const input = e.detail.input.trim();
        if (input === '.hello') {
            commandConsole.log('Hello! Nice to meet you! 👋', 'info');
        }
    });

    // Handle radio change
    document.querySelectorAll('input[name="example"]').forEach(radio => {
        radio.addEventListener('change', function(e) {
            if (this.checked) {
                setExample(this.value);
            }
        });
    });

    // Initialize based on URL parameter or first example
    const urlParams = new URLSearchParams(window.location.search);
    const initialExample = urlParams.get('example');
    if (initialExample) {
        const radio = document.querySelector(`input[name="example"][value="${initialExample}"]`);
        if (radio) {
            radio.checked = true;
            setExample(initialExample);
        }
    } else {
        document.querySelector('input[name="example"]').checked = true;
        document.querySelector('.console-example').classList.add('active');
    }
});

// URL parameter handling
function setExample(value) {
    // Hide all examples
    document.querySelectorAll('.console-example').forEach(example => {
        example.classList.remove('active');
    });

    // Show selected example
    if (value) {
        const selectedExample = document.getElementById(value);
        if (selectedExample) {
            selectedExample.classList.add('active');
            // Update URL without reloading
            const url = new URL(window.location.href);
            url.searchParams.set('example', value);
            window.history.pushState({}, '', url);
        }
    }
}