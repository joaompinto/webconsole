class WebConsole extends HTMLElement {
    constructor() {
        super();
        this.prompt = this.getAttribute('prompt') || '>';
        this.maxHistory = parseInt(this.getAttribute('max-history')) || 500;
        this.maxInputHistory = parseInt(this.getAttribute('max-input-history')) || 500;
        
        // Verify required dependencies
        if (typeof marked === 'undefined') {
            console.error('marked.js is required for Markdown support');
        }
        if (typeof DOMPurify === 'undefined') {
            console.error('DOMPurify is required for safe HTML rendering');
        }

        // Store initial content before clearing it
        const initialContent = this.innerHTML.trim() || this.getAttribute('content');
        this.innerHTML = '';
        
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style id="themeStyle"></style>
            <div class="console" id="consoleOutput"></div>
            <input type="text" class="input" id="consoleInput" placeholder="Type a command..." autocomplete="off">
            <div class="legend">
                <div class="legend-group">
                    <span class="legend-item" data-key="↑">Previous command</span>
                    <span class="legend-item" data-key="↓">Next command</span>
                </div>
                <div class="legend-group">
                    <span class="legend-item" data-key="PgUp">Go to/Expand previous output</span>
                </div>
            </div>
        `;
        
        // Set initial theme
        this.updateTheme(this.getAttribute('theme') || 'dark');
        
        // Display initial content if present
        if (initialContent) {
            setTimeout(() => this.log(initialContent), 0);
        }

        this._messageCounter = 0; // Add counter for unique IDs
        this._history = [];
        this._historyIndex = -1;
        this._currentInput = '';
    }

    static get observedAttributes() {
        return ['placeholder', 'theme', 'height', 'max-history', 'spacing', 'prompt', 'max-input-history'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'placeholder') {
            this.shadowRoot.querySelector('#consoleInput').placeholder = newValue;
        } else if (name === 'theme') {
            this.updateTheme(newValue);
        } else if (name === 'prompt') {
            this.prompt = newValue || '>';
        } else if (name === 'height') {
            this.updateHeight(newValue);
        } else if (name === 'max-history') {
            this.maxHistory = parseInt(newValue) || 500;
            this.trimHistory();
        } else if (name === 'spacing') {
            this.style.setProperty('--console-spacing', newValue || '0px');
        } else if (name === 'max-input-history') {
            this.maxInputHistory = parseInt(newValue) || 500;
            this.trimInputHistory();
        }
    }

    connectedCallback() {
        const input = this.shadowRoot.querySelector('#consoleInput');
        input.addEventListener('keydown', this.handleInput.bind(this));
        input.placeholder = this.getAttribute('placeholder') || 'Type a command...';
        this.updateTheme(this.getAttribute('theme') || 'dark');
    }

    handleInput(event) {
        const input = event.target;

        switch (event.key) {
            case 'PageUp':
                event.preventDefault();
                this.scrollToLastMessage();
                break;

            case 'Enter':
                const inputValue = input.value;
                if (inputValue.trim()) {
                    this.log(`${this.prompt} ${inputValue}`, false, true);
                    this._history.push(inputValue);
                    this.trimInputHistory();
                    this._historyIndex = this._history.length;
                    this._currentInput = '';
                    input.value = '';
                    this.dispatchEvent(new CustomEvent('input-submit', {
                        detail: { input: inputValue }
                    }));
                }
                break;

            case 'ArrowUp':
                event.preventDefault();
                if (this._historyIndex === this._history.length) {
                    this._currentInput = input.value;
                }
                if (this._historyIndex > 0) {
                    this._historyIndex--;
                    input.value = this._history[this._historyIndex];
                }
                break;

            case 'ArrowDown':
                event.preventDefault();
                if (this._historyIndex < this._history.length) {
                    this._historyIndex++;
                    input.value = this._historyIndex === this._history.length 
                        ? this._currentInput 
                        : this._history[this._historyIndex];
                }
                break;
        }
    }

    scrollToLastMessage() {
        const consoleOutput = this.shadowRoot.querySelector('#consoleOutput');
        const messages = consoleOutput.children;
        if (messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];
        
        // If it's a collapsible message, expand it
        const collapsibleButton = lastMessage.querySelector('.collapsible-button');
        const collapsibleContent = lastMessage.querySelector('.collapsible-content');
        if (collapsibleButton && collapsibleContent) {
            collapsibleButton.classList.add('expanded');
            collapsibleContent.classList.add('expanded');
            collapsibleButton.title = 'Click to collapse';
        }

        // Scroll the message into view
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    trimHistory() {
        const consoleOutput = this.shadowRoot.querySelector('#consoleOutput');
        while (consoleOutput.children.length > this.maxHistory) {
            consoleOutput.removeChild(consoleOutput.firstChild);
        }
    }

    trimInputHistory() {
        while (this._history.length > this.maxInputHistory) {
            this._history.shift();
        }
        if (this._historyIndex > this._history.length) {
            this._historyIndex = this._history.length;
        }
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    log(message, type = 'info', isPrompt = false) {
        const consoleOutput = this.shadowRoot.querySelector('#consoleOutput');
        const messageElement = document.createElement('div');
        const messageId = `msg-${this._messageCounter++}`;
        messageElement.id = messageId;
        
        const contentSpan = document.createElement('span');
        contentSpan.innerHTML = this.escapeHtml(message);
        messageElement.appendChild(contentSpan);
        
        if (isPrompt) {
            messageElement.classList.add('prompt-message');
        } else {
            messageElement.classList.add(`message-${type}`);
        }
        
        consoleOutput.appendChild(messageElement);
        this.trimHistory();
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
        
        return messageId;
    }

    logHTML(message, type = 'info', isPrompt = false) {
        const consoleOutput = this.shadowRoot.querySelector('#consoleOutput');
        const messageElement = document.createElement('div');
        const messageId = `msg-${this._messageCounter++}`;
        messageElement.id = messageId;
        
        const contentSpan = document.createElement('span');
        contentSpan.innerHTML = DOMPurify.sanitize(message);
        messageElement.appendChild(contentSpan);
        
        if (isPrompt) {
            messageElement.classList.add('prompt-message');
        } else {
            messageElement.classList.add(`message-${type}`);
        }
        
        consoleOutput.appendChild(messageElement);
        this.trimHistory();
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
        
        return messageId;
    }

    updateMessage(messageId, newContent, type = null) {
        const messageElement = this.shadowRoot.querySelector(`#${messageId}`);
        if (!messageElement) return false;

        // Update content
        const contentSpan = messageElement.querySelector('span') || messageElement;
        contentSpan.innerHTML = this.escapeHtml(newContent);

        // Update type if provided
        if (type) {
            messageElement.className = ''; // Clear existing classes
            messageElement.classList.add(`message-${type}`);
        }

        return true;
    }

    logMD(markdown, isError = false) {
        const consoleOutput = this.shadowRoot.querySelector('#consoleOutput');
        const messageElement = document.createElement('div');
        
        // Parse and sanitize markdown
        const htmlContent = DOMPurify.sanitize(marked.parse(markdown));
        console.log(htmlContent);
        messageElement.innerHTML = htmlContent;
        
        if (isError) {
            messageElement.style.color = 'red';
        }
        
        consoleOutput.appendChild(messageElement);
        this.trimHistory();
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    logCollapsed(message, detailedMessage) {
        const consoleOutput = this.shadowRoot.querySelector('#consoleOutput');
        const container = document.createElement('div');
        
        const messageElement = document.createElement('div');
        const messageText = document.createElement('span');
        messageText.textContent = message;
        
        const button = document.createElement('span');
        button.textContent = '▼';
        button.className = 'collapsible-button';
        button.title = 'Click to expand';
        
        messageElement.appendChild(messageText);
        messageElement.appendChild(button);
        
        const detailsElement = document.createElement('div');
        detailsElement.className = 'collapsible-content';
        
        // Add copy button
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.className = 'copy-button';
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(detailedMessage);
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copied!';
            setTimeout(() => copyButton.textContent = originalText, 1500);
        });
        
        detailsElement.appendChild(copyButton);
        detailsElement.innerHTML += detailedMessage.replace(/\n/g, '<br>');
        
        button.addEventListener('click', () => {
            button.classList.toggle('expanded');
            detailsElement.classList.toggle('expanded');
            button.title = button.classList.contains('expanded') ? 'Click to collapse' : 'Click to expand';
        });
        
        container.appendChild(messageElement);
        container.appendChild(detailsElement);
        consoleOutput.appendChild(container);
        this.trimHistory();
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    logCollapsedMD(messageText, detailedMarkdown) {
        const consoleOutput = this.shadowRoot.querySelector('#consoleOutput');
        const container = document.createElement('div');
        
        const messageElement = document.createElement('div');
        const messageSpan = document.createElement('span');
        messageSpan.textContent = messageText;
        
        const button = document.createElement('span');
        button.textContent = '▼';
        button.className = 'collapsible-button';
        button.title = 'Click to expand';
        
        messageElement.appendChild(messageSpan);
        messageElement.appendChild(button);
        
        const detailsElement = document.createElement('div');
        detailsElement.className = 'collapsible-content';
        
        // Add copy button
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.className = 'copy-button';
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(detailedMarkdown);
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copied!';
            setTimeout(() => copyButton.textContent = originalText, 1500);
        });
        
        detailsElement.appendChild(copyButton);
        detailsElement.innerHTML += DOMPurify.sanitize(marked.parse(detailedMarkdown));
        
        button.addEventListener('click', () => {
            button.classList.toggle('expanded');
            detailsElement.classList.toggle('expanded');
            button.title = button.classList.contains('expanded') ? 'Click to collapse' : 'Click to expand';
        });
        
        container.appendChild(messageElement);
        container.appendChild(detailsElement);
        consoleOutput.appendChild(container);
        this.trimHistory();
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    async logWaiting(message, callback) {
        const msgId = this.logHTML(`${this.escapeHtml(message)} <span class="spin">⌛</span>`, 'info');

        try {
            const result = await callback();
            this.updateMessage(msgId, `${message} ✅`, 'info');
            return result;
        } catch (error) {
            this.updateMessage(msgId, `${message} ❌`, 'error');
            throw error;
        }
    }

    updateTheme(theme) {
        const themeStyle = this.shadowRoot.querySelector('#themeStyle');
        const baseStyles = `
            :host {
                display: block;
                --console-spacing: 0px;
            }
            :host([height="full"]) {
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            .console {
                font-family: monospace;
                padding: 10px;
                overflow-y: auto;
                border-bottom: none;
                border-radius: 4px 4px 0 0;
                height: var(--console-height, 300px);
                margin-bottom: var(--console-spacing);
            }
            :host([height="full"]) .console {
                flex: 1;
            }
            .input {
                width: 100%;
                box-sizing: border-box;
                padding: 8px 10px;
                border-radius: 0 0 4px 4px;
                font-family: monospace;
            }
            .input:focus {
                outline: none;
                border-color: #0078d4;
            }
            .collapsible-button {
                display: inline-block;
                cursor: pointer;
                margin-left: 5px;
                transform: rotate(0deg); 
                transition: transform 0.2s;
                width: 12px;
                text-align: center;
            }
            .collapsible-button.expanded {
                transform: rotate(-90deg); 
            }
            .collapsible-content {
                display: none;
                margin-left: 20px;
                padding: 5px;
                margin-top: 5px;
                font-size: 0.9em;
                opacity: 0.8;
            }
            .collapsible-content.expanded {
                display: block;
            }
            .console pre {
                margin: 0.5em 0;
                padding: 0.5em;
                background: rgba(0,0,0,0.1);
                border-radius: 3px;
            }
            .console code {
                font-family: monospace;
                padding: 0.2em 0.4em;
                background: rgba(0,0,0,0.1);
                border-radius: 3px;
            }
            .message-error {
                color: var(--error-color, #ff0000);
            }
            .message-warning {
                color: var(--warning-color, #ffa500);
            }
            .message-info {
                color: var(--info-color, inherit);
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .spin {
                display: inline-block;
                animation: spin 1s linear infinite;
            }
            .success {
                color: #22c55e;
            }
            .copy-button {
                float: right;
                padding: 2px 6px;
                font-size: 12px;
                cursor: pointer;
                background: rgba(0,0,0,0.1);
                border: 1px solid rgba(0,0,0,0.2);
                border-radius: 3px;
                opacity: 0.7;
            }
            .copy-button:hover {
                opacity: 1;
            }
            .legend {
                display: flex;
                justify-content: space-between;
                padding: 6px 10px;
                font-size: 13px;
                opacity: 1;
                font-family: monospace;
                border-top: 1px solid rgba(128, 128, 128, 0.3);
                background: rgba(0, 0, 0, 0.1);
            }
            .legend-group {
                display: flex;
                gap: 16px;
            }
            .legend-item {
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .legend-item::before {
                content: attr(data-key);
                padding: 2px 8px;
                border: 1px solid currentColor;
                border-radius: 3px;
                font-size: 12px;
                font-weight: bold;
                background: rgba(255, 255, 255, 0.1);
            }
        `;

        if (theme === 'custom') {
            themeStyle.textContent = baseStyles + `
                .console {
                    background-color: var(--console-bg, #1e1e1e);
                    color: var(--console-text, #d4d4d4);
                    border: 1px solid var(--console-border, #333);
                }
                .input {
                    background-color: var(--input-bg, #3c3c3c);
                    color: var(--input-text, #d4d4d4);
                    border: 1px solid var(--input-border, #333);
                }
                .input:focus {
                    background-color: var(--input-focus-bg, #4a4a4a);
                    box-shadow: inset 0 0 0 1px #0078d4;
                }
                .prompt-message {
                    color: var(--prompt-color, #569cd6);
                }
                .collapsible-content {
                    border-left: 2px solid var(--console-border, #444);
                }
                .legend {
                    color: var(--console-text, #d4d4d4);
                    background: var(--input-bg, #3c3c3c);
                }
                --error-color: var(--console-error, #ff0000);
                --warning-color: var(--console-warning, #ffa500);
                --info-color: var(--console-text, #d4d4d4);
            `;
        } else if (theme === 'light') {
            themeStyle.textContent = baseStyles + `
                .console {
                    background-color: #ffffff;
                    color: #000000;
                    height: var(--console-height, 300px);
                    border: 1px solid #e0e0e0;
                }
                .input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 8px 10px;
                    background-color: #ffffff;
                    color: #000000;
                    border: 1px solid #e0e0e0;
                    border-radius: 0 0 4px 4px;
                    font-family: monospace;
                }
                .input:focus {
                    outline: none;
                    border-color: #0078d4;
                    background-color: #ffffff;
                    box-shadow: inset 0 0 0 1px #0078d4;
                }
                .prompt-message {
                    color: #0066cc;
                }
                .collapsible-content {
                    border-left: 2px solid #ccc;
                }
                .legend {
                    color: #333333;
                    background: #f0f0f0;
                }
                --error-color: #ff0000;
                --warning-color: #ffa500;
                --info-color: #000000;
            `;
        } else {
            themeStyle.textContent = baseStyles + `
                .console {
                    background-color: #1e1e1e;
                    color: #d4d4d4;
                    border: 1px solid #333;
                }
                .input {
                    background-color: #3c3c3c;
                    color: #d4d4d4;
                    border: 1px solid #333;
                }
                .input:focus {
                    background-color: #4a4a4a;
                    box-shadow: inset 0 0 0 1px #0078d4;
                }
                .prompt-message {
                    color: #569cd6;
                }
                .collapsible-content {
                    border-left: 2px solid #444;
                }
                .legend {
                    color: #e0e0e0;
                    background: #2d2d2d;
                }
                --error-color: #ff0000;
                --warning-color: #ffa500;
                --info-color: #d4d4d4;
            `;
        }
    }

    updateHeight(height) {
        const consoleOutput = this.shadowRoot.querySelector('#consoleOutput');
        if (height === 'full') {
            consoleOutput.style.height = '100%';
            this.style.height = '100%';
            this.style.display = 'flex';
            this.style.flexDirection = 'column';
        } else {
            consoleOutput.style.height = height || 'var(--console-height, 300px)';
            this.style.height = '';
            this.style.display = '';
        }
    }
}

customElements.define('web-console', WebConsole);
