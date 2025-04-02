require('dotenv').config();
const { IgApiClient } = require('instagram-private-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs').promises;

// Instagram client setup
const ig = new IgApiClient();

// Gemini AI configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Instagram login function
async function login() {
  try {
    ig.state.generateDevice(process.env.INSTAGRAM_USERNAME);
    await ig.account.login(process.env.INSTAGRAM_USERNAME, process.env.INSTAGRAM_PASSWORD);
    console.log('Successfully logged into Instagram');
    return ig;
  } catch (error) {
    console.error('Instagram login error:', error);
    throw error;
  }
}

// AI content generation using Gemini instead of OpenAI
async function generatePostContent(topic) {
  try {
    // Get the generative model - using gemini-1.5-flash instead of gemini-pro
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Generate content
    const prompt = `Generate an engaging Instagram post about ${topic}. 
    Include a catchy caption and 5 relevant hashtags.
    Format your response as a simple text without markdown, formatting instructions or image descriptions.
    Don't use labels like "Caption:" or "Hashtags:", just provide the ready-to-post text.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean up the text by removing any markdown or formatting tags
    text = text.replace(/\*\*|\*|\#\#|\#\#\#|\`|\`\`\`|Image\:.*?\)/g, '')
               .replace(/Caption\:|Hashtags\:/gi, '')
               .replace(/^\s*[\r\n]/gm, '\n')
               .trim();
    
    return text;
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    // Fallback content in case of API issues
    return `Check out this amazing post about ${topic}! #${topic.replace(' ', '')} #instagram #post #content #ai`;
  }
}

// Image processing
async function getAndProcessImage(query) {
  try {
    // Using Unsplash as a free image source with updated credentials
    const response = await axios.get(
      `https://api.unsplash.com/photos/random?query=${query}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
    );
    const imageUrl = response.data.urls.regular;
    const photographer = response.data.user.name;
    
    console.log(`Image by: ${photographer} on Unsplash`);
    
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data, 'binary');
    
    // Make sure images directory exists
    try {
      await fs.mkdir('./images', { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // Save the original image for reference
    await fs.writeFile(`./images/${query.replace(/\s+/g, '_')}_original.jpg`, imageBuffer);
    
    // Resize to Instagram recommended size (1080x1080 for square posts)
    const processedImage = await sharp(imageBuffer)
      .resize(1080, 1080, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toBuffer();
      
    // Save the processed image for reference
    await fs.writeFile(`./images/${query.replace(/\s+/g, '_')}_processed.jpg`, processedImage);
    
    return processedImage;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

// Post to Instagram
async function postToInstagram(ig, caption, imageBuffer) {
  try {
    const publishResult = await ig.publish.photo({
      file: imageBuffer,
      caption: caption,
    });
    
    return publishResult;
  } catch (error) {
    console.error('Error posting to Instagram:', error);
    throw error;
  }
}

// Main function to create and post content
async function createAIPost(topic) {
  try {
    console.log(`Creating AI post about: ${topic}`);
    
    // Authenticate
    const ig = await login();
    
    // Generate content
    console.log('Generating content with Gemini AI...');
    const postContent = await generatePostContent(topic);
    console.log('Generated caption:', postContent);
    
    // Get and process image
    console.log('Processing image from Unsplash...');
    const imageBuffer = await getAndProcessImage(topic);
    console.log('Image processed successfully');
    
    // Post to Instagram with rate limiting considerations
    console.log('Posting to Instagram...');
    const result = await postToInstagram(ig, postContent, imageBuffer);
    
    console.log('Post created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

// Export the createAIPost function for use in scheduler.js
module.exports = {
  createAIPost
};

// Run directly if called from command line
if (require.main === module) {
  // Wrap in async IIFE to use await at the top level
  (async () => {
    try {
      if (process.argv.length > 2) {
        // Get topic from command line arguments
        const topic = process.argv.slice(2).join(' ');
        await createAIPost(topic);
      } else {
        console.log('Please provide a topic as a command line argument');
        console.log('Example: node index.js sustainable living');
      }
    } catch (error) {
      console.error('Application error:', error);
    }
  })();
} 