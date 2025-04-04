require('dotenv').config();
const { IgApiClient } = require('instagram-private-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs').promises;

// Instagram client setup
const ig = new IgApiClient();

// Define themes for image generation
// const THEMES = [
//   {
//     category: 'nature',
//     topics: [
//       'beautiful mountain landscape',
//       'serene ocean sunset',
//       'lush forest path',
//       'colorful flower garden',
//       'peaceful lake reflection',
//       'majestic waterfall',
//       'starry night sky',
//       'autumn forest colors',
//       'tropical beach paradise',
//       'snowy mountain peak'
//     ]
//   },
//   {
//     category: 'tech',
//     topics: [
//       'futuristic city skyline',
//       'modern tech workspace',
//       'innovative robotics',
//       'smart home technology',
//       'virtual reality experience',
//       'artificial intelligence concept',
//       'sustainable energy tech',
//       'space exploration technology',
//       'digital transformation',
//       'cyber security concept'
//     ]
//   },
//   {
//     category: 'people',
//     topics: [
//       'diverse group of friends',
//       'professional team collaboration',
//       'creative artist at work',
//       'athletic achievement moment',
//       'cultural celebration gathering',
//       'family bonding moment',
//       'entrepreneur success story',
//       'community service project',
//       'educational learning environment',
//       'wellness and mindfulness practice'
//     ]
//   }
// ];
const THEMES = [
  {
    category: 'tech',
    topics: [
      'futuristic city skyline at night',
      'cutting-edge tech workspace',
      'robotics revolution in industry',
      'smart home automation in action',
      'immersive virtual reality experience',
      'artificial intelligence shaping the future',
      'next-gen sustainable energy innovations',
      'deep space exploration and technology',
      'digital transformation in business',
      'cybersecurity and data protection'
    ]
  },
  {
    category: 'beautiful people',
    topics: [
      'high-fashion model in an urban setting',
      'charismatic entrepreneur in a luxury office',
      'influencer lifestyle with aesthetic visuals',
      'captivating fitness model in motion',
      'elegant cultural fashion and beauty',
      'powerful business leader portrait',
      'stunning cinematic portrait photography',
      'glamorous red carpet moment',
      'artistic beauty shot with vibrant lighting',
      'confident personality in a modern backdrop'
    ]
  },
  {
    category: 'AI trends',
    topics: [
      'AI-powered humanoid robot',
      'neural networks and deep learning visualization',
      'futuristic AI-generated art',
      'autonomous vehicles in a smart city',
      'AI-driven healthcare and diagnostics',
      'AI in creative industries like music & design',
      'machine learning algorithms in action',
      'ethical AI and responsible technology',
      'AI-driven personal assistants',
      'quantum computing and the future of AI'
    ]
  }
];

// Gemini AI configuration with retry logic
let genAI;
async function initializeGemini() {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    await model.generateContent("Test connection");
    console.log('Successfully initialized Gemini AI');
    return genAI;
  } catch (error) {
    if (error.message.includes('SERVICE_DISABLED')) {
      console.error('\nGemini API is not enabled. Please follow these steps:');
      console.error('1. Visit: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=673584019186');
      console.error('2. Enable the Generative Language API');
      console.error('3. Wait a few minutes for the changes to propagate');
      console.error('\nRetrying in 30 seconds...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      return initializeGemini();
    }
    throw error;
  }
}

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

// AI content generation using Gemini
async function generatePostContent(topic, category) {
  try {
    if (!genAI) {
      genAI = await initializeGemini();
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Create an engaging Instagram post about "${topic}" in the ${category} category.
    The post should have:
    1. A compelling caption (2-3 sentences)
    2. 5 relevant hashtags
    
    Format the response as:
    [CAPTION]
    [HASHTAGS]
    
    Example format:
    The future of technology is here! This cutting-edge workspace showcases the perfect blend of innovation and design. Where will your next breakthrough happen?
    #TechInnovation #FutureOfWork #DigitalTransformation #SmartWorkspace #TechTrends
    
    Make sure to:
    - Keep the caption engaging and relevant to the topic
    - Use hashtags that are specific to the category and topic
    - Don't include any other text or formatting`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean up the response
    text = text.replace(/\*\*|\*|\#\#|\#\#\#|\`|\`\`\`|Image\:.*?\)/g, '')
               .replace(/Caption\:|Hashtags\:/gi, '')
               .replace(/^\s*[\r\n]/gm, '\n')
               .trim();
    
    // Ensure we have both caption and hashtags
    if (!text.includes('#')) {
      // If no hashtags found, add default ones
      const defaultHashtags = `#${category.replace(/\s+/g, '')} #${topic.replace(/\s+/g, '')} #instagram #trending #viral`;
      text = `${text}\n\n${defaultHashtags}`;
    }
    
    // Ensure proper spacing between caption and hashtags
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return text;
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    // Fallback content with proper formatting
    return `Check out this amazing ${category} post about ${topic}! The future is here, and it's more exciting than ever.\n\n#${category.replace(/\s+/g, '')} #${topic.replace(/\s+/g, '')} #instagram #trending #viral`;
  }
}

// Image generation using Unsplash API
async function getAndProcessImage(query) {
  try {
    // Using Unsplash API to get relevant images
    const response = await axios.get(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        }
      }
    );

    const imageUrl = response.data.urls.regular;
    const photographer = response.data.user.name;
    const photographerUrl = response.data.user.links.html;
    
    console.log(`Image by: ${photographer} on Unsplash (${photographerUrl})`);

    // Download the image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);

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

    return {
      imageBuffer: processedImage,
      photographer,
      photographerUrl
    };
  } catch (error) {
    console.error('Error processing image:', error);
    return createFallbackImage(query);
  }
}

// Create a fallback image with text when image generation fails
async function createFallbackImage(query) {
  try {
    const width = 1080;
    const height = 1080;
    const svgImage = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" font-family="Arial" font-size="48" fill="#333" text-anchor="middle" dominant-baseline="middle">
          ${query}
        </text>
      </svg>
    `;

    const imageBuffer = await sharp(Buffer.from(svgImage))
      .resize(1080, 1080)
      .jpeg({ quality: 90 })
      .toBuffer();

    return {
      imageBuffer,
      photographer: 'AI Generated',
      photographerUrl: ''
    };
  } catch (error) {
    console.error('Error creating fallback image:', error);
    throw error;
  }
}

// Post to Instagram
async function postToInstagram(ig, caption, imageBuffer, photographer, photographerUrl) {
  try {
    // Add photographer credit to caption
    const fullCaption = `${caption}\n\nPhoto by ${photographer} on Unsplash${photographerUrl ? ` (${photographerUrl})` : ''}`;
    
    const publishResult = await ig.publish.photo({
      file: imageBuffer,
      caption: fullCaption,
    });
    
    return publishResult;
  } catch (error) {
    console.error('Error posting to Instagram:', error);
    throw error;
  }
}

// Create a single post
async function createAIPost(topic, category = 'general') {
  try {
    console.log(`Creating AI post about: ${topic}`);
    
    // Determine category based on topic keywords
    let postCategory = category;
    if (category === 'general') {
      if (topic.toLowerCase().includes('ai') || topic.toLowerCase().includes('robot') || topic.toLowerCase().includes('virtual')) {
        postCategory = 'AI trends';
      } else if (topic.toLowerCase().includes('fashion') || topic.toLowerCase().includes('model') || topic.toLowerCase().includes('style')) {
        postCategory = 'fashion';
      } else if (topic.toLowerCase().includes('tech') || topic.toLowerCase().includes('digital') || topic.toLowerCase().includes('innovation')) {
        postCategory = 'tech';
      }
    }
    
    // Authenticate
    const ig = await login();
    
    // Generate content
    console.log('Generating content with Gemini AI...');
    const postContent = await generatePostContent(topic, postCategory);
    console.log('Generated caption:', postContent);
    
    // Get and process image
    console.log('Fetching image from Unsplash...');
    const { imageBuffer, photographer, photographerUrl } = await getAndProcessImage(topic);
    console.log('Image processed successfully');
    
    // Post to Instagram
    console.log('Posting to Instagram...');
    const result = await postToInstagram(ig, postContent, imageBuffer, photographer, photographerUrl);
    
    console.log('Post created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

// Generate and post multiple images
async function generateAndPostMultipleImages() {
  try {
    console.log('Starting multiple image generation and posting...');
    
    // Authenticate
    const ig = await login();
    
    // Process each theme
    for (const theme of THEMES) {
      console.log(`\nProcessing ${theme.category} theme...`);
      
      // Get 3 random topics from the theme
      const selectedTopics = theme.topics
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
      // Process each topic
      for (const topic of selectedTopics) {
        console.log(`\nProcessing topic: ${topic}`);
        
        // Generate content
        console.log('Generating content with Gemini AI...');
        const postContent = await generatePostContent(topic, theme.category);
        console.log('Generated caption:', postContent);
        
        // Get and process image
        console.log('Fetching image from Unsplash...');
        const { imageBuffer, photographer, photographerUrl } = await getAndProcessImage(topic);
        console.log('Image processed successfully');
        
        // Post to Instagram
        console.log('Posting to Instagram...');
        const result = await postToInstagram(ig, postContent, imageBuffer, photographer, photographerUrl);
        console.log('Post created successfully:', result);
        
        // Wait 5 minutes between posts to avoid rate limiting
        console.log('Waiting 5 minutes before next post...');
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
      }
    }
    
    console.log('\nAll posts completed successfully!');
  } catch (error) {
    console.error('Error in multiple image generation and posting:', error);
    throw error;
  }
}

// Export the functions
module.exports = {
  createAIPost,
  generateAndPostMultipleImages
};

// Run directly if called from command line
if (require.main === module) {
  // Wrap in async IIFE to use await at the top level
  (async () => {
    try {
      if (process.argv.includes('--multiple')) {
        await generateAndPostMultipleImages();
      } else if (process.argv.length > 2) {
        // Get topic from command line arguments
        const topic = process.argv.slice(2).join(' ');
        await createAIPost(topic);
      } else {
        console.log('Please provide a topic as a command line argument');
        console.log('Example: node index.js sustainable living');
        console.log('Or use --multiple flag to generate and post multiple images');
      }
    } catch (error) {
      console.error('Application error:', error);
    }
  })();
} 