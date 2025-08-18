# 🎤 JARVIS - Advanced AI Voice Assistant

## 🌟 Overview

JARVIS is a cutting-edge voice assistant that combines the power of multiple AI models with advanced web technologies. Built for modern browsers, it offers an intuitive voice-controlled interface with professional-grade features including real-time markdown rendering, multi-language support, and responsive design.
 
## ✨ Key Features

### 🤖 **Multi-AI Integration**
- **Google Gemini Pro** - Advanced reasoning and conversation
- **OpenAI GPT-4o-mini** - High-quality text generation
- **DeepSeek V3** - Specialized programming assistance
- **Smart Model Selection** - Automatic optimization per query type
- **Fallback System** - Seamless switching between providers

### 🎙️ **Advanced Voice Control**
- **Real-time Speech Recognition** using Artyom.js
- **Natural Text-to-Speech** with voice filtering
- **Multi-language Support** (English, Turkish, Spanish, French, German, Italian)
- **Smart Speech Management** - Prevents feedback loops
- **Voice Command Processing** - Website opening, search, conversation

### 📝 **Rich Content Rendering**
- **Live Markdown Support** - Real-time rendering with syntax highlighting
- **Code Block Optimization** - Responsive containers with proper formatting
- **XSS Protection** - Secure content sanitization
- **Copy-to-Clipboard** - Easy code sharing
- **Syntax Highlighting** - Multiple programming languages

### � **Developer Features**
- **No Framework Dependencies** - Pure JavaScript ES6+
- **Modular Architecture** - Easy to extend and customize
- **Environment Configuration** - Secure API key management
- **Error Handling** - Comprehensive debugging system
- **Performance Optimized** - Fast loading and smooth interactions

## � Quick Start

### Prerequisites
- Modern web browser with microphone support
- API keys for desired AI services
- Local development server

### 1. Clone & Setup
```bash
git clone https://github.com/akifgrape/jarvis-voice-assistant.git
cd jarvis-voice-assistant

# Copy environment template
cp .env.example .env
```

### 2. Configure API Keys
Edit your `.env` file:
```env
# Required: At least one API key
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here  # Optional
DEEPSEEK_API_KEY=your_deepseek_api_key_here  # Optional

# Optional: Custom endpoints
CUSTOM_AI_ENDPOINT=your_custom_endpoint  # Optional
```

### 3. Launch Application
```bash
# Start local server
python3 -m http.server 8080

# Or use Node.js
npx serve .

# Or use any preferred local server
```

### 4. Access Interface
Open `http://localhost:8080` in your browser and grant microphone permissions.

## 🎯 Usage Examples

### Voice Commands
```
"Hey JARVIS, open YouTube"          → Opens youtube.com
"Find pizza recipes"                → Searches and displays results
"Explain quantum computing"         → AI-powered explanation
"Switch to Turkish"                 → Changes interface language
"Clear conversation"                → Resets chat history
```

### Text Interface
- **Type questions** in the input field
- **Select AI model** from dropdown
- **Use markdown** for formatted responses
- **Copy code blocks** with built-in buttons

## 🔧 Configuration

### AI Model Settings
```javascript
// Customize AI personalities in app.js
const AI_MODELS = {
    'gemini': {
        name: 'Google Gemini Pro',
        systemPrompt: 'You are JARVIS, a helpful AI assistant...',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    },
    // Add more models...
};
```

### Voice Settings
```javascript
// Customize voice recognition
artyom.addCommands({
    indexes: ['open *', 'go to *'],
    smart: true,
    action: function(i, wildcard) {
        openWebsite(wildcard);
    }
});
```

## 🛠️ Advanced Features

### Smart Website Opening
```javascript
// Intelligent URL resolution
"Open Discord" → discord.com
"Go to GitHub" → github.com
"Open Gmail" → mail.google.com
```

### Markdown Rendering
- Real-time markdown parsing
- Syntax-highlighted code blocks
- Table rendering
- Link processing
- Image embedding

### Multi-language Support
- Dynamic language switching
- Localized speech recognition
- Regional voice preferences
- Cultural context awareness

## 🔐 Security

- **API Key Protection** - Environment-based configuration
- **XSS Prevention** - Content sanitization
- **CORS Handling** - Secure cross-origin requests
- **Input Validation** - Malicious content filtering

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the EPSL License - see the [LICENSE](LICENSE.md) file for details.

## Sources used

- **Artyom.js** - Speech recognition library
- **Google Gemini** - AI model provider
- **OpenAI** - GPT model access
- **DeepSeek** - Programming assistance
- **Marked.js** - Markdown parsing
- **Prism.js** - Syntax highlighting

---

<div align="center">

**Created with 🈲 by [Akif Grape](https://github.com/akifgrape)**

</div>
