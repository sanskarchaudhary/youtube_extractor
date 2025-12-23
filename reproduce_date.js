const NepaliDate = require('nepali-date-converter');

const isoDate = "2023-10-27T10:00:00Z"; 
const dateObj = new Date(isoDate);

console.log("ISO Date:", isoDate);
console.log("Date Object:", dateObj.toString());

try {
    const nd = new NepaliDate(dateObj);
    console.log("Nepali Date (from Date obj):", nd.format('YYYY-MM-DD'));
} catch (e) {
    console.error("Error with Date obj:", e.message);
}

try {
    const nd = new NepaliDate(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    console.log("Nepali Date (from YMD):", nd.format('YYYY-MM-DD'));
} catch (e) {
    console.error("Error with YMD:", e.message);
}
