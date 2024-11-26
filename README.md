# Web Console Component Interface

A WebConsole available as a standard web component 


## Example Usage

```html
<!DOCTYPE html>
<html>
<head>
  <script src="web-console.js"></script>
</head>
<body>
  <web-console theme="dark" height="full" max-history="1000"></web-console>
  <script>
    const console = document.querySelector('web-console');
    console.log('Hello, World!', 'info');
    console.log('This is a warning!', 'warning');
    console.log('This is an error!', 'error');
    console.logCollapsed('This is the summary.', 'This is the detailed message.');
    console.logCollapsedMD('This is the summary.', 'This is the **detailed** message.');
    console.addEventListener('input-submit', e => {
      console.log(e.detail.input);
    });
  </script>
</body>
</html>
```

## Installation

1. Copy the `web-console.js` file to your project directory.

2. Include the script in your HTML file:
```html
<script src="web-console.js"></script>
```

3. Use the `<web-console>` element in your HTML file:
```html
<web-console></web-console>
```

## Browser Support

This component requires native support for custom elements (v1), Shadow DOM (v1), and ES6. It has been tested in the following browsers:

- Chrome 73+
- Firefox 63+
- Safari 12+
- Edge 18+

For browsers that do not support custom elements, you can use the [Web Components polyfills](

## Testing Instructions

To test the Web Console Component Interface locally, you can use the Python 3 HTTP server. Follow these steps:

1. Open a terminal and navigate to the directory containing your project files.

2. Start the HTTP server using the following command:
```
python -m http.server
```

## Attributes

- **prompt**: `string` (default: `>`)<br>
  The prompt character shown before user input.
- **placeholder**: `string` (default: `Type a command...`)<br>
  Placeholder text for the input field.
- **theme**: `'dark' | 'light' | 'custom'` (default: `dark`)<br>
  Console color theme.
- **height**: `string | 'full'` (default: `300px`)<br>
  Height of the console output area.
- **max-history**: `number` (default: `500`)<br>
  Maximum number of messages to keep in history.
- **content**: `string`<br>
  Initial content to display in the console.

## CSS Custom Properties (for custom theme)

- `--console-bg`: Console background color.
- `--console-text`: Console text color.
- `--console-border`: Console border color.
- `--input-bg`: Input background color.
- `--input-text`: Input text color.
- `--input-border`: Input border color.
- `--input-focus-bg`: Input background color when focused.
- `--prompt-color`: Color of the prompt messages.
- `--error-color`: Color for error messages.
- `--warning-color`: Color for warning messages.
- `--info-color`: Color for info messages.
- `--console-height`: Height of the console (when not using height attribute).

## Methods

- **log(message: string, type?: 'info' | 'warning' | 'error', isPrompt?: boolean)**<br>
  Logs a plain text message with optional type.
- **logHTML(message: string, type?: 'info' | 'warning' | 'error', isPrompt?: boolean)**<br>
  Logs a message with sanitized HTML formatting.
- **logMD(markdown: string, isError?: boolean)**<br>
  Logs a message with Markdown formatting.
- **logCollapsed(message: string, detailedMessage: string)**<br>
  Logs a collapsible message with plain text content.
- **logCollapsedMD(message: string, detailedMarkdown: string)**<br>
  Logs a collapsible message with Markdown content in details.

## Events

- **'input-submit'**<br>
  Fired when user submits input (press Enter).<br>
  `detail: { input: string }`

## Dependencies

- **marked.js**: For Markdown parsing.
- **DOMPurify**: For HTML sanitization.
