require('dotenv').config();
const { createAIPost } = require('./index.js');
const fs = require('fs').promises;
const path = require('path');

// Array of topics to post about
const defaultTopics = [
  'sustainable living',
  'mental health',
  'workout motivation',
  'healthy recipes',
  'travel destinations',
  'productivity tips',
  'self-care routines',
  'tech innovations',
  'minimalist lifestyle',
  'book recommendations'
];

// Load topics from topics.json if it exists, otherwise use default topics
async function loadTopics() {
  try {
    const topicsFile = await fs.readFile(path.join(__dirname, 'topics.json'), 'utf8');
    return JSON.parse(topicsFile).topics;
  } catch (error) {
    console.log('Using default topics list');
    // Create topics file for future use
    await fs.writeFile(
      path.join(__dirname, 'topics.json'),
      JSON.stringify({ topics: defaultTopics }, null, 2)
    );
    return defaultTopics;
  }
}

// Track the last posted topic
async function getLastPostedIndex() {
  try {
    const statusFile = await fs.readFile(path.join(__dirname, 'status.json'), 'utf8');
    return JSON.parse(statusFile).lastPostedIndex;
  } catch (error) {
    return -1; // Start from the beginning
  }
}

// Update the last posted topic
async function updateLastPostedIndex(index) {
  await fs.writeFile(
    path.join(__dirname, 'status.json'),
    JSON.stringify({ lastPostedIndex: index, lastPostedAt: new Date().toISOString() }, null, 2)
  );
}

// Post with a specific interval
async function schedulePost() {
  try {
    const topics = await loadTopics();
    let lastIndex = await getLastPostedIndex();
    
    // Move to the next topic (circular)
    const currentIndex = (lastIndex + 1) % topics.length;
    const topic = topics[currentIndex];
    
    console.log(`Scheduled post #${currentIndex + 1}/${topics.length}: ${topic}`);
    
    // Create and post
    await createAIPost(topic);
    
    // Update status
    await updateLastPostedIndex(currentIndex);
  } catch (error) {
    console.error('Error in scheduled post:', error);
  }
}

// Define posting interval (in milliseconds)
const POST_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours default

// Run immediately once, then schedule
(async () => {
  try {
    // Check for command line arguments for immediate posting
    if (process.argv.includes('--post-now')) {
      console.log('Posting immediately...');
      await schedulePost();
    }
    
    // Set up recurring schedule
    console.log(`Setting up posting schedule every ${POST_INTERVAL/1000/60/60} hours`);
    setInterval(schedulePost, POST_INTERVAL);
  } catch (error) {
    console.error('Scheduler error:', error);
  }
})(); 