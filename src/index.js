require('dotenv').config()
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
const youtube = require('scrape-youtube');
const { getPreview, getTracks, getData } = require('spotify-url-info');
const { spawn } = require('child_process');
const { access, rename, rm, writeFile, unlink } = require('fs/promises');
const { mkdirSync, createWriteStream } = require('fs');
const extract = require('extract-zip');
const { default: axios } = require('axios');
const path = require('path');
const spotify_prefixes = ['https://open.spotify.com/track', 'https://play.spotify.com/track', 'https://open.spotify.com/playlist', 'https://open.spotify.com/album'];

/**
 * Gets the correct binary name to download yt-dlp
 * @returns Binary name
 */
function getBinaryName() {
    if (process.env.ENVIRONMENT === 'development') {
        return 'yt-dlp_min.exe';
    } else {
        return process.platform === 'win32' ? 'yt-dlp_min.exe' : 'yt-dlp';
    }
}

/**
 * Checks for ffmpeg and yt-dlp on startup
 * @param {QPlainTextEdit} output Output box
 * @returns {boolean}
 */
async function check_deps_win(output) {
    // check for yt-dlp
    output.insertPlainText('Wait for "Ready!" before using!\n\n');
    output.insertPlainText('Checking for dependencies...\n');
    let has_ytdlp = false;
    let has_path = false;
    try {
        await access('./binaries');
        has_path = true;
    } catch (err) {
        console.log('binaries path does not exist');
    }

    if (!has_path) {
        try {
            mkdirSync('./binaries');
        } catch (err) {
            console.error(err);
            return false;
        }
    }
    try {
        await access('./binaries/yt-dlp_min.exe');
        console.log('has yt-dlp');
        output.insertPlainText('Has yt-dlp\n');
        has_ytdlp = true;
    } catch (err) {
        console.log('does not have yt-dlp');
        output.insertPlainText('Does not have yt-dlp\n');
    }

    // check for ffmpeg
    let has_ffmpeg = false;
    try {
        await access('./binaries/ffmpeg.exe');
        has_ffmpeg = true;
        console.log('has ffmpeg');
        output.insertPlainText('Has ffmpeg\n');
    } catch (err) {
        console.log('does not have ffmpeg');
        output.insertPlainText('Does not have ffmpeg\n');
    }

    if (!has_ytdlp) {
        let latest_releases = null;
        try {
            latest_releases = await axios.get('https://api.github.com/repos/yt-dlp/yt-dlp/releases');
        } catch (err) {
            console.log('network error, could not reach https://api.github.com/repos/yt-dlp/yt-dlp/releases');
            return false;
        }
        const latest_tag = latest_releases.data[0].tag_name;
        const binary = getBinaryName();

        try {
            output.insertPlainText('Downloading yt-dlp\n');
            const res = await axios.get('https://github.com/yt-dlp/yt-dlp/releases/download/' + latest_tag + '/' + binary, { responseType: 'stream' });
            const dest = createWriteStream('./binaries/' + binary, { mode: 0o755 });
            await res.data.pipe(dest);
        } catch (err) {
            console.log(err);
            return false;
        }
        output.insertPlainText('Downloaded yt-dlp\n');
    }

    if (!has_ffmpeg) {
        try {
            output.insertPlainText('Downloading ffmpeg\n');
            const res = await axios.get('https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip', {responseType: 'arraybuffer'});
            // const dest = createWriteStream('./binaries/ffmpeg.zip', { mode: 0o755 });
            await writeFile(path.resolve('./binaries/ffmpeg.zip'), res.data, { encoding: 'binary'});

            output.insertPlainText('Extracting ffmpeg\n');
            await extract('./binaries/ffmpeg.zip', {dir: path.resolve('./binaries/')});

            output.insertPlainText('Cleaning up...\n');
            await rename('./binaries/ffmpeg-5.0-essentials_build/bin/ffmpeg.exe', './binaries/ffmpeg.exe');
            await rename('./binaries/ffmpeg-5.0-essentials_build/bin/ffprobe.exe', './binaries/ffprobe.exe');
            await rm('./binaries/ffmpeg-5.0-essentials_build', {recursive: true, force: true});
            console.log(await unlink('./binaries/ffmpeg.zip'));
        } catch (err) {
            console.log(err);
            return false;
        }
    }

    output.insertPlainText('Ready!');
    return true;

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

    // Number characters row
    const urlLayout = new QWidget();
    const urlRowLayout = new FlexLayout();
    const urlLabel = new QLabel();
    const urlInput = new QLineEdit();
    urlLayout.setObjectName('numCharsRow');
    urlLayout.setLayout(urlRowLayout);
    urlLabel.setText('spotify url: ');
    urlRowLayout.addWidget(urlLabel);
    urlInput.setObjectName('numCharsInput');
    urlRowLayout.addWidget(urlInput);


    const downloadDirLayout = new QWidget();
    const downloadDirRowLayout = new FlexLayout();
    const downloadDirLabel = new QLabel();
    const downloadDirInput = new QLineEdit();
    downloadDirLayout.setObjectName('downloadDirLayout');
    downloadDirLayout.setLayout(downloadDirRowLayout);
    downloadDirLabel.setText('download location: ');
    downloadDirRowLayout.addWidget(downloadDirLabel)
    downloadDirInput.setObjectName('downloadDirInput');
    downloadDirRowLayout.addWidget(downloadDirInput);


    // Generated password output
    const output = new QPlainTextEdit();
    const scrollbar = new QScrollBar();
    scrollbar.setMaximum(scrollbar.value());
    output.setVerticalScrollBar(scrollbar);
    output.setVerticalScrollBarPolicy(2);
    output.setObjectName('output');
    output.setReadOnly(true);
    output.setWordWrapMode(3);

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
    fieldsetLayout.addWidget(urlLayout);
    fieldsetLayout.addWidget(downloadDirLayout);
    rootViewLayout.addWidget(fieldset);
    rootViewLayout.addWidget(output);
    buttonRowLayout.addWidget(downloadButton);
    rootViewLayout.addWidget(buttonRow);

    // Event handling

    // scroll ouput terminal automatically
    output.addEventListener('textChanged', () => {
        scrollbar.setSliderPosition(scrollbar.maximum());
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

                output.insertPlainText("[Youtube] Searching Youtube...\n");
                output.insertPlainText(`[Youtube] Using "${data.artist} - ${data.title}" as search query\n`);

                const youtube_data = await youtube.search(`${data.artist} - ${data.title} Audio`);
                if (youtube_data.videos.length === 0) throw new Error('No results found...');
                console.log(youtube_data);

                const youtube_input = youtube_data.videos[0].link;
                const youtube_name = youtube_data.videos[0].title;
                console.log(youtube_input.toString());
                output.insertPlainText(`[Youtube] Found video:\n`);
                output.insertPlainText(`[Youtube] Title: ${youtube_name}\n`);
                output.insertPlainText(`[Youtube] URL: ${youtube_input}\n\n`);

                const options = ["-v", '-P', download_dir, "--ignore-errors", "--format", "bestaudio", "--extract-audio", "--audio-format", "mp3", "--audio-quality", "160K", "--output", `%(title)s.%(ext)s"`, youtube_input];

                const dl = spawn("./binaries/yt-dlp_min.exe", options);
                output.insertPlainText(`[yt-dlp PID=${dl.pid}] Executing yt-dlp\n[yt-dlp] Options: ${options.join(" ")}\n\n`);

                dl.stdout.on('data', data => {
                    let text = data.toString().trim();
                    if (text !== '' || text !== null) output.insertPlainText(text + "\n");
                });

                dl.stderr.on("data", data => {
                    // console.log('std err');
                    // console.log(data.toString())
                });

                dl.on('error', (e) => {
                    // console.log('err');
                    // console.log(e);
                })

                dl.on("close", code => {
                    console.log('finished');
                    output.insertPlainText("\n\nFinished\n");
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



        // output.setPlainText(urlInput.text())
        //   const passwordLength = numCharsInput.text();
        //   const includeSpecialChars = checkbox.isChecked();
        //   const charSet = getCharSet(includeSpecialChars);

        //   passOutput.setPlainText(
        //     generatePassword(passwordLength, charSet)
        //   );
    });

    // Styling
    const rootStyleSheet = `
        #rootView {
            padding: 5px;
        }
        #fieldset {
            padding: 10px;
            border: 2px ridge #bdbdbd;
            margin-bottom: 4px;
        }
        #numCharsRow, #buttonRow, #downloadDirLayout {
            flex-direction: row;
        }
        #numCharsRow {
            margin-bottom: 5px;
        }
        #numCharsInput {
            width: "90%";
            margin-left: 2px;
        }
        #downloadDirInput {
            width: "84.4%";
            margin-left: 2px;
        }
        #output {
            height: "75%";
            margin-bottom: 4px;
        }
        #buttonRow{
            margin-bottom: 5px;
        }
        #downloadButton {
            width: "100%";
            height: 70px;
            margin-right: 3px;
        }
    `;

    rootView.setStyleSheet(rootStyleSheet);

    win.setCentralWidget(rootView);
    win.show();

    check_deps_win(output);
    global.win = win;
}

main().catch(console.error);
/**
 * windows yt-dlp
 * .\binaries\yt-dlp_min.exe -v --ignore-errors --format bestaudio --extract-audio --audio-format mp3 --audio-quality 160K --output "%(title)s.%(ext)s" --ffmpeg-location \binaries "https://www.youtube.com/watch?v=vZXGxCtXfp4"
 */