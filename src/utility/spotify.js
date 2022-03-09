const { youtube } = require('scrape-youtube');
const { getData } = require('spotify-url-info');
const { youtube_queries } = require('../utility/constants');

/**
 * Searches youtube from spotify metadata
 * Returns the best result url
 * @param {string} url spotify track url
 * @param {QPlainTextEdit} output
 * @returns
 */
function singleTrackUrl(url, output) {

    return new Promise(function (resolve, reject) {
        getData(url).then(data => {
            const album_name = data.album.name;
            const artist = data.artists[0].name;
            const track = data.name;
            const track_number = data.track_number;
            const yt_query = youtube_queries.track(artist, track, album_name);
            output.insertPlainText("[Youtube] Searching Youtube...\n");
            output.insertPlainText(`[Youtube] Using "${yt_query}" as search query\n`);
            youtube.search(yt_query).then(results => {
                let first_result = results.videos[0];

                if (typeof (first_result) === 'undefined' || first_result == null || typeof (first_result) !== 'object') {
                    // reject(new Error('No results found...'));
                    console.log('No video found :(');
                }
                output.insertPlainText(`[Youtube] Found video:\n`);
                output.insertPlainText(`[Youtube] Title: ${first_result.title}\n`);
                output.insertPlainText(`[Youtube] Channel: ${first_result.channel.name}\n`);
                output.insertPlainText(`[Youtube] URL: ${first_result.link}\n\n`);
                console.log(data);
                resolve({first_result, album_name, artist, track_number, track});
            }).catch(err => reject(err));
        }).catch(err => reject(err));
    });
}

module.exports = { singleTrackUrl };