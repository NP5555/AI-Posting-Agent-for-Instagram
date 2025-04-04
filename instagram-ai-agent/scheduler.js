require('dotenv').config();
const { createAIPost } = require('./index.js');
const fs = require('fs').promises;
const path = require('path');

// Safety configuration
const SAFETY_CONFIG = {
  maxDailyPosts: 5,              // Maximum posts per day
  minPostInterval: 2 * 60 * 60 * 1000,  // Minimum 2 hours between posts
  maxPostInterval: 4 * 60 * 60 * 1000,  // Maximum 4 hours between posts
  dailyActiveHours: {
    start: 9,  // 9 AM
    end: 21    // 9 PM
  }
};

// Array of topics to post about
const defaultTopics = [
  // Tech topics
  'futuristic city skyline at night',
  'cutting-edge tech workspace',
  'robotics revolution in industry',
  'smart home automation in action',
  'immersive virtual reality experience',
  // Fashion topics
  'high-fashion model in an urban setting',
  'charismatic entrepreneur in a luxury office',
  'influencer lifestyle with aesthetic visuals',
  'elegant cultural fashion and beauty',
  'powerful business leader portrait',
  // AI trends
  'AI-powered humanoid robot',
  'futuristic AI-generated art',
  'autonomous vehicles in a smart city',
  'AI-driven healthcare and diagnostics',
  'AI in creative industries like music & design'
];

// Load topics from topics.json if it exists, otherwise use default topics
async function loadTopics() {
  try {
    const topicsFile = await fs.readFile(path.join(__dirname, 'topics.json'), 'utf8');
    return JSON.parse(topicsFile).topics;
  } catch (error) {
    console.log('Using default topics list');
    await fs.writeFile(
      path.join(__dirname, 'topics.json'),
      JSON.stringify({ topics: defaultTopics }, null, 2)
    );
    return defaultTopics;
  }
}

// Track posting history
async function getPostingHistory() {
  try {
    const historyFile = await fs.readFile(path.join(__dirname, 'posting_history.json'), 'utf8');
    return JSON.parse(historyFile);
  } catch (error) {
    return {
      lastPostedIndex: -1,
      posts: [],
      dailyCount: 0,
      lastResetDate: new Date().toISOString().split('T')[0]
    };
  }
}

// Update posting history
async function updatePostingHistory(index) {
  const history = await getPostingHistory();
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Reset daily count if it's a new day
  if (history.lastResetDate !== currentDate) {
    history.dailyCount = 0;
    history.lastResetDate = currentDate;
  }
  
  history.lastPostedIndex = index;
  history.posts.push({
    timestamp: new Date().toISOString(),
    topicIndex: index
  });
  history.dailyCount += 1;
  
  // Keep only last 30 days of history
  history.posts = history.posts.filter(post => {
    const postDate = new Date(post.timestamp);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return postDate >= thirtyDaysAgo;
  });
  
  await fs.writeFile(
    path.join(__dirname, 'posting_history.json'),
    JSON.stringify(history, null, 2)
  );
  
  return history;
}

// Check if it's safe to post
function isSafeToPost(history) {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Check if within active hours
  if (currentHour < SAFETY_CONFIG.dailyActiveHours.start || 
      currentHour >= SAFETY_CONFIG.dailyActiveHours.end) {
    console.log('Outside of active posting hours');
    return false;
  }
  
  // Check daily post limit
  if (history.dailyCount >= SAFETY_CONFIG.maxDailyPosts) {
    console.log('Daily post limit reached');
    return false;
  }
  
  // Check last post interval
  if (history.posts.length > 0) {
    const lastPost = new Date(history.posts[history.posts.length - 1].timestamp);
    const timeSinceLastPost = now - lastPost;
    if (timeSinceLastPost < SAFETY_CONFIG.minPostInterval) {
      console.log('Too soon since last post');
      return false;
    }
  }
  
  return true;
}

// Get random interval between min and max
function getRandomInterval() {
  return Math.floor(
    Math.random() * 
    (SAFETY_CONFIG.maxPostInterval - SAFETY_CONFIG.minPostInterval) + 
    SAFETY_CONFIG.minPostInterval
  );
}

// Post with safety checks
async function schedulePost() {
  try {
    const topics = await loadTopics();
    const history = await getPostingHistory();
    
    if (!isSafeToPost(history)) {
      console.log('Skipping post due to safety constraints');
      return;
    }
    
    // Move to the next topic (circular)
    const currentIndex = (history.lastPostedIndex + 1) % topics.length;
    const topic = topics[currentIndex];
    
    console.log(`Scheduled post #${currentIndex + 1}/${topics.length}: ${topic}`);
    console.log(`Daily post count: ${history.dailyCount + 1}/${SAFETY_CONFIG.maxDailyPosts}`);
    
    // Create and post
    await createAIPost(topic);
    
    // Update history
    await updatePostingHistory(currentIndex);
    
    // Schedule next post with random interval
    const nextInterval = getRandomInterval();
    console.log(`Next post scheduled in ${Math.floor(nextInterval/1000/60)} minutes`);
    setTimeout(schedulePost, nextInterval);
    
  } catch (error) {
    console.error('Error in scheduled post:', error);
    // On error, wait 30 minutes before retrying
    setTimeout(schedulePost, 30 * 60 * 1000);
  }
}

// Start the scheduling process
(async () => {
  try {
    console.log('Starting Instagram AI Agent with safety measures');
    console.log(`Maximum ${SAFETY_CONFIG.maxDailyPosts} posts per day`);
    console.log(`Active hours: ${SAFETY_CONFIG.dailyActiveHours.start}:00 - ${SAFETY_CONFIG.dailyActiveHours.end}:00`);
    console.log(`Post interval: ${SAFETY_CONFIG.minPostInterval/1000/60/60}-${SAFETY_CONFIG.maxPostInterval/1000/60/60} hours`);
    
    // Initial post if requested
    if (process.argv.includes('--post-now')) {
      console.log('Creating initial post...');
      await schedulePost();
    } else {
      // Start with a random delay
      const initialDelay = Math.floor(Math.random() * SAFETY_CONFIG.minPostInterval);
      console.log(`Starting first post in ${Math.floor(initialDelay/1000/60)} minutes`);
      setTimeout(schedulePost, initialDelay);
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  }
})(); 