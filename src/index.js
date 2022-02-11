require('dotenv').config()
const youtube = require('scrape-youtube');
const { getPreview, getTracks, getData } = require('spotify-url-info');

const path = require('path');
const { spawn } = require('child_process');
const { access, rename, rm, writeFile, unlink } = require('fs/promises');
const { mkdirSync, createWriteStream } = require('fs');
const { default: axios } = require('axios');
const extract = require('extract-zip');

const {yt_dlp_binary} = require('./utility/binaryName');
const rootStyleSheet = require('./styles/rootStyleSheet');
const spotify_prefixes = ['https://open.spotify.com/track', 'https://play.spotify.com/track', 'https://open.spotify.com/playlist', 'https://open.spotify.com/album'];
const {checkYtdlpVersion} = require('./utility/ytdlp');
const { checkFfmpegExists, downloadWin32, downloadLinux, downloadMacos } = require('./utility/ffmpeg');

const {
    FlexLayout,
    QLabel,
    QLineEdit,
    QPlainTextEdit,
    QMainWindow,
    QPushButton,
    QWidget,
    QScrollBar,
} = require('@nodegui/nodegui');

/**
 * Checks for ffmpeg and yt-dlp on startup
 * @param {QPlainTextEdit} output Output box
 * @returns {boolean}
 */
async function check_deps(output) {
    let errors = {
        filesystem: false,
        ytdl_download: false,
        ffmpeg_download: false,
        network_error: false
    };

    output.insertPlainText('[setup]: Wait for "Ready!" before using!\n\n');
    output.insertPlainText('[setup]: Checking for dependencies...\n');

    // check for binaries folder
    try {
        await access('./binaries');
    } catch (err) {
        console.log('binaries path does not exist');
        try {
            mkdirSync('./binaries');
        } catch (err) {
            console.error(err);
            output.insertPlainText('\n[ERROR]: Could not create binaries folder: ' + err.message + "\n");
            errors.filesystem = true;
        }
    }

    // Get yt-dlp latest version and check if we need to download an update
    const { has_ytdlp, latest_ytdlp_version } = await checkYtdlpVersion(output);

    // Check if we need to download yt-dlp
    if (!has_ytdlp) {
        try {
            output.insertPlainText('[setup]: Downloading yt-dlp...\n');
            const url = `https://github.com/yt-dlp/yt-dlp/releases/download/${latest_ytdlp_version}/${yt_dlp_binary}`;
            const res = await axios.get(url, { responseType: 'stream' });
            const dest = createWriteStream('./binaries/' + yt_dlp_binary); // ,{ mode: 0o755 }
            await res.data.pipe(dest);
        } catch (err) {
            console.log(err);
            output.insertPlainText('[ERROR]: There was an issue dealing with yt-dlp:\n' + err.message + '\n\n...Will try to continue\n\n');
            errors.ytdl_download = true;
        }
        output.insertPlainText('[setup]: Finished downloading yt-dlp\n');
    }

    // check if ffmpeg exists
    const has_ffmpeg = await checkFfmpegExists(output);

    if (!has_ffmpeg) {
        try {
            output.insertPlainText('[setup]: Downloading ffmpeg...\n');

            if (process.platform === 'win32') {
                await downloadWin32(output);
            } else if (process.platform === 'linux') {
                await downloadLinux(output)
            } else if (process.platform === 'darwin') {
                await downloadMacos(output);
            }

        } catch (err) {
            console.log(err);
            output.insertPlainText('[ERROR]: There was an issue dealing with ffmpg:\n' + err.message + "\n\nWill try to continue\n\n");
            errors.ffmpeg_download = true;
        }
    }
    output.insertPlainText('Ready!');
}

async function main() {
    const win = new QMainWindow();
    win.setWindowTitle('spotifydl-gui');
    win.setFixedSize(800, 600);

    // Root view
    const rootView = new QWidget();
    const rootViewLayout = new FlexLayout();
    rootView.setObjectName('rootView');
    rootView.setLayout(rootViewLayout);

    // Fieldset
    const fieldset = new QWidget();
    const fieldsetLayout = new FlexLayout();
    fieldset.setObjectName('fieldset');
    fieldset.setLayout(fieldsetLayout);

    // URL row
    const urlLayout = new QWidget();
    const urlRowLayout = new FlexLayout();
    const urlLabel = new QLabel();
    const urlInput = new QLineEdit();
    urlLayout.setObjectName('numCharsRow');
    urlLayout.setLayout(urlRowLayout);

    urlLabel.setText('url: ');
    urlRowLayout.addWidget(urlLabel);

    urlInput.setObjectName('numCharsInput');
    urlRowLayout.addWidget(urlInput);

    // Download dir row
    const downloadDirLayout = new QWidget();
    const downloadDirRowLayout = new FlexLayout();
    const downloadDirLabel = new QLabel();
    const downloadDirInput = new QLineEdit();
    downloadDirLayout.setObjectName('downloadDirLayout');
    downloadDirLayout.setLayout(downloadDirRowLayout);

    downloadDirLabel.setText('download location: ');
    downloadDirRowLayout.addWidget(downloadDirLabel);

    downloadDirInput.setObjectName('downloadDirInput');
    downloadDirRowLayout.addWidget(downloadDirInput);


    // Output box
    const output = new QPlainTextEdit();
    const scrollbar = new QScrollBar();      // Define a new scrollbar to set autoscrolling
    output.setObjectName('output');
    output.setReadOnly(true);
    output.setWordWrapMode(3);

    scrollbar.setMaximum(scrollbar.value()); // not sure if needed tbh
    output.setVerticalScrollBar(scrollbar);  // apply new scrollbar to output box
    output.setVerticalScrollBarPolicy(2);    // policy 2: Always show scrollbar, 1: Show scrollbar when needed, 0: Hide scrollbar


    // Button row
    const buttonRow = new QWidget();
    const buttonRowLayout = new FlexLayout();
    buttonRow.setLayout(buttonRowLayout);
    buttonRow.setObjectName('buttonRow');

    // Buttons
    const downloadButton = new QPushButton();
    downloadButton.setText('Download');
    downloadButton.setObjectName('downloadButton');

    // Add the widgets to the respective layouts
    // fieldset
    fieldsetLayout.addWidget(urlLayout);
    fieldsetLayout.addWidget(downloadDirLayout);

    // buttonrow view
    buttonRowLayout.addWidget(downloadButton);

    // rootview
    rootViewLayout.addWidget(fieldset);
    rootViewLayout.addWidget(output);
    rootViewLayout.addWidget(buttonRow);

    // Event handling

    // scroll ouput terminal automatically
    output.addEventListener('textChanged', () => {
        scrollbar.setSliderPosition(scrollbar.maximum()); // set scroll position to the maximum (down)
    });

    // run download on button click
    downloadButton.addEventListener('clicked', async () => {
        let input = urlInput.text();
        const download_dir = downloadDirInput.text() === '' ? './dl' : downloadDirInput.text();
        
        output.setPlainText('');
        try {
            if (typeof (input) === 'undefined' || input === null) throw new Error('Please provide an input!');
            
            if (input.startsWith(spotify_prefixes[0]) || input.startsWith(spotify_prefixes[1])) {
                output.insertPlainText("[Spotify] Gathering info from Spotify...\n");
                const data = await getPreview(input);
                const yt_query = `${data.artist} topic - ${data.title} official audio`;

                output.insertPlainText("[Youtube] Searching Youtube...\n");
                output.insertPlainText(`[Youtube] Using "${yt_query}" as search query\n`);

                let youtube_data = await youtube.search(yt_query);
                let youtube_data_filtered = youtube_data.videos.filter(n => {
                    // If the video description includes 'Provded to YouTube' it should be an official upload
                    if (n.description.includes('Provided to YouTube')) {
                        return true;
                    } else {
                        return false;
                    }
                });

                // Replace original query [0] index with the [0] index of the filtered query if applicable
                if (youtube_data_filtered.length > 0) youtube_data.videos[0] = youtube_data_filtered[0];
                if (youtube_data.videos.length === 0) throw new Error('No results found...');

                console.log("before filter", youtube_data);
                console.log("after filter", youtube_data_filtered);

                const youtube_input = youtube_data.videos[0].link;
                const youtube_name = youtube_data.videos[0].title;

                output.insertPlainText(`[Youtube] Found video:\n`);
                output.insertPlainText(`[Youtube] Title: ${youtube_name}\n`);
                output.insertPlainText(`[Youtube] URL: ${youtube_input}\n\n`);

                const options = ["-v", '-P', download_dir, "--ignore-errors", "--format", "bestaudio", "--extract-audio", "--audio-format", "mp3", "--audio-quality", "160K", "--output", `%(title)s.%(ext)s"`, youtube_input];

                const dl = spawn("./binaries/" + yt_dlp_binary, options);
                output.insertPlainText(`[yt-dlp PID=${dl.pid}] Executing yt-dlp\n[yt-dlp] Options: ${options.join(" ")}\n\n`);

                dl.stdout.on('data', data => {
                    let text = data.toString().trim();
                    if (text !== '' || text !== null) output.insertPlainText(text + "\n");
                });

                dl.stderr.on("data", data => {
                    console.warn("[yt-dlp STDERR]:\t"+data.toString())
                });

                dl.on('error', (e) => {
                    console.error(e);
                })

                dl.on("close", code => {
                    console.log('finished');
                    output.insertPlainText("\n\nFinished with exit code " + code+"\n");
                    output.insertPlainText("Saved to "+path.resolve(download_dir+"/"+youtube_data.videos[0].title+".mp3")+"\n");
                    output.insertPlainText("");
                });
            } else if (spotify_prefixes[3]) {
                output.insertPlainText("[Spotify] Gathering info from Spotify...\n");

            } else {
                throw new Error('Invalid URL provided');
            }
        } catch (err) {
            console.log(err.message);
            output.insertPlainText("\n" + err.message + "\n");
        }
    });

    // Apply styling
    rootView.setStyleSheet(rootStyleSheet);

    win.setCentralWidget(rootView);
    win.show();

    // check for dependencies
    check_deps(output);
    global.win = win;
}

main().catch(console.error);