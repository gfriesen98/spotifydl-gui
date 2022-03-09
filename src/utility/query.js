/**
 * Let the user input a custom youtube query based off yt-dlp output templates
 * Options:
 * - %(track)
 * - %(track_number)
 * - %(album)
 * - %(artist)
 * @param {object} spotifyData Spotify response object
 * @param {string} template Template string
 * @param {number} index current index (for albums with multiple tracks)
 */
module.exports = function query(spotifyData, index = 0, template = '') {
    if (typeof (spotifyData) === 'undefined') throw new Error('Spotify data required to search youtube');
    if (template == '') {
        let defaultQuery = '';
        if (spotifyData.type === 'track') {
            defaultQuery = `${spotifyData.artists[0].name} topic ${spotifyData.name}`
            return { query: defaultQuery, artist: spotifyData.artists[0].name, album: 'Singles', track: spotifyData.name, track_number: data.track_number };
        } else {
            defaultQuery = spotifyData.tracks.items[index].name === spotifyData.name
                ? `${spotifyData.artists[0].name} topic ${spotifyData.tracks.items[index].name}`
                : `${spotifyData.artists[0].name} topic ${spotifyData.name} ${spotifyData.tracks.items[index].name}`;

            return { query: defaultQuery, artist: spotifyData.artists[0].name, album: spotifyData.name, track: spotifyData.tracks.items[index].name, track_number: spotifyData.tracks.items[index].track_number };
        }
    }

    console.log(template);
    let data = spotifyData;
    let options = [
        {
            mask: '%(track)',
            value: data.type === 'album' ?
             data.tracks.items[index].name
                : data.name
        },
        { 
            mask: '%(track_number)',
            value: data.type === 'album' ? 
                data.tracks.items[index].track_number
                    : data.track_number
        },
        { mask: '%(album)', value: data.name ?? '' },
        { mask: '%(artist)', value: data.artists[0].name ?? '' }
    ];

    let queryString = template;

    for (const n of options) {
        if (template.includes(n.mask)) {
            queryString.replace(n.mask, n.value);
        }
    }

    return { query: queryString, artist: data.artists[0].name, album: data.name ?? 'Singles', track: data.tracks.items[index].name ?? data.name };
}