# Instagram AI Posting Agent

This is a Node.js application that automatically generates and posts content to Instagram using AI. It uses Google's Gemini AI for text generation and Imagen 3 for high-quality image generation.

## Preview

Here are some examples of posts created with this tool:

![Preview 1](./Preview1.png)
![Preview 2](./Preview2.png)

## Features

- AI-generated captions and hashtags using Gemini AI
- High-quality image generation using Google's Imagen 3
- Image processing to Instagram's recommended dimensions
- Scheduling functionality for automated posting
- Topic rotation from customizable list

## Prerequisites

- Node.js v14+ installed
- Instagram account
- Google Cloud Platform account with:
  - Gemini AI API key
  - Vertex AI API enabled
  - Imagen 3 API access
  - Project ID and location configured

## Setup

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with:

```
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
GOOGLE_CLOUD_LOCATION=your_google_cloud_location
```

4. Set up Google Cloud credentials:
   - Create a service account and download the JSON key file
   - Set the environment variable GOOGLE_APPLICATION_CREDENTIALS to point to your key file:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account-key.json"
   ```

## Usage

### Single Post

To create a single post about a specific topic:

```bash
node index.js "your topic here"
```

For example:

```bash
node index.js "sustainable living"
```

### Scheduled Posting

To start the scheduler:

```bash
node scheduler.js
```

This will set up a posting schedule (default: every 24 hours).

To immediately create a post and start the schedule:

```bash
node scheduler.js --post-now
```

### Customizing Topics

The scheduler rotates through a list of topics. The default topics are included, but you can customize them by creating a `topics.json` file:

```json
{
  "topics": [
    "topic 1",
    "topic 2",
    "topic 3",
    "..."
  ]
}
```

## Important Notes

- **Instagram API Usage**: This project uses the unofficial Instagram Private API. This may violate Instagram's terms of service. Use responsibly and at your own risk.
- **Rate Limiting**: To avoid account flagging, this tool is set to post once per day by default. Adjust with caution.
- **API Costs**: Imagen 3 is a paid service. Make sure to monitor your usage and costs in the Google Cloud Console.
- **Image Quality**: Imagen 3 provides high-quality, AI-generated images that are unique to your content.

## License

MIT 