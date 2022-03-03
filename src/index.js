require('dotenv').config()
const { access } = require('fs/promises');
const { mkdirSync, createWriteStream } = require('fs');
const path = require('path');
const { default: axios } = require('axios');

const {yt_dlp_binary, youtube_queries} = require('./utility/constants');
const rootStyleSheet = require('./styles/rootStyleSheet');
const spotify_prefixes = ['https://open.spotify.com/track', 'https://play.spotify.com/track', 'https://open.spotify.com/playlist', 'https://open.spotify.com/album'];
const { checkYtdlpVersion, yt_dlp } = require('./utility/ytdlp');
const { checkFfmpegExists, downloadWin32, downloadLinux, downloadMacos } = require('./utility/ffmpeg');
const { singleTrackUrl } = require('./utility/spotify');

const {
    FlexLayout,
    QLabel,
    QLineEdit,
    QPlainTextEdit,
    QMainWindow,
    QPushButton,
    QWidget,
    QScrollBar,
    QComboBox,
    QCheckBox,
    QFileDialog,
    FileMode,
} = require('@nodegui/nodegui');
const { youtube } = require('scrape-youtube');
const { getData, getTracks } = require('spotify-url-info');

let fileType = 'mp3';
let canDownload = false;

/**
 * Checks for ffmpeg and yt-dlp on startup
 * @param {QPlainTextEdit} output Output box
 * @returns {boolean}
 */
async function check_deps(output, button) {
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
    button.setEnabled(true);
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

    // Fieldset 2
    const fieldset2 = new QWidget();
    const fieldsetLayout2 = new FlexLayout();
    fieldset2.setObjectName('fieldset2');
    fieldset2.setLayout(fieldsetLayout2);

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
    downloadDirInput.setReadOnly(true);
    downloadDirRowLayout.addWidget(downloadDirInput);

    // Options row
    const optionsLayout = new QWidget();
    const optionsRowLayout = new FlexLayout();
    const optionsLabel = new QLabel();
    const filetypeCombobox = new QComboBox();
    optionsLabel.setObjectName('optionsLabel')
    optionsLayout.setObjectName('optionsLayout');
    optionsLayout.setLayout(optionsRowLayout);
    optionsLabel.setText('options: ');
    optionsRowLayout.addWidget(optionsLabel);
    
    filetypeCombobox.setObjectName('filetypeCombobox')
    filetypeCombobox.addItem(undefined, '-- filetype (default mp3) --');
    filetypeCombobox.addItem(undefined, 'mp3');
    filetypeCombobox.addItem(undefined, '"flac"');
    optionsRowLayout.addWidget(filetypeCombobox);

    const checkboxLayout = new QWidget();
    const checkboxRowLayout = new FlexLayout();
    const isYTCheck = new QCheckBox();
    isYTCheck.setObjectName('isytcheck');
    isYTCheck.setText('Youtube URL?');
    checkboxLayout.setLayout(checkboxRowLayout);
    checkboxRowLayout.addWidget(isYTCheck);


    // Output box
    const output = new QPlainTextEdit();
    const scrollbar = new QScrollBar();      // Define a new scrollbar to set autoscrolling
    output.setObjectName('output');
    output.setReadOnly(true);
    output.setWordWrapMode(0);

    scrollbar.setMaximum(scrollbar.value()); // not sure if needed tbh
    output.setVerticalScrollBar(scrollbar);  // apply new scrollbar to output box
    output.setVerticalScrollBarPolicy(0);    // policy 2: Always show scrollbar, 1: Show scrollbar when needed, 0: Hide scrollbar


    // Button row
    const buttonRow = new QWidget();
    const buttonRowLayout = new FlexLayout();
    buttonRow.setLayout(buttonRowLayout);
    buttonRow.setObjectName('buttonRow');

    // Buttons
    const downloadButton = new QPushButton();
    downloadButton.setText('Download');
    downloadButton.setEnabled(false);
    downloadButton.setObjectName('downloadButton');

    const directoryButton = new QPushButton();
    directoryButton.setText('select download location');
    directoryButton.setObjectName('directoryButton');

    // File dialog
    const fileDialog = new QFileDialog();
    fileDialog.setFileMode(FileMode.Directory);

    // Add the widgets to the respective layouts
    // fieldset
    fieldsetLayout.addWidget(urlLayout);
    fieldsetLayout.addWidget(directoryButton);
    fieldsetLayout.addWidget(downloadDirLayout);

    // fieldset2
    fieldsetLayout2.addWidget(optionsLayout);
    // fieldsetLayout2.addWidget(checkboxLayout);

    // buttonrow view
    buttonRowLayout.addWidget(downloadButton);

    // rootview
    rootViewLayout.addWidget(fieldset);
    rootViewLayout.addWidget(fieldset2);
    rootViewLayout.addWidget(output);
    rootViewLayout.addWidget(buttonRow);

    // Event handling

    // scroll ouput terminal automatically
    output.addEventListener('textChanged', () => {
        scrollbar.setSliderPosition(scrollbar.maximum()); // set scroll position to the maximum (down)
    });

    /**
     * @todo i really gotta learn how to make use of the ui lol
     * change file extension
     */
    filetypeCombobox.addEventListener('currentIndexChanged', d => {
        if (d === 0) fileType = 'mp3';
        if (d === 1) fileType = 'mp3';
        if (d === 2) fileType = 'flac';
    });

    // show file picker dialog
    directoryButton.addEventListener('clicked', async () => {
        fileDialog.exec();
        const selectedDir = fileDialog.selectedFiles()[0];
        console.log(selectedDir);
        downloadDirInput.setText(selectedDir);
    });
 
    // run download on button click
    downloadButton.addEventListener('clicked', async () => {
        let input = urlInput.text();
        let download_dir = downloadDirInput.text() === '' ? './downloads' : downloadDirInput.text();
        
        output.setPlainText('');
        try {
            if (typeof (input) === 'undefined' || input === null) throw new Error('Please provide an input!');
            
            if (input.startsWith(spotify_prefixes[0]) || input.startsWith(spotify_prefixes[1])) {
                output.insertPlainText("[Spotify] Gathering info from Spotify...\n");
                const youtube_result = await singleTrackUrl(input, output);
                const dir = `${download_dir}/${youtube_result.artist}/${youtube_result.album_name}`;
                await yt_dlp.downloadMp3(youtube_result.first_result.link, dir, `${youtube_result.track_number} - ${youtube_result.track}.%(ext)s`, output, { fileType });

            } else if (input.startsWith(spotify_prefixes[3])) {
                output.insertPlainText("[Spotify] Gathering info from Spotify...\n");
                const data = await getData(input);
                const album_name = data.name;
                const artist = data.artists[0].name;
                const dir = `${download_dir}/${artist}/${album_name}`;
                for await (const n of data.tracks.items) {
                    const track = n.name;
                    // const yt_query = youtube_queries.track(artist, track, album_name);
                    const yt_query = `${artist} topic ${track}`;
                    const results = await youtube.search(yt_query);
                    let first_result = results.videos[0];
                    output.insertPlainText(`[Youtube] Found video for ${track}:\n`);
                    output.insertPlainText(`[Youtube] URL: ${first_result.link}\n`);
                    await yt_dlp.downloadMp3(first_result.link, dir, `${n.track_number} - ${track}.%(ext)s`, output, { fileType });
                }
                output.insertPlainText(`\nFinished! Downloads can be found in ${path.resolve(dir)}\n`);

            } else if (input.startsWith(spotify_prefixes[2])) {
                output.insertPlainText("[Spotify] Playlists are limited to 100 tracks\n");
                output.insertPlainText("[Spotify] Gathering info from Spotify...\n");
                const data = await getTracks(input);
                let temp = "";
                for await (const n of data) {
                    const artist = n.artists[0].name;
                    const album_name = n.album.name;
                    const track = n.name;
                    const dir = `${download_dir}/${artist}/${album_name}`;
                    // const yt_query = youtube_queries.track(artist, track, album_name);
                    const yt_query = `${artist} topic ${track}`;
                    const results = await youtube.search(yt_query);
                    let first_result = results.videos[0];
                    output.insertPlainText(`[Youtube] Found video for ${track}:\n[Youtube] URL: ${first_result.link}\n`);
                    await yt_dlp.downloadMp3(first_result.link, dir, `${n.track_number} - ${track}.%(ext)s`, output, { fileType });
                    temp = dir;
                }
                output.insertPlainText(`\nFinished! Downloads can be found in ${path.resolve(temp)}\n`);

            } // youtube stuff here
             else {
                throw new Error('Invalid URL provided');
            }
        } catch (err) {
            console.error(err);
            console.log(err.message);
            output.insertPlainText("\n" + err.message + "\n");
        }
    });

    // Apply styling
    rootView.setStyleSheet(rootStyleSheet);

    win.setCentralWidget(rootView);
    win.show();

    // check for dependencies
    check_deps(output, downloadButton);
    global.win = win;
}

main().catch(console.error);