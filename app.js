
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

// Wait for Artyom to load before initializing
let artyom = null;

// DOM elements - keeping it simple and clean
const micBtn = document.getElementById('mic-btn');
const statusDiv = document.getElementById('status');
const chatlogDiv = document.getElementById('chatlog');
const errorDiv = document.getElementById('error');
const userInput = document.getElementById('userinput');
const speakBtn = document.getElementById('speakbtn');

// Configuration for OpenAI API
// We'll check for this in multiple ways to be user-friendly
let OPENAI_API_KEY = null;

/**
 * Wait for Artyom to be available
 * Sometimes libraries take a moment to load
 */
function waitForArtyom() {
    return new Promise((resolve) => {
        if (typeof Artyom !== 'undefined') {
            artyom = new Artyom();
            resolve();
        } else {
            // Check every 100ms until Artyom is available
            const checkArtyom = setInterval(() => {
                if (typeof Artyom !== 'undefined') {
                    artyom = new Artyom();
                    clearInterval(checkArtyom);
                    resolve();
                }
            }, 100);
        }
    });
}

/**
 * Initialize the API key from various sources
 * First check environment, then localStorage, then prompt user
 */
function initializeAPI() {
    // Try to get from environment (if using a bundler)
    if (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY) {
        OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        return;
    }
    
    // Try localStorage for persistence
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey && storedKey !== 'null' && storedKey !== 'undefined') {
        OPENAI_API_KEY = storedKey;
        return;
    }
    
    // Show friendly message about missing API key
    showApiKeyRequired();
}

/**
 * Display a user-friendly message when API key is missing
 * Much better than cryptic error messages!
 */
function showApiKeyRequired() {
    errorDiv.style.display = 'block';
    errorDiv.innerHTML = `
        <strong>API Key Required</strong><br>
        To use AI features, you'll need an OpenAI API key.<br>
        <a href="https://platform.openai.com/api-keys" target="_blank" style="color: inherit; text-decoration: underline;">
            Get your key here
        </a>
    `;
    
    // Disable AI-related features gracefully
    statusDiv.textContent = 'Voice recognition available, AI responses disabled';
}

/**
 * Set up voice recognition with Artyom
 * Love how easy Artyom makes this, but we need to handle permissions!
 */
async function initializeVoiceRecognition() {
    // First check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
        return;
    }

    // Request microphone permission first
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
            lang: "en-US",           // English works best for most users
            continuous: true,        // Keep listening - more natural
            debug: false,           // Clean console in production
            listen: true,           // Start listening immediately
        });

        // Listen for any spoken input - wildcard matching is perfect here
        artyom.addCommands({
            indexes: ["*"],
            smart: true,            // Smart matching for better recognition
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
    // Clear any previous errors
    hideError();
    
    // Add to chat log immediately for better UX
    addMessageToChat("You", spokenText);
    
    // Update status to show we're processing
    statusDiv.textContent = 'Processing...';
    
    // Get AI response if we have an API key
    if (OPENAI_API_KEY) {
        getChatGPTResponse(spokenText);
    } else {
        // Graceful fallback - still provide some interaction
        const fallbackResponse = "I heard you say: " + spokenText + ". However, I need an API key to provide AI responses.";
        addMessageToChat("Jarvis", fallbackResponse);
        artyom.say(fallbackResponse);
        statusDiv.textContent = 'Ready';
    }
}

/**
 * Handle the microphone button click
 * Toggle listening state with visual feedback and better error handling
 */
micBtn.addEventListener('click', async function() {
    try {
        if (artyom && artyom.isRecognizing()) {
            // Stop listening
            artyom.fatality();
            statusDiv.textContent = 'Click microphone to start';
            micBtn.style.opacity = '0.6';
            micBtn.style.background = 'var(--secondary)';
            console.log('Voice recognition stopped');
        } else {
            // Check microphone permission again
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (error) {
                showError('Microphone access required. Please allow and refresh the page.');
                return;
            }

            // Start listening
            if (artyom) {
                await initializeVoiceRecognition();
                statusDiv.textContent = 'Listening... (speak now)';
                micBtn.style.opacity = '1';
                micBtn.style.background = 'var(--primary)';
                console.log('Voice recognition started');
                
                // Give user feedback
                setTimeout(() => {
                    if (artyom.isRecognizing()) {
                        statusDiv.textContent = 'Ready - I can hear you!';
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
    
    // Clear input and process message
    userInput.value = "";
    handleVoiceInput(userText);
});

// Allow Enter key to send message - expected behavior
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        speakBtn.click();
    }
});

/**
 * Add a message to the chat log
 * Keeps the conversation organized and readable
 */
function addMessageToChat(sender, message) {
    // Remove empty state if this is the first message
    const emptyState = chatlogDiv.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    // Create and add the message element
    const messageElement = document.createElement("p");
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatlogDiv.appendChild(messageElement);
    
    // Auto-scroll to bottom - better UX
    chatlogDiv.scrollTop = chatlogDiv.scrollHeight;
}

/**
 * Get response from ChatGPT API
 * This is where we talk to the AI!
 */
async function getChatGPTResponse(text) {
    hideError();
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',     // Good balance of speed and quality
                messages: [
                    {
                        role: 'system', 
                        content: 'You are Jarvis, a helpful and concise assistant. Keep responses brief and friendly.'
                    },
                    {
                        role: 'user', 
                        content: text
                    }
                ],
                max_tokens: 150,             // Keep responses manageable
                temperature: 0.7             // Some creativity, but not too much
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const aiResponse = data.choices[0].message.content.trim();
            
            // Add to chat and speak the response
            addMessageToChat("Jarvis", aiResponse);
            artyom.say(aiResponse);
            statusDiv.textContent = 'Ready';
        } else {
            throw new Error('Invalid response format from API');
        }
        
    } catch (error) {
        console.error('API Error:', error);
        
        // User-friendly error messages
        let errorMessage = 'Sorry, I encountered an issue.';
        
        if (error.message.includes('401')) {
            errorMessage = 'API key is invalid. Please check your configuration.';
        } else if (error.message.includes('429')) {
            errorMessage = 'API rate limit reached. Please try again in a moment.';
        } else if (error.message.includes('Network')) {
            errorMessage = 'Network error. Please check your connection.';
        }
        
        showError(errorMessage);
        statusDiv.textContent = 'Error occurred';
    }
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
 * Initialize the application
 * Set everything up when the page loads
 */
async function init() {
    // Wait for Artyom to be available first
    await waitForArtyom();
    
    // Try to set up API key
    initializeAPI();
    
    // Don't auto-start voice recognition, let user click the button
    // This is better for permissions and user experience
    
    // Set initial status
    statusDiv.textContent = 'Ready - click microphone to start listening';
    
    // Add some helpful info for first-time users
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
}

// Start everything when both DOM and Artyom are ready
document.addEventListener('DOMContentLoaded', init);
