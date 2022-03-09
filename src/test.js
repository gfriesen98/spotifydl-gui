const { getData, getTracks, getPreview } = require('spotify-url-info');


async function test() {
    const data = await getTracks('https://open.spotify.com/playlist/6XtNgjOqX4y7stslSKri9K?si=6dd00483c8dc41ad');
    console.log(data);
}

test();