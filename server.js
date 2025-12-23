const express = require('express');
require('dotenv').config();
const cors = require('cors');
const ExcelJS = require('exceljs');
const { extractVideoData, extractChannelData } = require('./extractor');

const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/video', async (req, res) => {
    try {
        const { url } = req.body;
        const data = await extractVideoData(url);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/channel', async (req, res) => {
    try {
        const { url } = req.body;
        const data = await extractChannelData(url);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/download-excel', async (req, res) => {
    try {
        const { type, data } = req.body;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');

        if (type === 'video') {
            worksheet.columns = [
                { header: 'Title', key: 'title', width: 30 },
                { header: 'Description', key: 'description', width: 50 },
                { header: 'Category', key: 'category', width: 15 },
                { header: 'Thumbnail URL', key: 'thumbnail', width: 30 },
                { header: 'Hidden Tags', key: 'hiddenTags', width: 30 },
                { header: 'Uploaded (BS)', key: 'uploadedNepaliTime', width: 25 },
                { header: 'Channel Name', key: 'channelName', width: 25 },
                { header: 'Channel Subs', key: 'channelSubs', width: 15 },
                { header: 'Channel Videos', key: 'channelTotalVideos', width: 15 },
                { header: 'Channel Category', key: 'channelCategory', width: 20 },
                { header: 'Channel Tags', key: 'channelTags', width: 30 },
                { header: 'Channel URL', key: 'channelUrl', width: 30 }
            ];

            // Flatten data for Excel
            const flatData = {
                ...data,
                channelName: data.channel?.channelName || 'N/A',
                channelSubs: data.channel?.subscriberCount || 'N/A',
                channelTotalVideos: data.channel?.totalVideos || 'N/A',
                channelCategory: data.channel?.category || 'N/A',
                channelTags: data.channel?.hiddenTags || 'N/A',
                channelUrl: data.channel?.url || 'N/A'
            };
            worksheet.addRow(flatData);
        } else if (type === 'channel') {
            worksheet.columns = [
                { header: 'Channel Name', key: 'channelName', width: 30 },
                { header: 'Subscribers', key: 'subscriberCount', width: 15 },
                { header: 'Total Videos', key: 'totalVideos', width: 15 },
                { header: 'Category', key: 'category', width: 15 },
                { header: 'Hidden Tags', key: 'hiddenTags', width: 30 },
                { header: 'Creation Date', key: 'creationDate', width: 20 },
                { header: 'Last Week Engagement', key: 'lastWeekEngagement', width: 30 },
            ];
            worksheet.addRow(data);
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${type}_data.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
