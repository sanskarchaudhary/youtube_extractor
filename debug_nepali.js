const NepaliDate = require('nepali-date-converter');

console.log('--- DEBUG START ---');
console.log('Type:', typeof NepaliDate);
console.log('Value:', NepaliDate);
console.log('Is Constructor?', typeof NepaliDate === 'function' && !!NepaliDate.prototype && !!NepaliDate.prototype.constructor.name);

if (typeof NepaliDate === 'object') {
    console.log('Keys:', Object.keys(NepaliDate));
    if (NepaliDate.default) {
        console.log('Found .default export');
        console.log('Default Type:', typeof NepaliDate.default);
    }
}
console.log('--- DEBUG END ---');
