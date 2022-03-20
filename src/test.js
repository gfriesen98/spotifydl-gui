const { getData, getTracks, getPreview } = require('spotify-url-info');
const youtube = require('scrape-youtube');

// async function test() {
//     const data = await getData('https://open.spotify.com/playlist/7yfsboCjylKkDMbvBv1mCx?si=055b8e13636a4d88');
//     // const data = await getTracks('https://open.spotify.com/playlist/7yfsboCjylKkDMbvBv1mCx?si=055b8e13636a4d88');
    
//     console.log(JSON.stringify(data));
// }

async function test() {
    const results = await youtube.search('Deftones - topic Around the Fur single');
    let b1 = false;
    let res = null;
    if (!results.videos[0].title.includes('Around the Fur')) {
        console.log('first result != query');
        b1 = true;
    } else {
        console.log('First result is accurate enough');
        res = results.videos[0];
    }

    if (b1) { 
        for (let i = 0; i < results.videos.length; i++) {
            console.log('checking loop: '+results.videos[i].title + '\t' + results.videos[i].link);
            if (results.videos[i].title.includes('Around the Fur')) {
                console.log('found video');
                console.log(results.videos[i]);
                res = results.videos[i];
                break;
            }
        }
    }

    if (res = null) {
        console.log(results);
    } else {
        console.log(res);
    }
}

test();