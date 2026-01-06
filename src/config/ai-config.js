/**
 * AI Configuration for ChemHelp
 * Manages API keys and settings for AI services
 */

require('dotenv').config();

const config = {
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: 'gemini-2.0-flash', // Current stable model
        visionModel: 'gemini-2.0-flash', // For image recognition
        maxTokens: 2048,
        temperature: 0.3, // Lower = more precise for chemistry
    },
    rateLimit: {
        maxRequestsPerMinute: 60,
        maxRequestsPerDay: 1500,
    },
    cache: {
        enabled: true,
        ttlSeconds: 3600, // 1 hour cache
    }
};

// Validate API key
function validateConfig() {
    if (!config.gemini.apiKey || config.gemini.apiKey === 'YOUR_API_KEY_HERE') {
        console.warn('⚠️  WARNING: Gemini API key not configured!');
        console.warn('   Please add your API key to .env file');
        console.warn('   Get one from: https://makersuite.google.com/app/apikey');
        return false;
    }
    return true;
}

module.exports = { config, validateConfig };
