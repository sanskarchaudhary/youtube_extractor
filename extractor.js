const axios = require('axios');
// Handle default export for nepali-date-converter
const NepaliDateLib = require('nepali-date-converter');
const NepaliDate = NepaliDateLib.default || NepaliDateLib;

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

const VIDEO_CATEGORY_MAP = {
    '1': 'Film & Animation',
    '2': 'Autos & Vehicles',
    '10': 'Music',
    '15': 'Pets & Animals',
    '17': 'Sports',
    '18': 'Short Movies',
    '19': 'Travel & Events',
    '20': 'Gaming',
    '21': 'Videoblogging',
    '22': 'People & Blogs',
    '23': 'Comedy',
    '24': 'Entertainment',
    '25': 'News & Politics',
    '26': 'Howto & Style',
    '27': 'Education',
    '28': 'Science & Technology',
    '29': 'Nonprofits & Activism',
    '30': 'Movies',
    '31': 'Anime/Animation',
    '32': 'Action/Adventure',
    '33': 'Classics',
    '34': 'Comedy',
    '35': 'Documentary',
    '36': 'Drama',
    '37': 'Family',
    '38': 'Foreign',
    '39': 'Horror',
    '40': 'Sci-Fi/Fantasy',
    '41': 'Thriller',
    '42': 'Shorts',
    '43': 'Shows',
    '44': 'Trailers'
};

// Map Wiki URLs to readable categories for Channels
const TOPIC_MAP = {
    'Music': 'Music',
    'Classical_music': 'Classical Music',
    'Pop_music': 'Pop Music',
    'Rock_music': 'Rock Music',
    'Hip_hop_music': 'Hip Hop',
    'Gaming': 'Gaming',
    'Video_game_culture': 'Gaming',
    'Action_game': 'Action Games',
    'Role-playing_video_game': 'RPG',
    'Strategy_video_game': 'Strategy Games',
    'Sports': 'Sports',
    'Association_football': 'Football',
    'Cricket': 'Cricket',
    'Basketball': 'Basketball',
    'Lifestyle_(sociology)': 'Lifestyle',
    'Fashion': 'Fashion',
    'Beauty': 'Beauty',
    'Makeup': 'Makeup',
    'Food': 'Food',
    'Technology': 'Technology',
    'Entertainment': 'Entertainment',
    'Film': 'Film',
    'Television_program': 'TV Shows',
    'Politics': 'Politics',
    'Society': 'Society',
    'Knowledge': 'Education'
};

function getChannelCategory(topicDetails) {
    if (!topicDetails || !topicDetails.topicCategories || topicDetails.topicCategories.length === 0) {
        return 'People & Blogs'; // Fallback
    }
    
    // Look for matches in the URL
    // URL format: https://en.wikipedia.org/wiki/Gaming
    const categories = topicDetails.topicCategories.map(url => {
        const topic = url.split('/wiki/')[1];
        return TOPIC_MAP[topic] || topic.replace(/_/g, ' ');
    });

    // Return the first valid one or formatted string
    return categories[0] || 'People & Blogs';
}

function convertToNepali(isoDate) {
    if (!isoDate) return 'N/A';
    
    try {
        const dateObj = new Date(isoDate);
        if (isNaN(dateObj.getTime())) {
            console.warn(`Invalid Date object from: ${isoDate}`);
            return 'Invalid Date';
        }
        
        // Attempt conversion
        try {
            const nepaliDate = new NepaliDate(dateObj);
            return nepaliDate.format('YYYY-MM-DD');
        } catch (libError) {
            console.warn("NepaliDate conversion failed:", libError.message);
            // Fallback to simple English date format if Nepali conversion fails
            return dateObj.toISOString().split('T')[0] + ' (AD)';
        }
    } catch (e) {
        console.error("General Date Error:", e);
        return 'Date Error';
    }
}

async function getChannelIdFromUrl(url) {
    // Clean URL
    url = url.split('?')[0];

    // 1. Check for standard channel ID (UC...)
    const idMatch = url.match(/channel\/(UC[\w-]+)/);
    if (idMatch) return { type: 'id', value: idMatch[1] };

    // 2. Check for Handle (@...)
    const handleMatch = url.match(/@([\w.-]+)/);
    if (handleMatch) return { type: 'forHandle', value: '@' + handleMatch[1] }; 

    // 3. User ID (Legacy)
    const userMatch = url.match(/user\/([\w-]+)/);
    if (userMatch) return { type: 'forUsername', value: userMatch[1] };

    // 4. Custom URL (c/...) - API doesn't support 'c' search directly well without search endpoint, 
    // but often handles work. If it's a vanity URL, we might need search.
    // For now assuming these 3 cover 99% cases.
    
    return null;
}

async function extractVideoData(url) {
    try {
        // Extract Video ID
        const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
        if (!videoIdMatch) throw new Error("Invalid Video URL");
        const videoId = videoIdMatch[1];

        // Call API
        const response = await axios.get(`${BASE_URL}/videos`, {
            params: {
                part: 'snippet,contentDetails,statistics,topicDetails',
                id: videoId,
                key: API_KEY
            }
        });

        const items = response.data.items;
        if (!items || items.length === 0) throw new Error("Video not found or API Error");
        
        const video = items[0];
        const snippet = video.snippet;
        const statistics = video.statistics;

        // Process Data
        const title = snippet.title;
        const description = snippet.description;
        const category = VIDEO_CATEGORY_MAP[snippet.categoryId] || `Category ${snippet.categoryId}`;
        const thumbnail = snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url;
        const hiddenTags = snippet.tags ? snippet.tags.join(', ') : '';
        const uploadDate = snippet.publishedAt;
        
        const nepaliDateBS = convertToNepali(uploadDate);

        const channelId = snippet.channelId;
        const channelUrl = `https://www.youtube.com/channel/${channelId}`;

        // Fetch associated channel data
        let channelData = {};
        if (channelId) {
            try {
                 channelData = await extractChannelData_Internal({ type: 'id', value: channelId }, channelUrl);
            } catch (err) {
                 console.error("Channel fetch failed", err);
                 channelData = { error: "Failed to fetch channel" };
            }
        }

        return {
            title,
            description,
            category,
            thumbnail,
            hiddenTags,
            uploadedNepaliTime: nepaliDateBS,
            videoUrl: url,
            channel: {
                url: channelUrl,
                ...channelData
            }
        };

    } catch (error) {
        console.error("Error extracting video data (API):", error.message);
        throw new Error("Failed to extract video data: " + error.message);
    }
}

async function extractChannelData(url) {
     const identifier = await getChannelIdFromUrl(url);
     if (!identifier) {
         throw new Error("Could not parse Channel ID or Handle from URL");
     }
     return await extractChannelData_Internal(identifier, url);
}

async function extractChannelData_Internal(identifier, originalUrl) {
    try {
        const params = {
            part: 'snippet,statistics,brandingSettings,topicDetails,contentDetails',
            key: API_KEY
        };

        if (identifier.type === 'id') {
            params.id = identifier.value;
        } else if (identifier.type === 'forHandle') {
            params.forHandle = identifier.value;
        } else if (identifier.type === 'forUsername') {
            params.forUsername = identifier.value;
        }

        const response = await axios.get(`${BASE_URL}/channels`, { params });
        
        const items = response.data.items;
        if (!items || items.length === 0) throw new Error("Channel not found");

        const channel = items[0];
        const snippet = channel.snippet;
        const stats = channel.statistics;
        const branding = channel.brandingSettings?.channel;
        const topicDetails = channel.topicDetails;
        const contentDetails = channel.contentDetails;

        const channelName = snippet.title;
        const subscriberCount = stats.subscriberCount || 'Hidden';
        const totalVideos = stats.videoCount || '0';
        const creationDate = snippet.publishedAt;

        // Keywords
        // API returns space-separated string, with quotes for multi-word tags e.g. 'foo bar "multi word"'
        let hiddenTags = '';
        if (branding?.keywords) {
            const rawKeywords = branding.keywords;
            // distinct regex to match quoted strings OR non-space sequences
            const matches = rawKeywords.match(/"[^"]+"|[^\s]+/g);
            if (matches) {
                hiddenTags = matches.map(t => t.replace(/"/g, '')).join(', ');
            } else {
                hiddenTags = rawKeywords;
            }
        } 

        // Derived Category
        const category = getChannelCategory(topicDetails);

        // Convert Date
        const nepaliDateBS = convertToNepali(creationDate);

        // Calculate "Recent Engagement" (Views on last 10 videos)
        let recentEngagement = 'N/A';
        try {
            const uploadsId = contentDetails?.relatedPlaylists?.uploads;
            if (uploadsId) {
                // 1. Get last 10 videos from uploads playlist
                const plResponse = await axios.get(`${BASE_URL}/playlistItems`, {
                    params: {
                        part: 'contentDetails',
                        playlistId: uploadsId,
                        maxResults: 10,
                        key: API_KEY
                    }
                });
                
                const videoIds = plResponse.data.items?.map(item => item.contentDetails.videoId);
                if (videoIds && videoIds.length > 0) {
                    // 2. Get statistics for these videos
                    const vidResponse = await axios.get(`${BASE_URL}/videos`, {
                        params: {
                            part: 'statistics',
                            id: videoIds.join(','),
                            key: API_KEY
                        }
                    });

                    // 3. Sum view counts
                    let totalRecentViews = 0;
                    vidResponse.data.items?.forEach(v => {
                        totalRecentViews += parseInt(v.statistics.viewCount || 0);
                    });
                    
                    recentEngagement = totalRecentViews.toLocaleString() + " (Last 10 Videos)";
                }
            }
        } catch (e) {
            console.error("Failed to calc engagement", e.message);
            recentEngagement = parseInt(stats.viewCount).toLocaleString() + " (Total)";
        }

        return {
            channelName,
            subscriberCount: parseInt(subscriberCount).toLocaleString(),
            totalVideos: parseInt(totalVideos).toLocaleString(),
            category: category,
            hiddenTags,
            creationDate: nepaliDateBS,
            lastWeekEngagement: recentEngagement
        };

    } catch (error) {
        console.error("Error extracting channel data (API):", error.message);
        throw new Error("Failed to extract channel data: " + error.message);
    }
}

module.exports = { extractVideoData, extractChannelData };
