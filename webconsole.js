class WebConsole extends HTMLElement {
    constructor() {
        super();
        this.prompt = this.getAttribute('prompt') || '>';
        this.maxHistory = parseInt(this.getAttribute('max-history')) || 500;
        
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
            <input type="text" class="input" id="consoleInput" placeholder="Type a command...">
        `;
        
        // Set initial theme
        this.updateTheme(this.getAttribute('theme') || 'dark');
        
        // Display initial content if present
        if (initialContent) {
            setTimeout(() => this.log(initialContent), 0);
        }

        this._messageCounter = 0; // Add counter for unique IDs
    }

    static get observedAttributes() {
        return ['placeholder', 'theme', 'height', 'max-history', 'spacing'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'placeholder') {
            this.shadowRoot.querySelector('#consoleInput').placeholder = newValue;
        } else if (name === 'theme') {
            this.updateTheme(newValue);
        } else if (name === 'height') {
            this.updateHeight(newValue);
        } else if (name === 'max-history') {
            this.maxHistory = parseInt(newValue) || 500;
            this.trimHistory();
        } else if (name === 'spacing') {
            this.style.setProperty('--console-spacing', newValue || '0px');
        }
    }

    connectedCallback() {
        this.shadowRoot.querySelector('#consoleInput').addEventListener('keydown', this.handleInput.bind(this));
        this.shadowRoot.querySelector('#consoleInput').placeholder = this.getAttribute('placeholder') || 'Type a command...';
        this.updateTheme(this.getAttribute('theme') || 'dark');
    }

    handleInput(event) {
        if (event.key === 'Enter') {
            const input = event.target.value;
            this.log(`${this.prompt} ${input}`, false, true);
            event.target.value = '';
            // Dispatch a custom event with the input value
            this.dispatchEvent(new CustomEvent('input-submit', {
                detail: { input }
            }));
        }
    }

    trimHistory() {
        const consoleOutput = this.shadowRoot.querySelector('#consoleOutput');
        while (consoleOutput.children.length > this.maxHistory) {
            consoleOutput.removeChild(consoleOutput.firstChild);
        }
    }

    log(message, type = 'info', isPrompt = false) {
        const consoleOutput = this.shadowRoot.querySelector('#consoleOutput');
        const messageElement = document.createElement('div');
        const messageId = `msg-${this._messageCounter++}`;
        messageElement.id = messageId;
        
        const contentSpan = document.createElement('span');
        // Support both text and HTML content
        if (message.includes('<') && message.includes('>')) {
            contentSpan.innerHTML = DOMPurify.sanitize(message);
        } else {
            contentSpan.textContent = message;
        }
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
        if (newContent.includes('<') && newContent.includes('>')) {
            contentSpan.innerHTML = DOMPurify.sanitize(newContent);
        } else {
            contentSpan.textContent = newContent;
        }

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
        const button = document.createElement('span');
        button.textContent = '▼';  // Changed from ▶ to ▼
        button.className = 'collapsible-button';
        button.title = 'Click to expand';  // Add initial title
        
        const messageText = document.createElement('span');
        messageText.textContent = message;
        
        messageElement.appendChild(button);
        messageElement.appendChild(messageText);
        
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
        const button = document.createElement('span');
        button.textContent = '▼';
        button.className = 'collapsible-button';
        button.title = 'Click to expand';
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = messageText;  // Changed to use textContent instead of innerHTML
        
        messageElement.appendChild(button);
        messageElement.appendChild(messageSpan);
        
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
        const msgId = this.log(`${message} <span class="spin">⌛</span>`, 'info');

        try {
            const result = await callback();
            this.updateMessage(msgId, `${message} <span class="success">✅</span>`, 'info');
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
                margin-right: 5px;
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
