
/**
 * Jarvis Voice Assistant
 * A clean, minimalist voice assistant built with Artyom.js and OpenAI
 * 
 * Features:
 * - Voice recognition for hands-free interaction
 * - AI-powered responses using ChatGPT
 * - Text-to-speech for audio feedback
 * - Simple, accessible interface
 * 
 * @author Akif Grape
 * @version 1.0.0
 */


let artyom = null;


function updateMicState(state) {
    const micBtn = document.getElementById('mic-btn');
    const icon = micBtn.querySelector('i');
    
    micBtn.classList.remove('listening', 'speaking', 'processing');
    
    switch(state) {
        case 'idle':
            icon.className = 'fas fa-microphone';
            break;
        case 'listening':
            micBtn.classList.add('listening');
            icon.className = 'fas fa-microphone';
            break;
        case 'processing':
            micBtn.classList.add('processing');
            icon.className = 'fas fa-spinner';
            break;
        case 'speaking':
            micBtn.classList.add('speaking');
            icon.className = 'fas fa-stop'; 
            break;
    }
    
    console.log(`🎤 Microphone state: ${state}`);
}


const micBtn = document.getElementById('mic-btn');
const statusDiv = document.getElementById('status');
const chatlogDiv = document.getElementById('chatlog');
const errorDiv = document.getElementById('error');
const userInput = document.getElementById('userinput');
const speakBtn = document.getElementById('speakbtn');
const aiModelSelect = document.getElementById('ai-model');
const languageSelect = document.getElementById('language-select');


let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000; 

// Multi-language support
let currentLanguage = 'en-US';
const languages = {
    'en-US': {
        name: 'English',
        listening: 'Listening... (speak now)',
        processing: 'Processing...',
        speaking: 'Speaking...',
        ready: 'Ready - Listening for your voice...',
        clickToStart: 'Click microphone to start',
        error: 'Error occurred. Please try again.',
        noApiKey: 'API key required for AI responses',
        micPermission: 'Microphone access required. Please allow and refresh the page.',
        voiceNotAvailable: 'Voice recognition not available. Please refresh the page.'
    },
    'tr-TR': {
        name: 'Türkçe',
        listening: 'Dinliyorum... (konuşabilirsiniz)',
        processing: 'İşleniyor...',
        speaking: 'Konuşuyorum...',
        ready: 'Hazır - Sesinizi bekliyorum...',
        clickToStart: 'Başlamak için mikrofona tıklayın',
        error: 'Hata oluştu. Lütfen tekrar deneyin.',
        noApiKey: 'AI yanıtları için API anahtarı gerekli',
        micPermission: 'Mikrofon erişimi gerekli. Lütfen izin verin ve sayfayı yenileyin.',
        voiceNotAvailable: 'Ses tanıma mevcut değil. Lütfen sayfayı yenileyin.'
    }
    // Other languages can be added here
};

// Multi-AI Configuration
let API_KEYS = {
    gemini: null,
    openai: null,
    deepseek: null
};

// Current selected model
let currentModel = 'gemini';

// Get localized text
function getText(key) {
    const langData = languages[currentLanguage] || languages['en-US'];
    return langData[key] || languages['en-US'][key] || key;
}

// Update language
function updateLanguage(newLang) {
    currentLanguage = newLang;
    console.log(`🌍 Language changed to: ${newLang}`);
    
    if (statusDiv.textContent.includes('Ready') || statusDiv.textContent.includes('Hazır')) {
        statusDiv.textContent = getText('ready');
    }
    
    localStorage.setItem('jarvis_language', currentLanguage);
}

/**
 * Wait for Artyom to be available
 * Sometimes libraries take a moment to load
 */
function waitForArtyom() {
    return new Promise((resolve, reject) => {
        if (typeof Artyom !== 'undefined') {
            artyom = new Artyom();
            console.log('✅ Artyom loaded successfully');
            resolve();
        } else {
            console.log('⏳ Waiting for Artyom to load...');
            let attempts = 0;
            const maxAttempts = 50; 
            const checkArtyom = setInterval(() => {
                attempts++;
                if (typeof Artyom !== 'undefined') {
                    artyom = new Artyom();
                    console.log('✅ Artyom loaded successfully');
                    clearInterval(checkArtyom);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkArtyom);
                    console.error('❌ Artyom failed to load after 5 seconds');
                    reject(new Error('Artyom library failed to load'));
                }
            }, 100);
        }
    });
}

/**
 * Load API keys from .env file (for development)
 * This helps with testing and development
 */
async function loadEnvKeys() {
    try {
        const response = await fetch('.env');
        if (response.ok) {
            const envText = await response.text();
            const envKeys = parseEnvFile(envText);
            
            Object.keys(envKeys).forEach(model => {
                if (envKeys[model] && !localStorage.getItem(`${model}_api_key`)) {
                    localStorage.setItem(`${model}_api_key`, envKeys[model]);
                    console.log(`✅ ${model.toUpperCase()} API key loaded from .env`);
                }
            });
        } else {
            console.info('📝 .env file not found - using existing localStorage keys or manual input');
        }
    } catch (error) {
        console.info('📝 .env file not accessible - using existing localStorage keys');
        
        const hasExistingKeys = localStorage.getItem('gemini_api_key') || 
                               localStorage.getItem('openai_api_key') || 
                               localStorage.getItem('deepseek_api_key');
        
        if (!hasExistingKeys) {
            console.warn('No API keys found. Please set API keys manually.');
        }
    }
}

/**
 * Parse .env file content
 */
function parseEnvFile(envText) {
    const envKeys = {
        gemini: null,
        openai: null,
        deepseek: null
    };
    
    const lines = envText.split('\n');
    lines.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
                const cleanKey = key.trim();
                const cleanValue = value.trim().replace(/["']/g, '');
                
                if (cleanKey === 'GEMINI_API_KEY') {
                    envKeys.gemini = cleanValue;
                } else if (cleanKey === 'OPENAI_API_KEY') {
                    envKeys.openai = cleanValue;
                } else if (cleanKey === 'DEEPSEEK_API_KEY') {
                    envKeys.deepseek = cleanValue;
                }
            }
        }
    });
    
    return envKeys;
}

/**
 * Prompt user to enter API keys manually
 */
function promptForApiKeys() {
    const models = ['gemini', 'openai', 'deepseek'];
    
    models.forEach(model => {
        if (!localStorage.getItem(`${model}_api_key`)) {
            const modelNames = {
                gemini: 'Google Gemini',
                openai: 'OpenAI GPT',
                deepseek: 'DeepSeek'
            };
            
            const apiKey = prompt(`Enter your ${modelNames[model]} API key (or leave empty to skip):`);
            if (apiKey && apiKey.trim()) {
                localStorage.setItem(`${model}_api_key`, apiKey.trim());
            }
        }
    });
}

/**
 * Initialize API keys for all models
 */
async function initializeAPI() {
    await loadEnvKeys();
    

    API_KEYS.gemini = localStorage.getItem('gemini_api_key');
    API_KEYS.openai = localStorage.getItem('openai_api_key');
    API_KEYS.deepseek = localStorage.getItem('deepseek_api_key');
    
    console.log('🔍 Debug - API Keys loaded:', {
        gemini: API_KEYS.gemini ? 'SET (' + API_KEYS.gemini.substring(0, 10) + '...)' : 'NOT SET',
        openai: API_KEYS.openai ? 'SET' : 'NOT SET',
        deepseek: API_KEYS.deepseek ? 'SET' : 'NOT SET'
    });
    
 
    currentModel = localStorage.getItem('selected_model') || 'gemini';
    if (aiModelSelect) {
        aiModelSelect.value = currentModel;
    }
    
    console.log('🤖 Current model:', currentModel);
    
  
    updateModelStatus();
}

/**
 * Update model status and show appropriate messages
 */
function updateModelStatus() {
    const hasCurrentKey = API_KEYS[currentModel];
    
    if (hasCurrentKey) {
        hideError();
        console.log(`✅ ${currentModel.toUpperCase()} API key configured:`, hasCurrentKey.substring(0, 10) + '...');
        statusDiv.textContent = `Ready with ${currentModel.toUpperCase()} - click microphone to start`;
    } else {
        console.log(`❌ ${currentModel.toUpperCase()} API key missing`);
        showApiKeyRequired();
    }
}

/**
 * Handle model selection change
 */
function handleModelChange() {
    currentModel = aiModelSelect.value;
    localStorage.setItem('selected_model', currentModel);
    updateModelStatus();
}

/**
 * Display a user-friendly message when API key is missing
 * Much better than cryptic error messages!
 */
function showApiKeyRequired() {
    const modelInfo = {
        gemini: {
            name: 'Google Gemini',
            url: 'https://makersuite.google.com/app/apikey',
            note: '(FREE!)'
        },
        openai: {
            name: 'OpenAI',
            url: 'https://platform.openai.com/api-keys',
            note: '(Paid)'
        },
        deepseek: {
            name: 'DeepSeek',
            url: 'https://platform.deepseek.com/api_keys',
            note: '(FREE!)'
        }
    };
    
    const info = modelInfo[currentModel];
    errorDiv.style.display = 'block';
    errorDiv.innerHTML = `
        <strong>API Key Required for ${info.name}</strong><br>
        ${info.note} Get your API key from:<br>
        <a href="${info.url}" target="_blank" style="color: inherit; text-decoration: underline;">
            ${info.url}
        </a><br>
        <small>Then set it: localStorage.setItem('${currentModel}_api_key', 'your_key_here')</small>
    `;
    
    
    statusDiv.textContent = 'Voice recognition available, AI responses disabled';
}

/**
 * Set up voice recognition with Artyom
 * Love how easy Artyom makes this, but we need to handle permissions!
 */
async function initializeVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
        return;
    }


    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
    } catch (error) {
        showError('Microphone permission denied. Please allow microphone access and refresh the page.');
        console.error('Microphone permission error:', error);
        return;
    }

    try {
        artyom.initialize({
            lang: currentLanguage,  
            continuous: false,     
            debug: false,          
            listen: true,           
            speed: 0.8,         
            volume: 1,            
            soundex: true,         
            executionKeyword: null, 
            obeyKeyword: null,      
        });

        artyom.addCommands({
            indexes: ["*"],
            smart: true,            
            action: function (i, wildcard) {
                handleVoiceInput(wildcard);
            },
        });

        console.log('Voice recognition initialized successfully');
        
    } catch (error) {
        console.error('Artyom initialization error:', error);
        showError('Failed to initialize voice recognition. Please refresh and try again.');
    }
}

/**
 * Handle voice input from the user
 * This is where the magic happens!
 */
function handleVoiceInput(spokenText) {
    hideError();
    
    if (!spokenText || spokenText.trim().length < 2) {
        console.log('🚫 Input too short, ignoring:', spokenText);
        updateMicState('listening');
        return;
    }

    const noise = ['a', 'ah', 'um', 'uh', 'hm', 'mm'];
    if (noise.includes(spokenText.trim().toLowerCase())) {
        console.log('🔇 Filtered noise input:', spokenText);
        updateMicState('listening');
        return;
    }
    
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        console.log('🛑 Stopped previous speech for new input');
    }

    if (window.currentListeningTimeout) {
        clearTimeout(window.currentListeningTimeout);
        window.currentListeningTimeout = null;
        console.log('Cleared auto-stop timeout - speech detected');
    }

    if (artyom && artyom.isRecognizing()) {
        artyom.fatality();
    }

    addMessageToChat("You", spokenText);
    
    updateMicState('processing');
    statusDiv.textContent = getText('processing');
    
    if (API_KEYS[currentModel]) {
        getAIResponse(spokenText);
    } else {
        const fallbackResponse = "I heard you say: " + spokenText + ". However, I need an API key to provide AI responses.";
        addMessageToChat("Jarvis", fallbackResponse);
        
        if (artyom.isRecognizing()) {
            artyom.fatality();
            statusDiv.textContent = 'Speaking...';
        }
        
        const utterance = new SpeechSynthesisUtterance(fallbackResponse);
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.lang = currentLanguage; 
        
        utterance.onstart = () => {
            updateMicState('speaking');
        };
        
        utterance.onend = () => {
            updateMicState('idle');
            statusDiv.textContent = getText('clickToStart');
            
            if (artyom && artyom.isRecognizing()) {
                artyom.fatality();
            }
        };
        
        speechSynthesis.speak(utterance);
    }
}

/**
 * Handle the microphone button click
 * Toggle listening state with visual feedback and better error handling
 */
micBtn.addEventListener('click', async function() {
    try {
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
            updateMicState('idle');
            statusDiv.textContent = getText('clickToStart');
            console.log('🛑 Speech stopped by user');
            return;
        }
        
        if (artyom && artyom.isRecognizing()) {
            artyom.fatality();
            
            if (window.currentListeningTimeout) {
                clearTimeout(window.currentListeningTimeout);
                window.currentListeningTimeout = null;
            }
            
            updateMicState('idle');
            statusDiv.textContent = getText('clickToStart');
            console.log('Voice recognition stopped');
        } else {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (error) {
                showError('Microphone access required. Please allow and refresh the page.');
                return;
            }

            if (artyom) {
                await initializeVoiceRecognition();
                updateMicState('listening');
                statusDiv.textContent = getText('listening');
                console.log('Voice recognition started');
                
                setTimeout(() => {
                    if (artyom.isRecognizing()) {
                        statusDiv.textContent = getText('ready');
                    }
                }, 2000);
            } else {
                showError('Voice recognition not available. Please refresh the page.');
            }
        }
    } catch (error) {
        console.error('Microphone button error:', error);
        showError('Error with microphone. Please refresh and try again.');
    }
});

/**
 * Handle text input - for when typing is preferred
 * Good accessibility practice!
 */
speakBtn.addEventListener("click", function () {
    const userText = userInput.value.trim();
    if (!userText) return;
    
    userInput.value = "";
    handleVoiceInput(userText);
});

userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        speakBtn.click();
    }
});

/**
 * Chat history management
 */
let chatHistory = [];

/**
 * Convert markdown to HTML
 * Supports basic markdown formatting and code blocks
 */
function markdownToHtml(text) {
    return text
        // Code blocks with language
        .replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
            const language = lang || 'text';
            return `<pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>`;
        })
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>');
}

/**
 * Escape HTML characters to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Add a message to the chat log with markdown support
 * Keeps the conversation organized and readable
 */
function addMessageToChat(sender, message) {
    const emptyState = chatlogDiv.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    // Add to history
    const messageData = {
        sender,
        message,
        timestamp: new Date().toISOString()
    };
    chatHistory.push(messageData);
    
    saveChatHistory();
    
    const messageElement = document.createElement("div");
    messageElement.className = `chat-message ${sender.toLowerCase()}`;
    
    const formattedMessage = sender.toLowerCase() === 'jarvis' ? markdownToHtml(message) : escapeHtml(message);
    messageElement.innerHTML = `<strong>${sender}:</strong> ${formattedMessage}`;
    
    chatlogDiv.appendChild(messageElement);
    
    chatlogDiv.scrollTop = chatlogDiv.scrollHeight;
}

/**
 * Save chat history to localStorage
 */
function saveChatHistory() {
    localStorage.setItem('jarvis_chat_history', JSON.stringify(chatHistory));
}

/**
 * Load chat history from localStorage
 */
function loadChatHistory() {
    const saved = localStorage.getItem('jarvis_chat_history');
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
            chatHistory.forEach(msg => {
                const messageElement = document.createElement("div");
                messageElement.className = `chat-message ${msg.sender.toLowerCase()}`;
                
                const formattedMessage = msg.sender.toLowerCase() === 'jarvis' ? markdownToHtml(msg.message) : escapeHtml(msg.message);
                messageElement.innerHTML = `<strong>${msg.sender}:</strong> ${formattedMessage}`;
                
                chatlogDiv.appendChild(messageElement);
            });
            
            const emptyState = chatlogDiv.querySelector('.empty-state');
            if (emptyState && chatHistory.length > 0) {
                emptyState.remove();
            }
            
            chatlogDiv.scrollTop = chatlogDiv.scrollHeight;
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }
}

/**
 * Clear chat history
 */
function clearChatHistory() {
    chatHistory = [];
    chatlogDiv.innerHTML = '';
    localStorage.removeItem('jarvis_chat_history');
    
    updateMicState('idle');
    
    const confirmElement = document.createElement("p");
    confirmElement.innerHTML = `<strong>System:</strong> Chat history cleared`;
    confirmElement.style.opacity = '0.6';
    confirmElement.style.fontStyle = 'italic';
    chatlogDiv.appendChild(confirmElement);
    
    setTimeout(() => {
        if (confirmElement.parentNode) {
            confirmElement.remove();
        }
    }, 3000);
}

/**
 * Universal AI Response Handler
 * Routes to appropriate AI model
 */
async function getAIResponse(text) {
    switch (currentModel) {
        case 'gemini':
            return await getGeminiResponse(text);
        case 'openai':
            return await getOpenAIResponse(text);
        case 'deepseek':
            return await getDeepSeekResponse(text);
        default:
            throw new Error(`Unknown model: ${currentModel}`);
    }
}

/**
 * Get response from Google Gemini API (FREE!)
 * This is where we talk to the AI!
 */
async function getGeminiResponse(text, retryCount = 0) {
    hideError();
    
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL && retryCount === 0) {
        const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        console.log(`⏳ Throttling: waiting ${waitTime}ms before request`);
        addMessageToChat("System", `⏳ Throttling requests to prevent rate limits. Waiting ${Math.ceil(waitTime/1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastRequestTime = Date.now();
    
    console.log('🔥 Gemini API Request Starting...');
    console.log('API Key:', API_KEYS.gemini ? 'Present' : 'Missing');
    console.log('Text:', text);
    
    try {
        const systemPrompt = `You are Jarvis, an advanced AI assistant with sophisticated capabilities. You can engage in natural, friendly conversations while providing expert-level assistance in software development, programming, and technical topics.

🚀 YOUR CORE CAPABILITIES:
- Advanced software and coding expertise: You can provide code examples, algorithm explanations, debugging help, refactoring advice, architectural recommendations, and much more.
- Natural, meaningful conversations: You engage in deep, empathetic dialogues on emotional, philosophical, or complex topics.
- Web navigation and search: You can open websites or find online resources when requested.
- Clear, step-by-step explanations when users need guidance.

🧠 DEEP CONVERSATIONS:
When users want meaningful discussions, you can sustain them naturally.
Examples:
- "How will AI affect humanity's future?"
- "What are your thoughts on loneliness?"
- "What defines happiness in your view?"

Even when discussing code or technical topics, you maintain a warm, natural dialogue with users.

💻 ADVANCED CODING SUPPORT:
When users ask detailed or advanced programming questions, you can help with:
- Algorithms, data structures
- Examples in various languages (Python, JavaScript, Java, C++, etc.)
- API usage, async operations, debugging
- Clean code, performance optimization, SOLID principles, design patterns
- Web development (frontend + backend), database queries

Examples:
- "How does useEffect work in React?" → Provide explanatory examples.
- "How to write an API endpoint in Python?" → Give Flask or FastAPI examples.
- "What is the N+1 problem in databases?" → Explain the technical term and suggest solutions.

🌐 WEBSITE OPENING:
When users clearly want to open a website, respond with:
"Opening [website name] for you! [LINK:https://example.com]"

🔍 SEARCH & FIND:
When users want to search for something:
"I found [what they're looking for] for you! [LINK:https://example.com] - [brief description]"

🧪 TECHNICAL NOTES:
When providing code:
- Use \`\`\` language tags for code blocks
- Add explanatory comments
- Specify the environment when necessary

💡 IMPORTANT:
Only use [LINK:https://...] for website opening or search requests.
For all other interactions, respond naturally and helpfully.

LANGUAGE ADAPTATION: Always respond in the same language the user is communicating in. If they speak Turkish, respond in Turkish. If English, respond in English. Match their language naturally.

User: ${text}`;

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEYS.gemini
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: systemPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            console.error('❌ API Response Error:', response.status, response.statusText);
            
            if (response.status === 429 && retryCount < 3) {
                const delay = Math.min(Math.pow(2, retryCount) * 2000, 8000); // 2s, 4s, 8s
                console.log(`⏳ Rate limited. Retrying in ${delay/1000}s... (attempt ${retryCount + 1}/3)`);
            
                updateMicState('processing');
                statusDiv.textContent = `⏳ Rate limited, retrying in ${(delay/1000).toFixed(0)}s...`;
            
                addMessageToChat("System", `⏳ API rate limit reached. Retrying in ${(delay/1000).toFixed(0)} seconds...`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return await getGeminiResponse(text, retryCount + 1);
            }
            
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        console.log('✅ API Response OK');
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const aiResponse = data.candidates[0].content.parts[0].text.trim();
            console.log('🎯 AI Response:', aiResponse);
            await handleAIResponse(aiResponse);
        } else {
            console.error('❌ Invalid response format:', data);
            throw new Error('Invalid response format from API');
        }
        
    } catch (error) {
        handleAIError(error);
    }
}

/**
 * Get response from OpenAI API (Updated format)
 */
async function getOpenAIResponse(text) {
    hideError();
    
    console.log('🤖 OpenAI API Request Starting...');
    console.log('API Key:', API_KEYS.openai ? 'Present' : 'Missing');
    console.log('Text:', text);
    
    try {
        const systemPrompt = `You are Jarvis, an advanced AI assistant with sophisticated capabilities. You can engage in natural, friendly conversations while providing expert-level assistance in software development, programming, and technical topics.

🚀 YOUR CORE CAPABILITIES:
- Advanced software and coding expertise: You can provide code examples, algorithm explanations, debugging help, refactoring advice, architectural recommendations, and much more.
- Natural, meaningful conversations: You engage in deep, empathetic dialogues on emotional, philosophical, or complex topics.
- Web navigation and search: You can open websites or find online resources when requested.
- Clear, step-by-step explanations when users need guidance.

🧠 DEEP CONVERSATIONS:
When users want meaningful discussions, you can sustain them naturally.
Examples:
- "How will AI affect humanity's future?"
- "What are your thoughts on loneliness?"
- "What defines happiness in your view?"

💻 ADVANCED CODING SUPPORT:
When users ask detailed or advanced programming questions, you can help with:
- Algorithms, data structures
- Examples in various languages (Python, JavaScript, Java, C++, etc.)
- API usage, async operations, debugging
- Clean code, performance optimization, SOLID principles, design patterns
- Web development (frontend + backend), database queries

🌐 WEBSITE OPENING:
When users clearly want to open a website, respond with:
"Opening [website name] for you! [LINK:https://example.com]"

🔍 SEARCH & FIND:
When users want to search for something:
"I found [what they're looking for] for you! [LINK:https://example.com] - [brief description]"

💡 IMPORTANT:
Only use [LINK:https://...] for website opening or search requests.
For all other interactions, respond naturally and helpfully.

LANGUAGE ADAPTATION: Always respond in the same language the user is communicating in. If they speak Turkish, respond in Turkish. If English, respond in English. Match their language naturally.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEYS.openai}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', 
                messages: [
                    { 
                        role: 'system', 
                        content: systemPrompt 
                    },
                    { 
                        role: 'user', 
                        content: text 
                    }
                ],
                max_tokens: 200,
                temperature: 0.7,
                stream: false
            })
        });

        if (!response.ok) {
            console.error('❌ OpenAI API Response Error:', response.status, response.statusText);
            const errorData = await response.text();
            console.error('Error details:', errorData);
            throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`);
        }

        console.log('✅ OpenAI API Response OK');
        const data = await response.json();
        console.log('📦 OpenAI Response data:', data);
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const aiResponse = data.choices[0].message.content.trim();
            console.log('🎯 OpenAI AI Response:', aiResponse);
            await handleAIResponse(aiResponse);
        } else {
            console.error('❌ Invalid OpenAI response format:', data);
            throw new Error('Invalid response format from OpenAI API');
        }
        
    } catch (error) {
        console.error('💥 OpenAI Error:', error);
        handleAIError(error);
    }
}

/**
 * Get response from DeepSeek API (FREE!)
 */
async function getDeepSeekResponse(text) {
    hideError();
    
    console.log('🧠 DeepSeek API Request Starting...');
    console.log('API Key:', API_KEYS.deepseek ? 'Present' : 'Missing');
    console.log('Text:', text);
    
    try {
        const systemPrompt = `You are Jarvis, an advanced AI assistant with sophisticated capabilities. You can engage in natural, friendly conversations while providing expert-level assistance in software development, programming, and technical topics.

🚀 YOUR CORE CAPABILITIES:
- Advanced software and coding expertise: You can provide code examples, algorithm explanations, debugging help, refactoring advice, architectural recommendations, and much more.
- Natural, meaningful conversations: You engage in deep, empathetic dialogues on emotional, philosophical, or complex topics.
- Web navigation and search: You can open websites or find online resources when requested.
- Clear, step-by-step explanations when users need guidance.

🧠 DEEP CONVERSATIONS:
When users want meaningful discussions, you can sustain them naturally.
Examples:
- "How will AI affect humanity's future?"
- "What are your thoughts on loneliness?"
- "What defines happiness in your view?"

💻 ADVANCED CODING SUPPORT:
When users ask detailed or advanced programming questions, you can help with:
- Algorithms, data structures
- Examples in various languages (Python, JavaScript, Java, C++, etc.)
- API usage, async operations, debugging
- Clean code, performance optimization, SOLID principles, design patterns
- Web development (frontend + backend), database queries

🌐 WEBSITE OPENING:
When users clearly want to open a website, respond with:
"Opening [website name] for you! [LINK:https://example.com]"

🔍 SEARCH & FIND:
When users want to search for something:
"I found [what they're looking for] for you! [LINK:https://example.com] - [brief description]"

💡 IMPORTANT:
Only use [LINK:https://...] for website opening or search requests.
For all other interactions, respond naturally and helpfully.

LANGUAGE ADAPTATION: Always respond in the same language the user is communicating in. If they speak Turkish, respond in Turkish. If English, respond in English. Match their language naturally.`;

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEYS.deepseek}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                max_tokens: 200,
                temperature: 0.7,
                stream: false
            })
        });

        if (!response.ok) {
            console.error('❌ DeepSeek API Response Error:', response.status, response.statusText);
            const errorData = await response.text();
            console.error('Error details:', errorData);
            throw new Error(`DeepSeek API Error: ${response.status} ${response.statusText}`);
        }

        console.log('✅ DeepSeek API Response OK');
        const data = await response.json();
        console.log('📦 DeepSeek Response data:', data);
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const aiResponse = data.choices[0].message.content.trim();
            console.log('🎯 DeepSeek AI Response:', aiResponse);
            await handleAIResponse(aiResponse);
        } else {
            console.error('❌ Invalid DeepSeek response format:', data);
            throw new Error('Invalid response format from DeepSeek API');
        }
        
    } catch (error) {
        console.error('💥 DeepSeek Error:', error);
        handleAIError(error);
    }
}

/**
 * Handle AI response (common for all models)
 */
async function handleAIResponse(aiResponse) {
    let responseToSpeak = aiResponse;
    
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        console.log('🛑 Stopped previous speech for new response');
    }
    
    const linkMatch = aiResponse.match(/\[LINK:(https?:\/\/[^\]]+)\]/);
    if (linkMatch) {
        const url = linkMatch[1];
        const cleanResponse = aiResponse.replace(/\[LINK:[^\]]+\]/, '').trim();
        
        addMessageToChat("Jarvis", cleanResponse);
        responseToSpeak = cleanResponse;
        
        console.log('🔗 Attempting to open URL:', url);
        try {
            const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
            if (newWindow) {
                console.log('✅ New window opened successfully');
                newWindow.focus();
            } else {
                console.warn('⚠️ Window.open returned null - popup might be blocked');
                addMessageToChat("System", "Please allow popups for this site or manually visit: " + url);
            }
        } catch (error) {
            console.error('❌ Error opening window:', error)
            addMessageToChat("System", "Could not open link automatically. Please visit: " + url);
        }
    } else {
        addMessageToChat("Jarvis", aiResponse);
    }

    responseToSpeak = responseToSpeak
        // Remove code blocks (```...```)
        .replace(/```[\s\S]*?```/g, ' [code blocks] ')
        // Remove inline code (`...`)
        .replace(/`[^`]+`/g, ' [code] ')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        .trim();

    if (artyom.isRecognizing()) {
        artyom.fatality();
        statusDiv.textContent = 'Speaking...';
    }
    
    const utterance = new SpeechSynthesisUtterance(responseToSpeak);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.lang = currentLanguage; 
    
    utterance.onstart = () => {
        console.log('🎤 Speech started');
        updateMicState('speaking');
    };
    
    utterance.onend = () => {
        console.log('🎤 Speech ended, stopping listening');
        updateMicState('idle');
        statusDiv.textContent = getText('clickToStart');
        
        if (artyom && artyom.isRecognizing()) {
            artyom.fatality();
        }
    };
    
    utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        updateMicState('idle');
        statusDiv.textContent = getText('clickToStart');
        
        if (artyom && artyom.isRecognizing()) {
            artyom.fatality();
        }
    };
    
    speechSynthesis.speak(utterance);
}

/**
 * Handle AI errors (common for all models)
 */
function handleAIError(error) {
    console.error('AI API Error:', error);
    console.error('Current model:', currentModel);
    console.error('API key present:', !!API_KEYS[currentModel]);
    
    let errorMessage = 'Sorry, I encountered an issue.';
    
    if (error.message.includes('401')) {
        errorMessage = `🔑 ${currentModel.toUpperCase()} API key is invalid. Please check your configuration.`;
    } else if (error.message.includes('429')) {
        errorMessage = '🚨 API rate limit exceeded. Try switching to a different AI model or wait a few minutes before trying again.';
        
        const availableModels = Object.keys(API_KEYS).filter(model => API_KEYS[model] && model !== currentModel);
        if (availableModels.length > 0) {
            errorMessage += ` Available alternatives: ${availableModels.join(', ').toUpperCase()}`;
        }
    } else if (error.message.includes('Network')) {
        errorMessage = '🌐 Network error. Please check your internet connection.';
    } else if (error.message.includes('400')) {
        errorMessage = `⚠️ ${currentModel.toUpperCase()} API request error. Check API key and request format.`;
    } else if (error.message.includes('403')) {
        errorMessage = `🚫 ${currentModel.toUpperCase()} API access forbidden. Check your API key permissions.`;
    } else {
        errorMessage = `❌ ${error.message}`;
    }
    
    showError(errorMessage);
    statusDiv.textContent = getText('errorOccurred') || 'Error occurred';
    
    addMessageToChat("System", `Error: ${errorMessage}`);
    
    if (error.message.includes('429')) {
        provideFallbackResponse();
    }
}

/**
 * Provide a local fallback response when API is unavailable
 */
function provideFallbackResponse() {
    const fallbackResponses = [
        "I'm experiencing high API usage right now. Try asking me to 'open' a website or wait a moment for the AI to be available.",
        "API services are busy. I can still help you navigate to websites! Try saying 'open YouTube' or 'go to GitHub'.",
        "The AI service is temporarily overloaded. You can still use voice commands like 'open Eighred' or 'find pizza recipes'.",
        "API rate limit reached. While we wait, you can use navigation commands like 'open [website name]'."
    ];
    
    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    setTimeout(() => {
        addMessageToChat("Jarvis", randomResponse);
        
        const utterance = new SpeechSynthesisUtterance(randomResponse);
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.lang = currentLanguage;
        speechSynthesis.speak(utterance);
        
        updateMicState('idle');
        statusDiv.textContent = getText('clickToStart') || 'Click to start';
    }, 1000);
}

/**
 * Show error message to user
 * Better than just console.error!
 */
function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

/**
 * Hide error message
 * Clean up the UI when things are working
 */
function hideError() {
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
}

/**
 * Start listening for voice commands
 * Helper function to restart voice recognition after speaking
 */
async function startListening() {
    if (artyom && !artyom.isRecognizing()) {
        try {
            await initializeVoiceRecognition();
            updateMicState('listening');
            statusDiv.textContent = getText('listening');
            console.log('Voice recognition started - will auto-stop in 10 seconds');
            
            const autoStopTimeout = setTimeout(() => {
                if (artyom && artyom.isRecognizing()) {
                    console.log('Auto-stopping voice recognition after 10 seconds');
                    artyom.fatality();
                    updateMicState('idle');
                    statusDiv.textContent = getText('clickToStart');
                }
            }, 10000); 
            window.currentListeningTimeout = autoStopTimeout;
            
        } catch (error) {
            console.error('Failed to restart listening:', error);
            updateMicState('idle');
            statusDiv.textContent = getText('clickToStart');
        }
    }
}

/**
 * Main initialization function
 * Sets up the assistant when page loads
 */
async function init() {
    try {
        await waitForArtyom();
        
        await initializeAPI();
        
        loadChatHistory();
    
        const savedLanguage = localStorage.getItem('jarvis_language');
        if (savedLanguage && languages[savedLanguage]) {
        currentLanguage = savedLanguage;
        languageSelect.value = savedLanguage;
    }
    
    if (aiModelSelect) {
        aiModelSelect.addEventListener('change', handleModelChange);
    }
    
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            updateLanguage(this.value);
            // Reinitialize voice recognition with new language
            if (artyom && artyom.isRecognizing()) {
                artyom.fatality();
                setTimeout(() => {
                    initializeVoiceRecognition();
                }, 500);
            }
        });
    }
    
    const clearChatBtn = document.getElementById('clear-chat');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', clearChatHistory);
    }
    
    statusDiv.textContent = getText('clickToStart');
    
    if (!localStorage.getItem('jarvis_used_before')) {
        setTimeout(() => {
            if (!errorDiv.style.display || errorDiv.style.display === 'none') {
                errorDiv.style.display = 'block';
                errorDiv.style.background = 'rgba(0, 150, 255, 0.1)';
                errorDiv.style.color = 'var(--foreground)';
                errorDiv.style.border = '1px solid rgba(0, 150, 255, 0.2)';
                errorDiv.innerHTML = 'First time? Click the microphone button and allow microphone access when prompted.';
                
                setTimeout(() => {
                    errorDiv.style.display = 'none';
                    localStorage.setItem('jarvis_used_before', 'true');
                }, 5000);
            }
        }, 1000);
    }
    
    } catch (error) {
        console.error('❌ Failed to initialize Jarvis:', error);
        
        if (statusDiv) {
            statusDiv.textContent = 'Error: Voice recognition not available';
        }
        
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.innerHTML = 'Voice recognition failed to load. Please refresh the page or check your internet connection.';
        }
    
        if (micBtn) {
            micBtn.disabled = true;
            micBtn.style.opacity = '0.3';
            updateMicState('idle');
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
