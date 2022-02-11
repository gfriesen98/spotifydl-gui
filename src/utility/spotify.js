const { youtube } = require('scrape-youtube');
const { getPreview, getData, getTracks } = require('spotify-url-info');
const { youtube_queries } = require('../utility/constants');

/**
 * Searches youtube from spotify metadata
 * 
 * Returns the best result url
 * 
 * @param {string} url spotify track url
 * @param {QPlainTextEdit} output
 * @returns
 */
function singleTrackUrl(url, output) {

    return new Promise(function(resolve, reject){
        getPreview(url).then(data => {
            const yt_query = youtube_queries.track(data.artist, data.track);
            output.insertPlainText("[Youtube] Searching Youtube...\n");
            output.insertPlainText(`[Youtube] Using "${yt_query}" as search query\n`);
            youtube.search(yt_query).then(results => {
                console.log(results);
                let first_result = results.videos[0];
                console.log('best result', first_result);
            
                if (typeof(first_result) === 'undefined' || first_result == null || typeof(first_result) !== 'object'){
                    throw new Error('No results found...');
                }
                output.insertPlainText(`[Youtube] Found video:\n`);
                output.insertPlainText(`[Youtube] Title: ${first_result.title}\n`);
                output.insertPlainText(`[Youtube] Channel: ${first_result.channel.name}\n`);
                output.insertPlainText(`[Youtube] URL: ${first_result.link}\n\n`);
                resolve(first_result);
            }).catch(err => reject(err))
        }).catch(err => reject(err));
        // return first_result;
    });
}

module.exports = { singleTrackUrl };