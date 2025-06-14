/**
 * Avantee's Romantic Adventure - Interactive Story Engine
 * 
 * This script manages the interactive story experience, including:
 * - Story data loading and management
 * - Scene transitions and choice handling
 * - Accessibility features and keyboard navigation
 * - Error handling and user feedback
 * - Reward system for different story endings
 * 
 * The story is designed to be deeply personal and romantic,
 * incorporating real memories and special moments.
 */

class RomanticAdventure {
    constructor() {
        // Story state management
        this.storyData = null;
        this.currentScene = null;
        this.sceneHistory = [];
        this.currentPage = 'homepage';
        this.isLoading = false;
        this.sessionId = null;
        this.choiceOrder = 0;

        // DOM element references
        this.elements = {
            // Pages
            homepage: document.getElementById('homepage'),
            storyPage: document.getElementById('story-page'),
            endPage: document.getElementById('end-page'),
            errorPage: document.getElementById('error-page'),

            // Story elements
            sceneTitle: document.getElementById('scene-title'),
            sceneCounter: document.getElementById('scene-counter'),
            storyText: document.getElementById('story-text'),
            choicesContainer: document.getElementById('choices-container'),
            loadingIndicator: document.getElementById('loading-indicator'),

            // End page elements
            endingTitle: document.getElementById('ending-title'),
            endingMessage: document.getElementById('ending-message'),
            rewardsContainer: document.getElementById('rewards-container'),

            // Buttons
            startAdventure: document.getElementById('start-adventure'),
            restartStory: document.getElementById('restart-story'),
            playAgain: document.getElementById('play-again'),
            backHome: document.getElementById('back-home'),
            retryButton: document.getElementById('retry-button'),
            homeButton: document.getElementById('home-button'),

            // Accessibility
            announcements: document.getElementById('announcements'),
            errorMessage: document.getElementById('error-message')
        };

        // Initialize the application
        this.init();
    }

    /**
     * Initialize the romantic adventure application
     * Sets up event listeners and prepares the interface
     */
    init() {
        console.log('Initializing Avantee\'s Romantic Adventure...');

        // Set up event listeners
        this.setupEventListeners();

        // Set up keyboard navigation
        this.setupKeyboardNavigation();

        // Show the homepage initially
        this.showPage('homepage');

        console.log('Application initialized successfully!');
    }

    /**
     * Set up all event listeners for interactive elements
     */
    setupEventListeners() {
        // Homepage navigation
        this.elements.startAdventure?.addEventListener('click', () => {
            this.startStory();
        });

        // Story navigation
        this.elements.restartStory?.addEventListener('click', () => {
            this.restartStory();
        });

        // End page navigation
        this.elements.playAgain?.addEventListener('click', () => {
            this.restartStory();
        });

        this.elements.backHome?.addEventListener('click', () => {
            this.goHome();
        });

        // Error page navigation
        this.elements.retryButton?.addEventListener('click', () => {
            this.startStory();
        });

        this.elements.homeButton?.addEventListener('click', () => {
            this.goHome();
        });
    }

    /**
     * Set up keyboard navigation for accessibility
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (event) => {
            // Escape key returns to homepage
            if (event.key === 'Escape') {
                this.goHome();
            }

            // Enter key on focused buttons
            if (event.key === 'Enter' && event.target.tagName === 'BUTTON') {
                event.target.click();
            }
        });
    }

    /**
     * Load story data from JSON file
     * Implements proper error handling and user feedback
     */
    async loadStoryData() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading(true);

        try {
            console.log('Loading story data...');

            const response = await fetch('story.json');

            if (!response.ok) {
                throw new Error(`Failed to load story: ${response.status} ${response.statusText}`);
            }

            this.storyData = await response.json();

            // Validate story data structure
            this.validateStoryData();

            console.log('Story data loaded successfully!');
            this.announceToScreenReader('Story loaded successfully');

            return true;

        } catch (error) {
            console.error('Error loading story data:', error);

            const errorMessage = this.getDetailedErrorMessage(error);
            this.showError(errorMessage);

            return false;

        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    /**
     * Validate the loaded story data structure
     * Ensures all required fields are present
     */
    validateStoryData() {
        if (!this.storyData) {
            throw new Error('Story data is null or undefined');
        }

        if (!this.storyData.scenes || !Array.isArray(this.storyData.scenes)) {
            throw new Error('Story data must contain a scenes array');
        }

        if (!this.storyData.endings || !Array.isArray(this.storyData.endings)) {
            throw new Error('Story data must contain an endings array');
        }

        if (!this.storyData.rewards || !Array.isArray(this.storyData.rewards)) {
            throw new Error('Story data must contain a rewards array');
        }

        // Validate that we have a starting scene
        const startScene = this.storyData.scenes.find(scene => scene.isStart);
        if (!startScene) {
            throw new Error('Story must have a scene marked as starting scene');
        }

        // Validate scene connections
        const sceneIds = new Set(this.storyData.scenes.map(scene => scene.id));
        const endingIds = new Set(this.storyData.endings.map(ending => ending.id));

        this.storyData.scenes.forEach(scene => {
            if (scene.choices) {
                scene.choices.forEach((choice, index) => {
                    if (choice.nextScene && !sceneIds.has(choice.nextScene)) {
                        console.warn(`Scene "${scene.id}" choice ${index} references unknown scene "${choice.nextScene}"`);
                    }
                    if (choice.ending && !endingIds.has(choice.ending)) {
                        console.warn(`Scene "${scene.id}" choice ${index} references unknown ending "${choice.ending}"`);
                    }
                });
            }
        });

        console.log('Story data validation complete - found', this.storyData.scenes.length, 'scenes and', this.storyData.endings.length, 'endings');
    }

    /**
     * Generate detailed error messages for better user experience
     */
    getDetailedErrorMessage(error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return 'Unable to load the story file. Please check your internet connection and try again.';
        }

        if (error.message.includes('404')) {
            return 'The story file could not be found. Please ensure all files are properly uploaded.';
        }

        if (error.message.includes('JSON')) {
            return 'The story file appears to be corrupted. Please check the story.json file format.';
        }

        return `An unexpected error occurred: ${error.message}. Please try again or contact support.`;
    }

    /**
     * Start the romantic story adventure
     */
    async startStory() {
        console.log('Starting the romantic adventure...');

        // Load story data if not already loaded
        if (!this.storyData) {
            const loaded = await this.loadStoryData();
            if (!loaded) return; // Error handling is done in loadStoryData
        }

        // Initialize database session
        await this.initializeSession();

        // Reset story state
        this.sceneHistory = [];
        this.currentScene = null;
        this.choiceOrder = 0;

        // Find and load the starting scene
        const startScene = this.storyData.scenes.find(scene => scene.isStart);
        if (!startScene) {
            this.showError('Could not find the starting scene of your love story. Please check the story configuration.');
            return;
        }

        // Show the story page and load the first scene
        this.showPage('story-page');
        this.loadScene(startScene.id);

        this.announceToScreenReader('Your romantic adventure has begun');
    }

    /**
     * Initialize database session for analytics
     */
    async initializeSession() {
        try {
            // Check if server is running first
            const response = await fetch('/api/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                this.sessionId = data.sessionId;
                console.log('Session initialized:', this.sessionId);
            } else {
                console.warn('Failed to initialize session - server may not be running');
            }
        } catch (error) {
            console.warn('Session initialization failed - continuing without database:', error.message);
            // Don't let database issues prevent the story from working
        }
    }

    /**
     * Load and display a specific story scene
     * @param {string} sceneId - The ID of the scene to load
     */
    async loadScene(sceneId) {
        console.log(`Loading scene: ${sceneId}`);

        // Don't load if already loading
        if (this.isLoading) {
            console.log('Scene load already in progress, skipping');
            return false;
        }

        // Set loading state to prevent interruptions
        this.isLoading = true;
        this.showLoading(true);

        try {
            // Ensure we have story data
            if (!this.storyData || !this.storyData.scenes) {
                console.error('Story data not available');
                this.showError('Story data is not available. Please try refreshing the page.');
                return false;
            }

            // Find the scene in the story data
            const scene = this.storyData.scenes.find(s => s.id === sceneId);

            if (!scene) {
                console.error(`Scene "${sceneId}" not found`);
                console.log('Available scenes:', this.storyData.scenes.map(s => s.id));
                this.showError(`Scene "${sceneId}" could not be found in your love story. Please check the story configuration.`);
                return false;
            }

            // Add current scene to history (for potential back navigation)
            if (this.currentScene && this.currentScene.id !== sceneId) {
                this.sceneHistory.push(this.currentScene);
            }

            this.currentScene = scene;

            // Make sure we're on the story page
            if (this.currentPage !== 'story-page') {
                this.showPage('story-page');
            }

            // Wait a moment for page transition
            await new Promise(resolve => setTimeout(resolve, 100));

            // Update the scene display
            this.displayScene(scene);

            // Update progress indicator
            this.updateProgress();

            this.announceToScreenReader(`Now experiencing: ${scene.title}`);

            console.log(`Successfully loaded scene: ${sceneId}`);
            return true;

        } catch (error) {
            console.error('Error loading scene:', error);
            this.showError(`An error occurred while loading the scene: ${error.message}`);
            return false;
        } finally {
            // Always clear loading state
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    /**
     * Display the current scene content and choices
     * @param {Object} scene - The scene object to display
     */
    displayScene(scene) {
        // Update scene title
        this.elements.sceneTitle.textContent = scene.title;

        // Update story text with fade animation
        this.elements.storyText.style.opacity = '0';

        setTimeout(() => {
            this.elements.storyText.innerHTML = this.formatStoryText(scene.content);
            this.elements.storyText.style.opacity = '1';
        }, 200);

        // Clear and populate choices
        this.clearChoices();

        if (scene.choices && scene.choices.length > 0) {
            setTimeout(() => {
                this.displayChoices(scene.choices);
            }, 400);
        } else if (scene.ending) {
            // This scene leads to an ending
            setTimeout(() => {
                this.showEnding(scene.ending);
            }, 1000);
        }
    }

    /**
     * Format story text with proper line breaks and emphasis
     * @param {string} text - The raw story text
     * @returns {string} - Formatted HTML text
     */
    formatStoryText(text) {
        return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => `<p>${this.addEmphasis(line)}</p>`)
            .join('');
    }

    /**
     * Add romantic emphasis to special words and phrases
     * @param {string} text - The text to enhance
     * @returns {string} - Text with emphasis markup
     */
    addEmphasis(text) {
        // Add emphasis to romantic words and Avantee's name
        const romanticWords = ['love', 'beautiful', 'perfect', 'amazing', 'wonderful', 'special', 'Avantee'];

        let formattedText = text;
        romanticWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            formattedText = formattedText.replace(regex, `<em style="color: #FF6F61; font-weight: 600;">$&</em>`);
        });

        return formattedText;
    }

    /**
     * Clear all existing choices from the display
     */
    clearChoices() {
        this.elements.choicesContainer.innerHTML = '';
        this.elements.choicesContainer.style.opacity = '0';
    }

    /**
     * Display choices for the current scene
     * @param {Array} choices - Array of choice objects
     */
    displayChoices(choices) {
        choices.forEach((choice, index) => {
            const button = this.createChoiceButton(choice, index);
            this.elements.choicesContainer.appendChild(button);
        });

        // Animate choices appearance
        this.elements.choicesContainer.style.opacity = '1';
    }

    /**
     * Create a choice button element
     * @param {Object} choice - The choice object
     * @param {number} index - The choice index for keyboard navigation
     * @returns {HTMLButtonElement} - The created button element
     */
    createChoiceButton(choice, index) {
        const button = document.createElement('button');
        button.className = 'choice-button';
        button.textContent = choice.text;
        button.setAttribute('aria-describedby', `choice-description-${index}`);

        // Add keyboard shortcut hint
        if (index < 9) {
            button.title = `Press ${index + 1} to select this choice`;

            // Add keyboard shortcut listener
            document.addEventListener('keydown', (event) => {
                if (event.key === (index + 1).toString() && this.currentPage === 'story-page') {
                    button.click();
                }
            });
        }

        // Handle choice selection
        button.addEventListener('click', (event) => {
            this.handleChoiceSelection(choice, event);
        });

        return button;
    }

    /**
     * Handle user choice selection
     * @param {Object} choice - The selected choice object
     */
    async handleChoiceSelection(choice, event) {
        console.log(`Choice selected: ${choice.text}`);

        // Prevent multiple rapid clicks
        if (this.isLoading) {
            console.log('Already processing a choice, ignoring');
            return;
        }

        this.announceToScreenReader(`You chose: ${choice.text}`);

        // Add visual feedback
        if (event && event.target) {
            event.target.style.transform = 'scale(0.95)';
            event.target.disabled = true; // Prevent multiple clicks
            setTimeout(() => {
                event.target.style.transform = '';
                event.target.disabled = false;
            }, 150);
        }

        // Track choice in database (don't let this block navigation)
        try {
            await this.trackChoice(choice);
        } catch (error) {
            console.warn('Choice tracking failed, but continuing:', error);
        }

        // Small delay to ensure visual feedback is seen
        await new Promise(resolve => setTimeout(resolve, 200));

        // Navigate to next scene or ending
        if (choice.ending) {
            this.showEnding(choice.ending);
        } else if (choice.nextScene) {
            // Ensure we have the scene before trying to load it
            const nextScene = this.storyData.scenes.find(s => s.id === choice.nextScene);
            if (nextScene) {
                await this.loadScene(choice.nextScene);
            } else {
                console.error(`Next scene "${choice.nextScene}" not found in story data`);
                console.log('Available scenes:', this.storyData.scenes.map(s => s.id));
                this.showError(`Scene "${choice.nextScene}" could not be found. The story may have a configuration error.`);
            }
        } else {
            this.showError('This choice does not lead anywhere. Please contact support.');
        }
    }

    /**
     * Track user choice in database
     * @param {Object} choice - The choice object to track
     */
    async trackChoice(choice) {
        if (!this.sessionId) {
            console.log('No session ID, skipping choice tracking');
            return;
        }

        try {
            this.choiceOrder++;

            // Set a reasonable timeout for the request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            const response = await fetch('/api/story/choice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    sceneId: this.currentScene.id,
                    choiceText: choice.text,
                    nextSceneId: choice.nextScene || choice.ending,
                    choiceOrder: this.choiceOrder
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const result = await response.json();
            if (!result.success) {
                console.warn('Failed to track choice:', result.error);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Choice tracking timed out, continuing story');
            } else {
                console.warn('Could not track choice:', error.message);
            }
            // Don't let tracking errors prevent story progression
        }
    }

    /**
     * Show an ending page with rewards
     * @param {string} endingId - The ID of the ending to show
     */
    showEnding(endingId) {
        console.log(`Showing ending: ${endingId}`);

        const ending = this.storyData.endings.find(e => e.id === endingId);

        if (!ending) {
            this.showError(`Ending "${endingId}" could not be found. Please check the story configuration.`);
            return;
        }

        // Show the end page
        this.showPage('end-page');

        // Display ending content
        this.displayEnding(ending);

        this.announceToScreenReader(`Story complete: ${ending.title}`);
    }

    /**
     * Display the ending content and rewards
     * @param {Object} ending - The ending object to display
     */
    displayEnding(ending) {
        // Update ending title
        this.elements.endingTitle.textContent = ending.title;

        // Update ending message
        this.elements.endingMessage.innerHTML = this.formatStoryText(ending.message);

        // Display associated rewards
        this.displayRewards(ending.rewards || []);
    }

    /**
     * Display downloadable rewards for the ending
     * @param {Array} rewardIds - Array of reward IDs to display
     */
    displayRewards(rewardIds) {
        this.elements.rewardsContainer.innerHTML = '';

        rewardIds.forEach(rewardId => {
            const reward = this.storyData.rewards.find(r => r.id === rewardId);
            if (reward) {
                const button = this.createRewardButton(reward);
                this.elements.rewardsContainer.appendChild(button);
            }
        });

        // If no specific rewards, show default rewards
        if (rewardIds.length === 0) {
            this.storyData.rewards.forEach(reward => {
                if (reward.isDefault) {
                    const button = this.createRewardButton(reward);
                    this.elements.rewardsContainer.appendChild(button);
                }
            });
        }
    }

    /**
     * Create a reward download button
     * @param {Object} reward - The reward object
     * @returns {HTMLButtonElement} - The created button element
     */
    createRewardButton(reward) {
        const button = document.createElement('button');
        button.className = 'reward-button';
        button.textContent = `📥 ${reward.title}`;
        button.title = reward.description;

        button.addEventListener('click', () => {
            this.downloadReward(reward);
        });

        return button;
    }

    /**
     * Handle reward download
     * @param {Object} reward - The reward object to download
     */
    downloadReward(reward) {
    console.log(`Downloading reward: ${reward.title}`);

    try {
        // Create a hidden download link
        const link = document.createElement('a');
        link.href = `./${reward.file}`;  // Ensure relative to root (important for GitHub Pages)
        link.setAttribute('download', reward.filename || reward.title);
        link.style.display = 'none';
        link.target = '_blank';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.announceToScreenReader(`Downloading ${reward.title}`);
    } catch (error) {
        console.error('Error downloading reward:', error);
        this.announceToScreenReader(`Error downloading ${reward.title}`);
    }
}


    /**
     * Update the progress indicator
     */
    updateProgress() {
        const sceneNumber = this.sceneHistory.length + 1;
        this.elements.sceneCounter.textContent = `Scene ${sceneNumber}`;
    }

    /**
     * Restart the story adventure
     */
    restartStory() {
        console.log('Restarting the romantic adventure...');

        this.sceneHistory = [];
        this.currentScene = null;

        this.announceToScreenReader('Restarting your romantic adventure');

        this.startStory();
    }

    /**
     * Return to the homepage
     */
    goHome() {
        console.log('Returning to homepage...');

        this.sceneHistory = [];
        this.currentScene = null;

        this.showPage('homepage');

        this.announceToScreenReader('Returned to homepage');
    }

    /**
     * Show a specific page and hide others
     * @param {string} pageId - The ID of the page to show
     */
    showPage(pageId) {
        console.log(`Showing page: ${pageId}`);

        // Hide all pages
        Object.values(this.elements).forEach(element => {
            if (element && element.classList.contains('page')) {
                element.classList.remove('active');
            }
        });

        // Show the requested page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;

            // Focus management for accessibility
            this.manageFocus(pageId);
        } else {
            console.error(`Page ${pageId} not found`);
        }
    }

    /**
     * Manage focus for accessibility when changing pages
     * @param {string} pageId - The ID of the page that was shown
     */
    manageFocus(pageId) {
        setTimeout(() => {
            let focusTarget;

            switch (pageId) {
                case 'homepage':
                    focusTarget = this.elements.startAdventure;
                    break;
                case 'story-page':
                    focusTarget = this.elements.sceneTitle;
                    break;
                case 'end-page':
                    focusTarget = this.elements.endingTitle;
                    break;
                case 'error-page':
                    focusTarget = this.elements.retryButton;
                    break;
            }

            if (focusTarget) {
                focusTarget.focus();
            }
        }, 100);
    }

    /**
     * Show loading indicator
     * @param {boolean} show - Whether to show or hide loading
     */
    showLoading(show) {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = show ? 'block' : 'none';
            this.elements.loadingIndicator.setAttribute('aria-hidden', (!show).toString());
        }
    }

    /**
     * Show error page with message
     * @param {string} message - The error message to display
     */
    showError(message) {
        console.error('Showing error:', message);

        // Always log the error for debugging
        console.error('Full error context:', {
            message,
            currentPage: this.currentPage,
            currentScene: this.currentScene?.id,
            isLoading: this.isLoading,
            hasStoryData: !!this.storyData
        });

        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }

        this.showPage('error-page');
        this.announceToScreenReader(`Error: ${message}`);
    }

    /**
     * Announce message to screen readers
     * @param {string} message - The message to announce
     */
    announceToScreenReader(message) {
        if (this.elements.announcements) {
            this.elements.announcements.textContent = message;

            // Clear after a delay to prevent accumulation
            setTimeout(() => {
                this.elements.announcements.textContent = '';
            }, 1000);
        }
    }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Avantee\'s Romantic Adventure...');

    // Create the application instance
    window.romanticAdventure = new RomanticAdventure();
});

// Handle any unhandled errors gracefully
window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);

    if (window.romanticAdventure) {
        window.romanticAdventure.showError(
            'An unexpected error occurred. Please refresh the page and try again.'
        );
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);

    if (window.romanticAdventure) {
        window.romanticAdventure.showError(
            'An unexpected error occurred while loading content. Please try again.'
        );
    }
});